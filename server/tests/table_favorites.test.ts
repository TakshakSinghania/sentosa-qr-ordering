import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { app } from '../src/index.js';
import { prisma } from '../src/utils/prisma.js';
import { config } from '../src/config/env.js';
import { signTableSession } from '../src/services/session.js';
import { getTableFavorites } from '../src/services/recommendations.js';

const request = supertest(app);

describe('Table Favorites ("Guests here often order...") Comprehensive Test Suite', () => {
  let restaurantAId: string;
  let restaurantASlug = 'demo-cafe';
  let restaurantBId: string;
  let restaurantBSlug = 'isolated-bistro-test';

  let table05: { id: string; tableNumber: string; token: string };
  let table12: { id: string; tableNumber: string; token: string };
  let tableB01: { id: string; tableNumber: string; token: string };

  let itemCappuccino: { id: string; name: string; price: number };
  let itemColdBrew: { id: string; name: string; price: number };
  let itemCroissant: { id: string; name: string; price: number };
  let itemTiramisu: { id: string; name: string; price: number };
  let itemSoldOut: { id: string; name: string; price: number };

  let managerToken: string;
  let staffToken: string;

  beforeAll(async () => {
    // 1. Fetch Restaurant A (Sentosa / demo-cafe)
    const restA = await prisma.restaurant.findUnique({
      where: { slug: restaurantASlug },
      include: {
        tables: true,
        menuItems: true,
        users: true,
      },
    });

    if (!restA) {
      throw new Error('Restaurant A (demo-cafe) not found');
    }
    restaurantAId = restA.id;

    // Table 05
    const foundTable05 = restA.tables.find((t) => t.tableNumber === '05');
    if (!foundTable05) throw new Error('Table 05 not found in demo-cafe');
    table05 = foundTable05;

    // Table 12 (Create if not exists)
    let foundTable12 = await prisma.table.findFirst({
      where: { restaurantId: restaurantAId, tableNumber: '12' },
    });
    if (!foundTable12) {
      foundTable12 = await prisma.table.create({
        data: {
          restaurantId: restaurantAId,
          tableNumber: '12',
          token: 'tbl_table_12_sec_test_token',
          capacity: 4,
          isActive: true,
        },
      });
    }
    table12 = foundTable12;

    // 2. Create Restaurant B for tenant isolation testing
    let restB = await prisma.restaurant.findUnique({
      where: { slug: restaurantBSlug },
      include: { tables: true },
    });
    if (!restB) {
      restB = await prisma.restaurant.create({
        data: {
          name: 'Isolated Bistro',
          slug: restaurantBSlug,
          currency: 'INR',
          currencySymbol: '₹',
          taxRate: 5.0,
          isOpen: true,
          tables: {
            create: [
              {
                tableNumber: '01',
                token: 'tbl_bistro_01_token',
                capacity: 2,
                isActive: true,
              },
            ],
          },
        },
        include: { tables: true },
      });
    }
    restaurantBId = restB.id;
    tableB01 = restB.tables[0];

    // 3. Find or create specific menu items in Restaurant A
    const items = restA.menuItems;
    itemCappuccino = items.find((i) => i.name.includes('Cappuccino')) || items[0];
    itemColdBrew = items.find((i) => i.name.includes('Cold Brew')) || items[1];
    itemCroissant = items.find((i) => i.name.includes('Croissant') || i.name.includes('Toast') || i.name.includes('Pancake')) || items[2];
    itemTiramisu = items.find((i) => i.name.includes('Tiramisu') || i.name.includes('Cake')) || items[3];

    // Create a temporary sold-out item for testing stock availability
    let soldOutCandidate = await prisma.menuItem.findFirst({
      where: { restaurantId: restaurantAId, name: 'Special Seasonal Geisha' },
    });
    if (!soldOutCandidate) {
      soldOutCandidate = await prisma.menuItem.create({
        data: {
          restaurantId: restaurantAId,
          categoryId: itemCappuccino.categoryId,
          name: 'Special Seasonal Geisha',
          description: 'Rare limited harvest coffee',
          price: 349,
          isVeg: true,
          isAvailable: false, // SOLD OUT
        },
      });
    } else {
      await prisma.menuItem.update({
        where: { id: soldOutCandidate.id },
        data: { isAvailable: false },
      });
    }
    itemSoldOut = soldOutCandidate;

    // Ensure test items are active
    await prisma.menuItem.update({ where: { id: itemCappuccino.id }, data: { isAvailable: true } });
    await prisma.menuItem.update({ where: { id: itemColdBrew.id }, data: { isAvailable: true } });
    await prisma.menuItem.update({ where: { id: itemCroissant.id }, data: { isAvailable: true } });
    await prisma.menuItem.update({ where: { id: itemTiramisu.id }, data: { isAvailable: true } });

    // Enable table favorites on restaurant
    await prisma.restaurant.update({
      where: { id: restaurantAId },
      data: { enableTableFavorites: true },
    });

    // 4. Setup Manager and Staff JWT tokens for RBAC tests
    const managerUser = restA.users.find((u) => u.role === 'MANAGER') || restA.users[0];
    managerToken = jwt.sign(
      {
        id: managerUser.id,
        restaurantId: restaurantAId,
        email: managerUser.email,
        name: managerUser.name,
        role: 'MANAGER',
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    const staffUser = restA.users.find((u) => u.role === 'STAFF');
    staffToken = jwt.sign(
      {
        id: staffUser ? staffUser.id : 'staff-test-user-id',
        restaurantId: restaurantAId,
        email: staffUser ? staffUser.email : 'staff@democafe.com',
        name: staffUser ? staffUser.name : 'Test Staff',
        role: 'STAFF',
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // 5. Clean up any existing test orders for Table 05, Table 12, and Restaurant B
    await prisma.order.deleteMany({
      where: {
        tableId: { in: [table05.id, table12.id, tableB01.id] },
        customerName: { startsWith: 'FavTest_' },
      },
    });
  });

  afterAll(async () => {
    // Clean up test orders
    await prisma.order.deleteMany({
      where: {
        customerName: { startsWith: 'FavTest_' },
      },
    });
    // Restore restaurant setting
    await prisma.restaurant.update({
      where: { id: restaurantAId },
      data: { enableTableFavorites: true },
    });
  });

  // Helper to create test orders with specific conditions
  async function createTestOrder(opts: {
    restaurantId: string;
    tableId: string;
    status: string;
    paymentStatus: string;
    items: Array<{ menuItemId: string; name: string; price: number; quantity: number }>;
    createdAt?: Date;
  }) {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const subtotal = opts.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const taxAmount = Number((subtotal * 0.05).toFixed(2));
    const totalAmount = subtotal + taxAmount;

    return prisma.order.create({
      data: {
        orderNumber: Math.floor(100000 + Math.random() * 900000),
        restaurantId: opts.restaurantId,
        tableId: opts.tableId,
        orderToken: `ord_trk_favtest_${randomSuffix}_${Date.now()}`,
        customerName: `FavTest_${randomSuffix}`,
        customerPhone: '+919999900000',
        subtotal,
        taxAmount,
        totalAmount,
        status: opts.status,
        paymentStatus: opts.paymentStatus,
        createdAt: opts.createdAt || new Date(),
        items: {
          create: opts.items.map((i) => ({
            menuItemId: i.menuItemId,
            nameSnapshot: i.name,
            priceSnapshot: i.price,
            quantity: i.quantity,
            itemTotal: i.price * i.quantity,
          })),
        },
      },
    });
  }

  // --------------------------------------------------------------------------
  // Test 12: Insufficient Data Threshold (< 10 Orders)
  // --------------------------------------------------------------------------
  it('12. Fewer than 10 qualifying completed orders results in no recommendations (naturally omitted)', async () => {
    // Clean all qualifying orders on table12
    await prisma.order.deleteMany({
      where: { tableId: table12.id },
    });

    // Create only 3 qualifying completed orders on table12
    for (let i = 0; i < 3; i++) {
      await createTestOrder({
        restaurantId: restaurantAId,
        tableId: table12.id,
        status: 'SERVED',
        paymentStatus: 'COMPLETED',
        items: [{ menuItemId: itemCappuccino.id, name: itemCappuccino.name, price: itemCappuccino.price, quantity: 1 }],
      });
    }

    const res = await request
      .get(`/api/menu/${restaurantASlug}/t/${table12.token}/favorites`)
      .expect(200);

    expect(res.body.enabled).toBe(true);
    expect(res.body.items).toEqual([]);
  });

  // --------------------------------------------------------------------------
  // Test 5, 6, 7, 8: What Counts as an Order
  // --------------------------------------------------------------------------
  it('5. Failed payment does not count towards popularity or threshold', async () => {
    await createTestOrder({
      restaurantId: restaurantAId,
      tableId: table12.id,
      status: 'CONFIRMED',
      paymentStatus: 'FAILED',
      items: [{ menuItemId: itemColdBrew.id, name: itemColdBrew.name, price: itemColdBrew.price, quantity: 10 }],
    });

    const result = await getTableFavorites(restaurantAId, table12.id, { minOrders: 1 });
    const coldBrewRec = result.items.find((i) => i.id === itemColdBrew.id);
    expect(coldBrewRec).toBeUndefined();
  });

  it('6. Cancelled order does not count towards popularity or threshold', async () => {
    await createTestOrder({
      restaurantId: restaurantAId,
      tableId: table12.id,
      status: 'CANCELLED',
      paymentStatus: 'COMPLETED',
      items: [{ menuItemId: itemColdBrew.id, name: itemColdBrew.name, price: itemColdBrew.price, quantity: 10 }],
    });

    const result = await getTableFavorites(restaurantAId, table12.id, { minOrders: 1 });
    const coldBrewRec = result.items.find((i) => i.id === itemColdBrew.id);
    expect(coldBrewRec).toBeUndefined();
  });

  it('7. Pending payment does not count towards popularity or threshold', async () => {
    await createTestOrder({
      restaurantId: restaurantAId,
      tableId: table12.id,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      items: [{ menuItemId: itemColdBrew.id, name: itemColdBrew.name, price: itemColdBrew.price, quantity: 10 }],
    });

    const result = await getTableFavorites(restaurantAId, table12.id, { minOrders: 1 });
    const coldBrewRec = result.items.find((i) => i.id === itemColdBrew.id);
    expect(coldBrewRec).toBeUndefined();
  });

  it('8. Completed/fulfilled order counts towards popularity', async () => {
    // Fulfilled statuses: CONFIRMED, PREPARING, READY, SERVED
    await createTestOrder({
      restaurantId: restaurantAId,
      tableId: table12.id,
      status: 'CONFIRMED',
      paymentStatus: 'COMPLETED',
      items: [{ menuItemId: itemTiramisu.id, name: itemTiramisu.name, price: itemTiramisu.price, quantity: 1 }],
    });

    const result = await getTableFavorites(restaurantAId, table12.id, { minOrders: 1 });
    const tiramisuRec = result.items.find((i) => i.id === itemTiramisu.id);
    expect(tiramisuRec).toBeDefined();
    expect(tiramisuRec?.name).toBe(itemTiramisu.name);
  });

  // --------------------------------------------------------------------------
  // Test 9: Quantity Must Be Counted Aggregately
  // --------------------------------------------------------------------------
  it('9. Quantity is counted correctly (3 x Cappuccino counts as 3)', async () => {
    // Clean table12 test data
    await prisma.order.deleteMany({ where: { tableId: table12.id } });

    // Order 1: 5 x Croissant
    await createTestOrder({
      restaurantId: restaurantAId,
      tableId: table12.id,
      status: 'SERVED',
      paymentStatus: 'COMPLETED',
      items: [{ menuItemId: itemCroissant.id, name: itemCroissant.name, price: itemCroissant.price, quantity: 5 }],
    });

    // Order 2: 1 x Cappuccino
    await createTestOrder({
      restaurantId: restaurantAId,
      tableId: table12.id,
      status: 'SERVED',
      paymentStatus: 'COMPLETED',
      items: [{ menuItemId: itemCappuccino.id, name: itemCappuccino.name, price: itemCappuccino.price, quantity: 1 }],
    });

    const result = await getTableFavorites(restaurantAId, table12.id, { minOrders: 2 });
    // Croissant has 5 quantity, Cappuccino has 1 quantity -> Croissant must rank #1
    expect(result.items.length).toBeGreaterThanOrEqual(2);
    expect(result.items[0].id).toBe(itemCroissant.id);
    expect(result.items[1].id).toBe(itemCappuccino.id);
  });

  // --------------------------------------------------------------------------
  // Test 10 & 11: 90-Day Rolling Historical Window
  // --------------------------------------------------------------------------
  it('10 & 11. Last-90-days filtering works; orders older than 90 days are excluded', async () => {
    await prisma.order.deleteMany({ where: { tableId: table12.id } });

    const now = Date.now();
    const eightyDaysAgo = new Date(now - 80 * 24 * 60 * 60 * 1000);
    const ninetyFiveDaysAgo = new Date(now - 95 * 24 * 60 * 60 * 1000);

    // Old order: 20 x Cold Brew (95 days ago -> EXCLUDED)
    await createTestOrder({
      restaurantId: restaurantAId,
      tableId: table12.id,
      status: 'SERVED',
      paymentStatus: 'COMPLETED',
      createdAt: ninetyFiveDaysAgo,
      items: [{ menuItemId: itemColdBrew.id, name: itemColdBrew.name, price: itemColdBrew.price, quantity: 20 }],
    });

    // Recent order: 2 x Cappuccino (80 days ago -> INCLUDED)
    await createTestOrder({
      restaurantId: restaurantAId,
      tableId: table12.id,
      status: 'SERVED',
      paymentStatus: 'COMPLETED',
      createdAt: eightyDaysAgo,
      items: [{ menuItemId: itemCappuccino.id, name: itemCappuccino.name, price: itemCappuccino.price, quantity: 2 }],
    });

    const result = await getTableFavorites(restaurantAId, table12.id, { minOrders: 1, daysWindow: 90 });
    // Cold brew should be excluded because it's older than 90 days
    const coldBrewRec = result.items.find((i) => i.id === itemColdBrew.id);
    expect(coldBrewRec).toBeUndefined();

    // Cappuccino should be included
    const cappuccinoRec = result.items.find((i) => i.id === itemCappuccino.id);
    expect(cappuccinoRec).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // Test 1 & 2: Table 05 vs Table 12 Data Isolation
  // --------------------------------------------------------------------------
  it('1 & 2. Table 05 returns Table 05 popular items, Table 12 returns Table 12 popular items', async () => {
    // Seed Table 05 with 10 qualifying orders dominated by Cappuccino and Croissant
    await prisma.order.deleteMany({ where: { tableId: table05.id, customerName: { startsWith: 'FavTest_' } } });
    for (let i = 0; i < 10; i++) {
      await createTestOrder({
        restaurantId: restaurantAId,
        tableId: table05.id,
        status: 'SERVED',
        paymentStatus: 'COMPLETED',
        items: [
          { menuItemId: itemCappuccino.id, name: itemCappuccino.name, price: itemCappuccino.price, quantity: 100 },
          { menuItemId: itemCroissant.id, name: itemCroissant.name, price: itemCroissant.price, quantity: 80 },
        ],
      });
    }

    // Seed Table 12 with 10 qualifying orders dominated by Cold Brew and Tiramisu
    await prisma.order.deleteMany({ where: { tableId: table12.id } });
    for (let i = 0; i < 10; i++) {
      await createTestOrder({
        restaurantId: restaurantAId,
        tableId: table12.id,
        status: 'SERVED',
        paymentStatus: 'COMPLETED',
        items: [
          { menuItemId: itemColdBrew.id, name: itemColdBrew.name, price: itemColdBrew.price, quantity: 4 },
          { menuItemId: itemTiramisu.id, name: itemTiramisu.name, price: itemTiramisu.price, quantity: 3 },
        ],
      });
    }

    // Query Table 05
    const res05 = await request
      .get(`/api/menu/${restaurantASlug}/t/${table05.token}/favorites`)
      .expect(200);

    expect(res05.body.items.length).toBeGreaterThanOrEqual(2);
    expect(res05.body.items[0].id).toBe(itemCappuccino.id);
    expect(res05.body.items[1].id).toBe(itemCroissant.id);

    // Query Table 12
    const res12 = await request
      .get(`/api/menu/${restaurantASlug}/t/${table12.token}/favorites`)
      .expect(200);

    expect(res12.body.items.length).toBeGreaterThanOrEqual(2);
    expect(res12.body.items[0].id).toBe(itemColdBrew.id);
    expect(res12.body.items[1].id).toBe(itemTiramisu.id);
  });

  // --------------------------------------------------------------------------
  // Test 3: Multi-Tenant Isolation
  // --------------------------------------------------------------------------
  it('3. Restaurant A cannot retrieve Restaurant B table data', async () => {
    // Attempt to access Restaurant B table token using Restaurant A slug
    await request
      .get(`/api/menu/${restaurantASlug}/t/${tableB01.token}/favorites`)
      .expect(404);

    // Attempt to access Restaurant A table token using Restaurant B slug
    await request
      .get(`/api/menu/${restaurantBSlug}/t/${table05.token}/favorites`)
      .expect(404);
  });

  // --------------------------------------------------------------------------
  // Test 4: Customer Cannot Spoof tableId
  // --------------------------------------------------------------------------
  it('4. Customer cannot spoof tableId via query parameters', async () => {
    // Generate valid session token for Table 05
    const sessionToken05 = signTableSession({
      restaurantId: restaurantAId,
      tableId: table05.id,
      tableToken: table05.token,
      tableNumber: table05.tableNumber,
    });

    // Client maliciously passes tableId of Table 12 in query while presenting Table 05 session
    const res = await request
      .get(`/api/customer/table-favorites?tableId=${table12.id}`)
      .set('x-table-session', sessionToken05)
      .expect(403);

    expect(res.body.error).toContain('mismatch');
  });

  // --------------------------------------------------------------------------
  // Test 13: Sold-Out Items are Excluded and Substituted
  // --------------------------------------------------------------------------
  it('13. Sold-out items are excluded and substituted with the next available popular item', async () => {
    // Table 12: Add 15 orders of itemSoldOut (#1 popular item)
    for (let i = 0; i < 5; i++) {
      await createTestOrder({
        restaurantId: restaurantAId,
        tableId: table12.id,
        status: 'SERVED',
        paymentStatus: 'COMPLETED',
        items: [
          { menuItemId: itemSoldOut.id, name: itemSoldOut.name, price: itemSoldOut.price, quantity: 10 },
        ],
      });
    }

    const result = await getTableFavorites(restaurantAId, table12.id, { minOrders: 10, limit: 3 });

    // itemSoldOut must NOT be present in recommendations
    const foundSoldOut = result.items.find((i) => i.id === itemSoldOut.id);
    expect(foundSoldOut).toBeUndefined();

    // The available items (Cold Brew, Tiramisu) must be recommended instead
    expect(result.items.some((i) => i.id === itemColdBrew.id)).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Test 14: Top 3 Recommendations Maximum
  // --------------------------------------------------------------------------
  it('14. Only top 3 available items are returned', async () => {
    const res = await request
      .get(`/api/menu/${restaurantASlug}/t/${table12.token}/favorites`)
      .expect(200);

    expect(res.body.items.length).toBeLessThanOrEqual(3);
  });

  // --------------------------------------------------------------------------
  // Test 15 & 16: Zero Customer PII and Zero Order IDs
  // --------------------------------------------------------------------------
  it('15 & 16. No customer PII or order IDs are returned in the response', async () => {
    const res = await request
      .get(`/api/menu/${restaurantASlug}/t/${table05.token}/favorites`)
      .expect(200);

    expect(res.body.items.length).toBeGreaterThan(0);

    for (const item of res.body.items) {
      // Must contain only menu item presentation fields
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('price');
      expect(typeof item.price).toBe('number');

      // MUST NOT contain customer PII
      expect(item).not.toHaveProperty('customerName');
      expect(item).not.toHaveProperty('customerPhone');
      expect(item).not.toHaveProperty('customerEmail');
      expect(item).not.toHaveProperty('customerId');

      // MUST NOT contain order or internal payment metadata
      expect(item).not.toHaveProperty('orderId');
      expect(item).not.toHaveProperty('orderNumber');
      expect(item).not.toHaveProperty('orderToken');
      expect(item).not.toHaveProperty('totalQuantity');
      expect(item).not.toHaveProperty('createdAt');
      expect(item).not.toHaveProperty('paymentStatus');
    }
  });

  // --------------------------------------------------------------------------
  // Test 17: Deterministic Tie Handling
  // --------------------------------------------------------------------------
  it('17. Deterministic tie-breaking produces identical ranking across repeated queries', async () => {
    const resA = await request
      .get(`/api/menu/${restaurantASlug}/t/${table05.token}/favorites`)
      .expect(200);

    const resB = await request
      .get(`/api/menu/${restaurantASlug}/t/${table05.token}/favorites`)
      .expect(200);

    const idsA = resA.body.items.map((i: any) => i.id);
    const idsB = resB.body.items.map((i: any) => i.id);

    expect(idsA).toEqual(idsB);
  });

  // --------------------------------------------------------------------------
  // Test 18: Existing Customer Menu Functionality Still Works
  // --------------------------------------------------------------------------
  it('18. Existing customer public menu loading is completely intact', async () => {
    const res = await request
      .get(`/api/menu/${restaurantASlug}/t/${table05.token}`)
      .expect(200);

    expect(res.body).toHaveProperty('restaurant');
    expect(res.body).toHaveProperty('table');
    expect(res.body).toHaveProperty('tableSessionToken');
    expect(res.body).toHaveProperty('categories');
    expect(Array.isArray(res.body.categories)).toBe(true);
    expect(res.body.categories.length).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // Test 19: Secure Table-Token Validation Still Works
  // --------------------------------------------------------------------------
  it('19. Existing secure table-token validation rejects invalid tokens', async () => {
    await request
      .get(`/api/menu/${restaurantASlug}/t/tbl_fake_malicious_token/favorites`)
      .expect(404);

    await request
      .get('/api/customer/table-favorites')
      .expect(400);

    await request
      .get('/api/customer/table-favorites')
      .set('x-table-session', 'invalid_jwt_signature_here')
      .expect(403);
  });

  // --------------------------------------------------------------------------
  // Test 20: Manager vs Staff RBAC on Table Favorites Setting
  // --------------------------------------------------------------------------
  it('20. Manager can toggle enableTableFavorites setting; Staff is rejected with 403 Forbidden', async () => {
    // 1. Staff attempt to update settings (Must fail with 403 Forbidden)
    await request
      .patch('/api/admin/settings')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ enableTableFavorites: false })
      .expect(403);

    // 2. Manager updates settings to DISABLED (Must succeed with 200 OK)
    const updateRes = await request
      .patch('/api/admin/settings')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ enableTableFavorites: false })
      .expect(200);

    expect(updateRes.body.enableTableFavorites).toBe(false);

    // 3. Verify public API respects the disabled setting
    const disabledRes = await request
      .get(`/api/menu/${restaurantASlug}/t/${table05.token}/favorites`)
      .expect(200);

    expect(disabledRes.body.enabled).toBe(false);
    expect(disabledRes.body.items).toEqual([]);

    // 4. Manager re-enables the setting
    const restoreRes = await request
      .patch('/api/admin/settings')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ enableTableFavorites: true })
      .expect(200);

    expect(restoreRes.body.enableTableFavorites).toBe(true);

    // 5. Verify public API delivers recommendations again
    const reenabledRes = await request
      .get(`/api/menu/${restaurantASlug}/t/${table05.token}/favorites`)
      .expect(200);

    expect(reenabledRes.body.enabled).toBe(true);
    expect(reenabledRes.body.items.length).toBeGreaterThan(0);
  });
});
