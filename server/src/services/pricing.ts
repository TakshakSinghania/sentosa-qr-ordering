import { prisma } from '../utils/prisma.js';

export interface CartItemInput {
  menuItemId: string;
  quantity: number;
  specialInstructions?: string;
  selectedOptionIds?: string[];
}

export interface CalculatedOptionSnapshot {
  groupName: string;
  optionName: string;
  priceAddition: number;
}

export interface CalculatedItem {
  menuItemId: string;
  name: string;
  basePrice: number;
  price: number; // Unit price including customizations
  quantity: number;
  itemTotal: number;
  specialInstructions?: string;
  customizations: CalculatedOptionSnapshot[];
}

export interface OrderPricingResult {
  items: CalculatedItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  serviceChargeRate: number;
  serviceCharge: number;
  totalAmount: number;
  currency: string;
}

/**
 * Validates cart items and customizations against the database and computes authoritative price totals.
 * Protects against client-side price tampering.
 */
export async function calculateOrderPricing(
  restaurantId: string,
  cartItems: CartItemInput[]
): Promise<OrderPricingResult> {
  if (!cartItems || cartItems.length === 0) {
    throw new Error('Cart cannot be empty');
  }

  // 1. Fetch Restaurant details for current tax and service charge rates
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
  });

  if (!restaurant) {
    throw new Error('Restaurant not found');
  }

  if (!restaurant.isOpen) {
    throw new Error('Restaurant is currently closed and not accepting orders');
  }

  // 2. Fetch all menu items referenced in the cart including their customization groups and options
  const itemIds = cartItems.map((i) => i.menuItemId);
  const dbItems = await prisma.menuItem.findMany({
    where: {
      id: { in: itemIds },
      restaurantId,
    },
    include: {
      customizationGroups: {
        include: {
          options: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  const dbItemMap = new Map<string, any>(dbItems.map((item: any) => [item.id, item]));

  const calculatedItems: CalculatedItem[] = [];
  let subtotal = 0;

  for (const cartItem of cartItems) {
    if (!cartItem.quantity || cartItem.quantity < 1) {
      throw new Error(`Invalid quantity for item ${cartItem.menuItemId}`);
    }

    const dbItem = dbItemMap.get(cartItem.menuItemId);
    if (!dbItem) {
      throw new Error(`Menu item not found or does not belong to this restaurant`);
    }

    if (!dbItem.isAvailable) {
      throw new Error(`"${dbItem.name}" is currently sold out`);
    }

    // 3. Process & Validate Customizations
    const selectedOptionIds = new Set(cartItem.selectedOptionIds || []);
    const optionSnapshots: CalculatedOptionSnapshot[] = [];
    let customizationsPriceTotal = 0;

    // Build map of all valid options belonging to this item
    const groupOptionMap = new Map<string, { group: any; option: any }>();
    for (const group of dbItem.customizationGroups) {
      for (const opt of group.options) {
        groupOptionMap.set(opt.id, { group, option: opt });
      }
    }

    // Validate that all submitted option IDs are valid for this item
    for (const optId of selectedOptionIds) {
      const match = groupOptionMap.get(optId);
      if (!match) {
        throw new Error(`Invalid customization option ID "${optId}" for "${dbItem.name}"`);
      }
      if (!match.option.isAvailable) {
        throw new Error(`Customization option "${match.option.name}" for "${dbItem.name}" is currently sold out`);
      }
    }

    // Validate group-level rules (required, minSelections, maxSelections)
    for (const group of dbItem.customizationGroups) {
      const selectedInGroup = group.options.filter((opt: any) => selectedOptionIds.has(opt.id));

      if (group.required && selectedInGroup.length === 0) {
        throw new Error(`Please select an option for "${group.name}" on "${dbItem.name}"`);
      }

      if (group.type === 'SINGLE' && selectedInGroup.length > 1) {
        throw new Error(`Only one option can be selected for "${group.name}" on "${dbItem.name}"`);
      }

      if (selectedInGroup.length < group.minSelections) {
        throw new Error(`Minimum ${group.minSelections} selection(s) required for "${group.name}" on "${dbItem.name}"`);
      }

      if (group.maxSelections > 0 && selectedInGroup.length > group.maxSelections) {
        throw new Error(`Maximum ${group.maxSelections} selection(s) allowed for "${group.name}" on "${dbItem.name}"`);
      }

      for (const selectedOpt of selectedInGroup) {
        optionSnapshots.push({
          groupName: group.name,
          optionName: selectedOpt.name,
          priceAddition: selectedOpt.priceAddition,
        });
        customizationsPriceTotal += selectedOpt.priceAddition;
      }
    }

    const unitPrice = Number((dbItem.price + customizationsPriceTotal).toFixed(2));
    const itemTotal = Number((unitPrice * cartItem.quantity).toFixed(2));
    subtotal += itemTotal;

    calculatedItems.push({
      menuItemId: dbItem.id,
      name: dbItem.name,
      basePrice: dbItem.price,
      price: unitPrice,
      quantity: cartItem.quantity,
      itemTotal,
      specialInstructions: cartItem.specialInstructions?.trim() || undefined,
      customizations: optionSnapshots,
    });
  }

  subtotal = Number(subtotal.toFixed(2));
  const taxRate = restaurant.taxRate;
  const taxAmount = Number(((subtotal * taxRate) / 100).toFixed(2));
  const serviceChargeRate = restaurant.serviceChargeRate;
  const serviceCharge = Number(((subtotal * serviceChargeRate) / 100).toFixed(2));
  const totalAmount = Number((subtotal + taxAmount + serviceCharge).toFixed(2));

  return {
    items: calculatedItems,
    subtotal,
    taxRate,
    taxAmount,
    serviceChargeRate,
    serviceCharge,
    totalAmount,
    currency: restaurant.currency,
  };
}
