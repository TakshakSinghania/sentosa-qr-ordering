import { prisma } from '../utils/prisma.js';

export interface TableFavoritesOptions {
  minOrders?: number;
  daysWindow?: number;
  limit?: number;
}

export interface PopularItemOutput {
  id: string;
  menuItemId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  isVeg: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  customizationGroups?: any[];
}

export interface TableFavoritesResult {
  enabled: boolean;
  items: PopularItemOutput[];
}

/**
 * Calculates the top menu items historically ordered at a specific dining table.
 *
 * Rules:
 * - Table identity is derived strictly from validated server session / table token.
 * - Restaurant setting: If enableTableFavorites is false, returns { enabled: false, items: [] }.
 * - Rolling historical window: Default 90 days.
 * - Qualifying orders: paymentStatus === 'COMPLETED' AND status IN ('CONFIRMED', 'PREPARING', 'READY', 'SERVED').
 *   Cancelled, pending, or failed orders are excluded.
 * - Order item quantities are aggregated (3 x Cappuccino = 3).
 * - Minimum threshold: Default 10 qualifying completed orders at the specific table.
 *   If below threshold, returns { enabled: true, items: [] } (naturally omitted).
 * - Sold-out items: Omitted in favor of the next available popular item.
 * - Ties are broken deterministically: total quantity DESC, latest order timestamp DESC, menuItemId ASC.
 * - Zero PII: Exposes only current menu item details. Never exposes customer names, phones, order IDs, or dates.
 */
export async function getTableFavorites(
  restaurantId: string,
  tableId: string,
  options: TableFavoritesOptions = {}
): Promise<TableFavoritesResult> {
  const minOrders =
    options.minOrders !== undefined
      ? options.minOrders
      : parseInt(process.env.TABLE_FAVORITES_MIN_ORDERS || '10', 10);

  const daysWindow =
    options.daysWindow !== undefined
      ? options.daysWindow
      : parseInt(process.env.TABLE_FAVORITES_DAYS || '90', 10);

  const limit = options.limit !== undefined ? options.limit : 3;

  // 1. Verify restaurant setting
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, enableTableFavorites: true },
  });

  if (!restaurant || restaurant.enableTableFavorites === false) {
    return { enabled: false, items: [] };
  }

  // 2. Compute cutoff timestamp for rolling historical window
  const cutoffDate = new Date(Date.now() - daysWindow * 24 * 60 * 60 * 1000);

  // 3. Count qualifying completed/fulfilled orders at this specific table
  const qualifyingOrderCountResult = await prisma.$queryRaw<Array<{ orderCount: number | bigint }>>`
    SELECT COUNT(DISTINCT o.id)::int AS "orderCount"
    FROM "Order" o
    WHERE o."restaurantId" = ${restaurantId}
      AND o."tableId" = ${tableId}
      AND o."paymentStatus" = 'COMPLETED'
      AND o.status IN ('CONFIRMED', 'PREPARING', 'READY', 'SERVED')
      AND o."createdAt" >= ${cutoffDate}
  `;

  const totalQualifyingOrders = Number(qualifyingOrderCountResult[0]?.orderCount || 0);

  // If table has fewer completed orders than the threshold, naturally omit
  if (totalQualifyingOrders < minOrders) {
    return { enabled: true, items: [] };
  }

  // 4. Aggregate popular items at this table, summing quantities across qualifying orders
  // Candidate pool retrieved (up to 15 items) to allow substituting sold-out items with the next available
  const candidateRows = await prisma.$queryRaw<
    Array<{
      menuItemId: string;
      totalQuantity: number | bigint;
      lastOrderedAt: Date;
    }>
  >`
    SELECT 
      oi."menuItemId", 
      SUM(oi.quantity)::int AS "totalQuantity",
      MAX(o."createdAt") AS "lastOrderedAt"
    FROM "OrderItem" oi
    JOIN "Order" o ON oi."orderId" = o.id
    WHERE o."restaurantId" = ${restaurantId}
      AND o."tableId" = ${tableId}
      AND o."paymentStatus" = 'COMPLETED'
      AND o.status IN ('CONFIRMED', 'PREPARING', 'READY', 'SERVED')
      AND o."createdAt" >= ${cutoffDate}
      AND oi."menuItemId" IS NOT NULL
    GROUP BY oi."menuItemId"
    ORDER BY "totalQuantity" DESC, "lastOrderedAt" DESC, oi."menuItemId" ASC
    LIMIT 15;
  `;

  if (!candidateRows || candidateRows.length === 0) {
    return { enabled: true, items: [] };
  }

  const candidateIds = candidateRows.map((r) => r.menuItemId);

  // 5. Fetch current authoritative menu item snapshots and availability
  const activeItems = await prisma.menuItem.findMany({
    where: {
      id: { in: candidateIds },
      restaurantId,
      isAvailable: true,
      category: { isActive: true },
    },
    include: {
      customizationGroups: {
        orderBy: { sortOrder: 'asc' },
        include: {
          options: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  });

  const activeItemMap = new Map(activeItems.map((i) => [i.id, i]));

  // 6. Assemble recommendations in ranked order, skipping sold-out items (substitute next available)
  const items: PopularItemOutput[] = [];

  for (const row of candidateRows) {
    const item = activeItemMap.get(row.menuItemId);
    if (item && item.isAvailable) {
      items.push({
        id: item.id,
        menuItemId: item.id,
        categoryId: item.categoryId,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
        isVeg: item.isVeg,
        isAvailable: item.isAvailable,
        isFeatured: item.isFeatured,
        customizationGroups: item.customizationGroups,
      });

      if (items.length >= limit) {
        break;
      }
    }
  }

  return {
    enabled: true,
    items,
  };
}
