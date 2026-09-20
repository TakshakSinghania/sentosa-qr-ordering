import { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { calculateOrderPricing, CartItemInput } from '../services/pricing.js';
import { signTableSession, verifyTableSession } from '../services/session.js';
import { getTableFavorites } from '../services/recommendations.js';

export async function getPublicMenu(req: Request, res: Response): Promise<void> {
  try {
    const restaurantSlug = String(req.params.restaurantSlug || '').trim();
    const tableToken = String(req.params.tableToken || '').trim();

    if (!restaurantSlug || !tableToken) {
      res.status(400).json({ error: 'Restaurant slug and table token are required' });
      return;
    }

    // 1. Look up restaurant (supports direct slug or Sentosa alias)
    let restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        phone: true,
        address: true,
        currency: true,
        currencySymbol: true,
        taxRate: true,
        serviceChargeRate: true,
        isOpen: true,
      },
    });

    if (!restaurant && (restaurantSlug === 'sentosa' || restaurantSlug === 'sentosa-cafe')) {
      restaurant = await prisma.restaurant.findFirst({
        where: { OR: [{ slug: 'demo-cafe' }, { name: { contains: 'Sentosa' } }] },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          phone: true,
          address: true,
          currency: true,
          currencySymbol: true,
          taxRate: true,
          serviceChargeRate: true,
          isOpen: true,
        },
      });
    }

    if (!restaurant) {
      res.status(404).json({ error: 'Café not found. Please check your QR code.' });
      return;
    }

    // 2. Validate table token (Strict Table Security: Must belong to restaurant and be active)
    const table = await prisma.table.findUnique({
      where: { token: tableToken },
    });

    if (!table || table.restaurantId !== restaurant.id || !table.isActive) {
      res.status(404).json({ error: 'This table QR code is no longer active. Please ask café staff.' });
      return;
    }

    // 3. Issue Cryptographically Signed Table Session Token
    const tableSessionToken = signTableSession({
      restaurantId: restaurant.id,
      tableId: table.id,
      tableToken: table.token,
      tableNumber: table.tableNumber,
    });

    // 4. Fetch active categories & menu items
    const categories = await prisma.menuCategory.findMany({
      where: {
        restaurantId: restaurant.id,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            categoryId: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            isVeg: true,
            isAvailable: true,
            isFeatured: true,
            customizationGroups: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                name: true,
                type: true,
                required: true,
                minSelections: true,
                maxSelections: true,
                sortOrder: true,
                options: {
                  orderBy: { sortOrder: 'asc' },
                  select: {
                    id: true,
                    name: true,
                    priceAddition: true,
                    isAvailable: true,
                    sortOrder: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    res.json({
      restaurant,
      table: {
        tableNumber: table.tableNumber,
        token: table.token,
      },
      tableSessionToken,
      categories,
    });
  } catch (err: any) {
    console.error('getPublicMenu error:', err);
    res.status(500).json({ error: 'Failed to load café menu' });
  }
}

export async function calculatePreview(req: Request, res: Response): Promise<void> {
  try {
    const { restaurantId, items } = req.body as {
      restaurantId: string;
      items: CartItemInput[];
    };

    if (!restaurantId || !Array.isArray(items)) {
      res.status(400).json({ error: 'restaurantId and items array are required' });
      return;
    }

    const pricing = await calculateOrderPricing(restaurantId, items);
    res.json(pricing);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to calculate pricing' });
  }
}

export async function getTableFavoritesController(req: Request, res: Response): Promise<void> {
  try {
    const rawSessionHeader = req.headers['x-table-session'] as string | undefined;
    const rawQuerySession = req.query.tableSessionToken as string | undefined;
    const rawSlug = (req.params.restaurantSlug || req.query.restaurantSlug || '') as string;
    const rawTableToken = (req.params.tableToken || req.query.tableToken || '') as string;

    const sessionToken = (rawSessionHeader || rawQuerySession || '').trim();
    const restaurantSlug = rawSlug.trim();
    const tableToken = rawTableToken.trim();

    let verifiedRestaurantId: string | null = null;
    let verifiedTableId: string | null = null;

    if (sessionToken) {
      const sessionPayload = verifyTableSession(sessionToken);
      if (!sessionPayload) {
        res.status(403).json({ error: 'Invalid or expired table session' });
        return;
      }

      const activeTable = await prisma.table.findUnique({
        where: { id: sessionPayload.tableId },
        include: { restaurant: true },
      });

      if (!activeTable || !activeTable.isActive || activeTable.token !== sessionPayload.tableToken) {
        res.status(403).json({ error: 'Table is no longer active' });
        return;
      }

      verifiedRestaurantId = activeTable.restaurantId;
      verifiedTableId = activeTable.id;
    } else if (restaurantSlug && tableToken) {
      let restaurant = await prisma.restaurant.findUnique({
        where: { slug: restaurantSlug },
        select: { id: true, isOpen: true },
      });

      if (!restaurant && (restaurantSlug === 'sentosa' || restaurantSlug === 'sentosa-cafe')) {
        restaurant = await prisma.restaurant.findFirst({
          where: { OR: [{ slug: 'demo-cafe' }, { name: { contains: 'Sentosa' } }] },
          select: { id: true, isOpen: true },
        });
      }

      if (!restaurant) {
        res.status(404).json({ error: 'Café not found' });
        return;
      }

      const table = await prisma.table.findUnique({
        where: { token: tableToken },
      });

      if (!table || table.restaurantId !== restaurant.id || !table.isActive) {
        res.status(404).json({ error: 'Table not found or inactive' });
        return;
      }

      verifiedRestaurantId = restaurant.id;
      verifiedTableId = table.id;
    } else {
      res.status(400).json({ error: 'Table session token or restaurant slug and table token required' });
      return;
    }

    // Security check: If client supplied spoofed tableId or restaurantId, reject if mismatched
    const spoofedTableId = req.query.tableId as string | undefined;
    const spoofedRestaurantId = req.query.restaurantId as string | undefined;

    if (spoofedTableId && spoofedTableId !== verifiedTableId) {
      res.status(403).json({ error: 'Table ID mismatch with authenticated table session' });
      return;
    }

    if (spoofedRestaurantId && spoofedRestaurantId !== verifiedRestaurantId) {
      res.status(403).json({ error: 'Restaurant ID mismatch with authenticated table session' });
      return;
    }

    // Optional query overrides for tests (e.g. minOrders, daysWindow, limit)
    const options: any = {};
    if (req.query.minOrders !== undefined) {
      const parsed = parseInt(String(req.query.minOrders), 10);
      if (!isNaN(parsed)) options.minOrders = parsed;
    }
    if (req.query.daysWindow !== undefined) {
      const parsed = parseInt(String(req.query.daysWindow), 10);
      if (!isNaN(parsed)) options.daysWindow = parsed;
    }
    if (req.query.limit !== undefined) {
      const parsed = parseInt(String(req.query.limit), 10);
      if (!isNaN(parsed)) options.limit = parsed;
    }

    const result = await getTableFavorites(verifiedRestaurantId, verifiedTableId, options);
    res.json(result);
  } catch (err: any) {
    console.error('getTableFavorites error:', err);
    res.status(500).json({ error: 'Failed to retrieve table favorites' });
  }
}
