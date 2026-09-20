import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/utils/prisma.js';
import { calculateOrderPricing } from '../src/services/pricing.js';

describe('Authoritative Price Integrity Engine', () => {
  let testRestaurantId: string;
  let availableItemId: string;
  let soldOutItemId: string;

  beforeAll(async () => {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: 'demo-cafe' },
      include: {
        menuItems: { include: { customizationGroups: true } },
      },
    });

    if (!restaurant) {
      throw new Error('Demo cafe not found, ensure db is seeded');
    }

    testRestaurantId = restaurant.id;
    const available = restaurant.menuItems.find((i) => i.isAvailable && (!i.customizationGroups || i.customizationGroups.length === 0));
    let soldOut = restaurant.menuItems.find((i) => !i.isAvailable);

    if (!soldOut && restaurant.menuItems.length > 0) {
      const candidate = restaurant.menuItems[restaurant.menuItems.length - 1];
      soldOut = await prisma.menuItem.update({
        where: { id: candidate.id },
        data: { isAvailable: false },
      });
    }

    if (!available || !soldOut) {
      throw new Error('Seeded items missing');
    }

    availableItemId = available.id;
    soldOutItemId = soldOut.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('calculates accurate subtotals, GST taxes, and totals from database prices', async () => {
    const item = await prisma.menuItem.findUnique({ where: { id: availableItemId } });
    const quantity = 3;

    const result = await calculateOrderPricing(testRestaurantId, [
      { menuItemId: availableItemId, quantity },
    ]);

    const expectedSubtotal = Number((item!.price * quantity).toFixed(2));
    const expectedTax = Number(((expectedSubtotal * 5.0) / 100).toFixed(2));
    const expectedTotal = Number((expectedSubtotal + expectedTax).toFixed(2));

    expect(result.subtotal).toBe(expectedSubtotal);
    expect(result.taxRate).toBe(5.0);
    expect(result.taxAmount).toBe(expectedTax);
    expect(result.totalAmount).toBe(expectedTotal);
    expect(result.items[0].name).toBe(item!.name);
  });

  it('throws an error and rejects checkout if an item is sold out', async () => {
    await expect(
      calculateOrderPricing(testRestaurantId, [
        { menuItemId: soldOutItemId, quantity: 1 },
      ])
    ).rejects.toThrow('sold out');
  });

  it('rejects empty cart payloads', async () => {
    await expect(
      calculateOrderPricing(testRestaurantId, [])
    ).rejects.toThrow('Cart cannot be empty');
  });

  it('rejects invalid or non-existent menuItemIds', async () => {
    await expect(
      calculateOrderPricing(testRestaurantId, [
        { menuItemId: 'non_existent_item_id', quantity: 1 },
      ])
    ).rejects.toThrow('Menu item not found');
  });
});
