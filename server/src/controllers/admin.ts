import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { generateTableToken } from '../utils/crypto.js';
import { generateTableQrDataUrl, getTableMenuUrl } from '../services/qr.js';
import { notifyOrderStatusChanged, notifyMenuUpdated } from '../services/realtime.js';
import { MANAGER_ROLES } from '../middleware/auth.js';


// --- ORDERS ---

/**
 * Standardize order representation for all admin views (Live Orders & History)
 * Guarantees both name and nameSnapshot, price and priceSnapshot, and customizations are always present.
 */
export function formatOrderForAdmin(order: any) {
  const tableNumber = order.table?.tableNumber || order.tableNumber || '';
  return {
    ...order,
    tableNumber,
    table: order.table ? { tableNumber } : { tableNumber },
    items: (order.items || []).map((i: any) => {
      const name = i.nameSnapshot || i.name || (i.menuItem?.name ?? 'Special Item');
      const price = i.priceSnapshot ?? i.price ?? (i.quantity ? i.itemTotal / i.quantity : 0);
      return {
        id: i.id,
        orderId: i.orderId,
        menuItemId: i.menuItemId,
        name,
        nameSnapshot: name,
        price,
        priceSnapshot: price,
        quantity: i.quantity,
        itemTotal: i.itemTotal ?? Number((price * i.quantity).toFixed(2)),
        specialInstructions: i.specialInstructions || null,
        customizations: (i.customizations || []).map((c: any) => ({
          id: c.id,
          groupName: c.groupName,
          optionName: c.optionName,
          priceAddition: c.priceAddition,
        })),
      };
    }),
  };
}

export async function getLiveOrders(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;

    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        table: {
          select: { tableNumber: true },
        },
        items: {
          include: {
            customizations: true,
            menuItem: { select: { name: true } },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    res.json(orders.map(formatOrderForAdmin));
  } catch (err: any) {
    console.error('getLiveOrders error:', err);
    res.status(500).json({ error: 'Failed to fetch live orders' });
  }
}

export async function getOrderHistory(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;
    const { filter = 'today', search, status } = req.query as {
      filter?: string;
      search?: string;
      status?: string;
    };

    const now = new Date();
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    if (filter === 'yesterday') {
      startDate.setDate(startDate.getDate() - 1);
      now.setDate(now.getDate() - 1);
      now.setHours(23, 59, 59, 999);
    } else if (filter === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (filter === 'month') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (filter === 'all') {
      startDate = new Date(0);
    }

    const whereClause: any = {
      restaurantId,
      createdAt: {
        gte: startDate,
        lte: filter === 'yesterday' ? now : undefined,
      },
    };

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      const num = parseInt(q.replace('#', ''), 10);
      whereClause.OR = [
        ...(isNaN(num) ? [] : [{ orderNumber: num }]),
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q, mode: 'insensitive' } },
        { table: { tableNumber: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        table: { select: { tableNumber: true } },
        items: {
          include: {
            customizations: true,
            menuItem: { select: { name: true } },
          },
        },
        payments: { take: 1, orderBy: { createdAt: 'desc' } },
      },
      take: 100,
    });

    res.json(orders.map(formatOrderForAdmin));
  } catch (err: any) {
    console.error('getOrderHistory error:', err);
    res.status(500).json({ error: 'Failed to fetch order history' });
  }
}

export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;
    const orderId = String(req.params.orderId);
    const { status } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: { table: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Lifecycle state machine guards:
    // 1. Cannot advance an unpaid order to kitchen preparation or service
    if (order.paymentStatus !== 'COMPLETED' && (status === 'PREPARING' || status === 'READY' || status === 'SERVED')) {
      res.status(400).json({ error: 'Cannot advance order to kitchen preparation before payment is confirmed and verified.' });
      return;
    }

    // 2. Terminal state: Cannot reactivate a cancelled order
    if (order.status === 'CANCELLED') {
      res.status(400).json({ error: 'Cannot modify a cancelled order.' });
      return;
    }

    // 3. Terminal state: Cannot regress an already served order
    if (order.status === 'SERVED' && status !== 'SERVED') {
      res.status(400).json({ error: 'Cannot modify an order that has already been served and closed.' });
      return;
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status },
      include: {
        table: { select: { tableNumber: true } },
        items: {
          include: {
            customizations: true,
            menuItem: { select: { name: true } },
          },
        },
      },
    });

    // Notify customer phone and dashboard in real-time
    notifyOrderStatusChanged(restaurantId, updated.orderToken, {
      orderId: updated.id,
      orderToken: updated.orderToken,
      orderNumber: updated.orderNumber,
      status: updated.status,
      paymentStatus: updated.paymentStatus,
    });

    res.json(formatOrderForAdmin(updated));
  } catch (err: any) {
    console.error('updateOrderStatus error:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
}

// --- MENU MANAGEMENT ---

export async function getAdminMenu(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;

    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
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
        },
      },
    });

    res.json(categories);
  } catch (err: any) {
    console.error('getAdminMenu error:', err);
    res.status(500).json({ error: 'Failed to fetch admin menu' });
  }
}

export async function createMenuItem(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;
    const { categoryId, name, description, price, imageUrl, isVeg, isAvailable, isFeatured } = req.body;

    if (!categoryId || !name || price === undefined) {
      res.status(400).json({ error: 'Category, item name, and price are required' });
      return;
    }

    const item = await prisma.menuItem.create({
      data: {
        restaurantId,
        categoryId,
        name: name.trim(),
        description: description?.trim() || '',
        price: parseFloat(price),
        imageUrl: imageUrl || null,
        isVeg: Boolean(isVeg),
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
        isFeatured: Boolean(isFeatured),
      },
    });

    notifyMenuUpdated(restaurantId);
    res.status(201).json(item);
  } catch (err: any) {
    console.error('createMenuItem error:', err);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
}

export async function updateMenuItem(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;
    const itemId = String(req.params.itemId);
    const { name, description, price, imageUrl, isVeg, isAvailable, isFeatured, categoryId } = req.body;

    const existing = await prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Menu item not found' });
      return;
    }

    const updated = await prisma.menuItem.update({
      where: { id: itemId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description.trim() }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isVeg !== undefined && { isVeg: Boolean(isVeg) }),
        ...(isAvailable !== undefined && { isAvailable: Boolean(isAvailable) }),
        ...(isFeatured !== undefined && { isFeatured: Boolean(isFeatured) }),
        ...(categoryId !== undefined && { categoryId }),
      },
    });

    notifyMenuUpdated(restaurantId);
    res.json(updated);
  } catch (err: any) {
    console.error('updateMenuItem error:', err);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
}

export async function toggleItemAvailability(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;
    const itemId = String(req.params.itemId);

    const existing = await prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Menu item not found' });
      return;
    }

    const updated = await prisma.menuItem.update({
      where: { id: itemId },
      data: { isAvailable: !existing.isAvailable },
    });

    notifyMenuUpdated(restaurantId);
    res.json(updated);
  } catch (err: any) {
    console.error('toggleItemAvailability error:', err);
    res.status(500).json({ error: 'Failed to toggle availability' });
  }
}

export async function deleteMenuItem(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;
    const itemId = String(req.params.itemId);

    const existing = await prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Menu item not found' });
      return;
    }

    await prisma.menuItem.delete({
      where: { id: itemId },
    });

    notifyMenuUpdated(restaurantId);
    res.json({ success: true, message: 'Item deleted' });
  } catch (err: any) {
    console.error('deleteMenuItem error:', err);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
}

// --- CATEGORIES ---

export async function createCategory(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;
    const { name, sortOrder } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Category name is required' });
      return;
    }

    const category = await prisma.menuCategory.create({
      data: {
        restaurantId,
        name: name.trim(),
        sortOrder: sortOrder || 0,
      },
    });

    notifyMenuUpdated(restaurantId);
    res.status(201).json(category);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create category' });
  }
}

// --- TABLES & QR CODES ---

export async function getTables(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { slug: true, name: true },
    });

    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }

    const tables = await prisma.table.findMany({
      where: { restaurantId },
      orderBy: { tableNumber: 'asc' },
      include: {
        orders: {
          where: {
            status: { in: ['CONFIRMED', 'PREPARING', 'READY'] },
          },
          select: { id: true, orderNumber: true, totalAmount: true, status: true },
        },
      },
    });

    // Generate QR Data URLs and determine live occupancy status
    const tablesWithQr = await Promise.all(
      tables.map(async (table) => {
        const qrDataUrl = await generateTableQrDataUrl(restaurant.slug, table.token);
        const menuUrl = getTableMenuUrl(restaurant.slug, table.token);
        const isOccupied = table.orders.length > 0;

        return {
          id: table.id,
          tableNumber: table.tableNumber,
          token: table.token,
          capacity: table.capacity,
          isActive: table.isActive,
          isOccupied,
          activeOrdersCount: table.orders.length,
          activeOrders: table.orders,
          qrDataUrl,
          menuUrl,
        };
      })
    );

    res.json(tablesWithQr);
  } catch (err: any) {
    console.error('getTables error:', err);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
}

export async function createTable(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;
    const { tableNumber, capacity } = req.body;

    if (!tableNumber) {
      res.status(400).json({ error: 'Table number is required' });
      return;
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { slug: true },
    });

    const token = generateTableToken();
    const table = await prisma.table.create({
      data: {
        restaurantId,
        tableNumber: tableNumber.trim(),
        capacity: capacity ? parseInt(capacity, 10) : 4,
        token,
        isActive: true,
      },
    });

    const qrDataUrl = await generateTableQrDataUrl(restaurant!.slug, table.token);
    const menuUrl = getTableMenuUrl(restaurant!.slug, table.token);

    res.status(201).json({
      ...table,
      qrDataUrl,
      menuUrl,
    });
  } catch (err: any) {
    console.error('createTable error:', err);
    res.status(500).json({ error: 'Failed to create table' });
  }
}

export async function toggleTableActive(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;
    const tableId = String(req.params.tableId);

    const table = await prisma.table.findFirst({
      where: { id: tableId, restaurantId },
    });

    if (!table) {
      res.status(404).json({ error: 'Table not found' });
      return;
    }

    const updated = await prisma.table.update({
      where: { id: table.id },
      data: { isActive: !table.isActive },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to toggle table status' });
  }
}

export async function regenerateTableToken(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;
    const tableId = String(req.params.tableId);

    const table = await prisma.table.findFirst({
      where: { id: tableId, restaurantId },
    });

    if (!table) {
      res.status(404).json({ error: 'Table not found' });
      return;
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { slug: true },
    });

    const newToken = generateTableToken();
    const updated = await prisma.table.update({
      where: { id: table.id },
      data: { token: newToken },
    });

    const qrDataUrl = await generateTableQrDataUrl(restaurant!.slug, updated.token);
    const menuUrl = getTableMenuUrl(restaurant!.slug, updated.token);

    res.json({
      ...updated,
      qrDataUrl,
      menuUrl,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to regenerate table token' });
  }
}

export async function getPrintableQrs(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { name: true, slug: true, phone: true, logoUrl: true },
    });

    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }

    const tables = await prisma.table.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { tableNumber: 'asc' },
    });

    const printableItems = await Promise.all(
      tables.map(async (table) => {
        const qrDataUrl = await generateTableQrDataUrl(restaurant.slug, table.token);
        const menuUrl = getTableMenuUrl(restaurant.slug, table.token);
        return {
          tableNumber: table.tableNumber,
          qrDataUrl,
          menuUrl,
        };
      })
    );

    res.json({
      restaurantName: restaurant.name,
      logoUrl: restaurant.logoUrl,
      tables: printableItems,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate printable QR data' });
  }
}

// --- ANALYTICS ---

export async function getAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Fetch completed/paid orders for today
    const todaysPaidOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        paymentStatus: 'COMPLETED',
        createdAt: { gte: todayStart },
      },
    });

    const todayRevenue = todaysPaidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const todayOrdersCount = todaysPaidOrders.length;
    const averageOrderValue = todayOrdersCount > 0 ? todayRevenue / todayOrdersCount : 0;

    // 2. Active orders count
    const activeOrdersCount = await prisma.order.count({
      where: {
        restaurantId,
        status: { in: ['CONFIRMED', 'PREPARING', 'READY'] },
      },
    });

    // 3. Completed orders count all-time
    const completedOrdersCount = await prisma.order.count({
      where: {
        restaurantId,
        status: 'SERVED',
      },
    });

    // 4. Top 5 popular items (computed from paid order items)
    const topItemsRaw = await prisma.orderItem.groupBy({
      by: ['nameSnapshot'],
      where: {
        order: {
          restaurantId,
          paymentStatus: 'COMPLETED',
        },
      },
      _sum: {
        quantity: true,
        itemTotal: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    });

    const topItems = topItemsRaw.map((item) => ({
      name: item.nameSnapshot,
      quantitySold: item._sum.quantity || 0,
      totalRevenue: Number((item._sum.itemTotal || 0).toFixed(2)),
    }));

    // 5. Last 7 Days Revenue Trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const pastWeekOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        paymentStatus: 'COMPLETED',
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
    });

    const dailyRevenueMap: { [key: string]: number } = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      dailyRevenueMap[dateStr] = 0;
    }

    for (const ord of pastWeekOrders) {
      const dateStr = ord.createdAt.toISOString().split('T')[0];
      if (dailyRevenueMap[dateStr] !== undefined) {
        dailyRevenueMap[dateStr] += ord.totalAmount;
      }
    }

    const revenueByDay = Object.keys(dailyRevenueMap).map((date) => ({
      date,
      revenue: Number(dailyRevenueMap[date].toFixed(2)),
    }));

    res.json({
      todayRevenue: Number(todayRevenue.toFixed(2)),
      todayOrdersCount,
      averageOrderValue: Number(averageOrderValue.toFixed(2)),
      activeOrdersCount,
      completedOrdersCount,
      topItems,
      revenueByDay,
    });
  } catch (err: any) {
    console.error('getAnalytics error:', err);
    res.status(500).json({ error: 'Failed to calculate analytics' });
  }
}

// --- SETTINGS ---

export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }

    res.json(restaurant);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;
    const { name, phone, address, taxRate, serviceChargeRate, isOpen, logoUrl, enableTableFavorites } = req.body;

    const updated = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone.trim() }),
        ...(address !== undefined && { address: address.trim() }),
        ...(taxRate !== undefined && { taxRate: parseFloat(taxRate) }),
        ...(serviceChargeRate !== undefined && { serviceChargeRate: parseFloat(serviceChargeRate) }),
        ...(isOpen !== undefined && { isOpen: Boolean(isOpen) }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(enableTableFavorites !== undefined && { enableTableFavorites: Boolean(enableTableFavorites) }),
      },
    });

    res.json(updated);
  } catch (err: any) {
    console.error('updateSettings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
}

// --- CUSTOMIZATION MANAGEMENT ---

export async function createCustomizationGroup(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;
    const menuItemId = req.params.itemId || req.body.menuItemId;
    const { name, type, required, minSelections, maxSelections, options } = req.body;

    if (!menuItemId || !name) {
      res.status(400).json({ error: 'menuItemId and name are required' });
      return;
    }

    const item = await prisma.menuItem.findFirst({
      where: { id: menuItemId, restaurantId },
    });

    if (!item) {
      res.status(404).json({ error: 'Menu item not found in this restaurant' });
      return;
    }

    const group = await prisma.customizationGroup.create({
      data: {
        menuItemId,
        name: name.trim(),
        type: type === 'MULTI' ? 'MULTI' : 'SINGLE',
        required: Boolean(required),
        minSelections: minSelections !== undefined ? Number(minSelections) : required ? 1 : 0,
        maxSelections: maxSelections !== undefined ? Number(maxSelections) : 1,
        options: {
          create: Array.isArray(options)
            ? options.map((opt: any, idx: number) => ({
                name: String(opt.name).trim(),
                priceAddition: Number(opt.priceAddition || 0),
                isAvailable: opt.isAvailable !== false,
                sortOrder: idx + 1,
              }))
            : [],
        },
      },
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
      },
    });

    res.status(201).json(group);
  } catch (err: any) {
    console.error('createCustomizationGroup error:', err);
    res.status(500).json({ error: 'Failed to create customization group' });
  }
}

export async function updateCustomizationGroup(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;
    const id = String(req.params.id);
    const { name, type, required, minSelections, maxSelections } = req.body;

    const group = await prisma.customizationGroup.findFirst({
      where: { id },
      include: { menuItem: true },
    }) as any;

    if (!group || group.menuItem?.restaurantId !== restaurantId) {
      res.status(404).json({ error: 'Customization group not found' });
      return;
    }

    const updated = await prisma.customizationGroup.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(type !== undefined && { type: type === 'MULTI' ? 'MULTI' : 'SINGLE' }),
        ...(required !== undefined && { required: Boolean(required) }),
        ...(minSelections !== undefined && { minSelections: Number(minSelections) }),
        ...(maxSelections !== undefined && { maxSelections: Number(maxSelections) }),
      },
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
      },
    });

    res.json(updated);
  } catch (err: any) {
    console.error('updateCustomizationGroup error:', err);
    res.status(500).json({ error: 'Failed to update customization group' });
  }
}

export async function deleteCustomizationGroup(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;
    const id = String(req.params.id);

    const group = await prisma.customizationGroup.findFirst({
      where: { id },
      include: { menuItem: true },
    }) as any;

    if (!group || group.menuItem?.restaurantId !== restaurantId) {
      res.status(404).json({ error: 'Customization group not found' });
      return;
    }

    await prisma.customizationGroup.delete({ where: { id } });
    res.json({ success: true, message: 'Customization group deleted' });
  } catch (err: any) {
    console.error('deleteCustomizationGroup error:', err);
    res.status(500).json({ error: 'Failed to delete customization group' });
  }
}

export async function toggleCustomizationOptionAvailability(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;
    const id = String(req.params.id);

    const option = await prisma.customizationOption.findFirst({
      where: { id },
      include: {
        customizationGroup: {
          include: { menuItem: true },
        },
      },
    }) as any;

    if (!option || option.customizationGroup?.menuItem?.restaurantId !== restaurantId) {
      res.status(404).json({ error: 'Customization option not found' });
      return;
    }

    const updated = await prisma.customizationOption.update({
      where: { id },
      data: { isAvailable: !option.isAvailable },
    });

    res.json(updated);
  } catch (err: any) {
    console.error('toggleCustomizationOptionAvailability error:', err);
    res.status(500).json({ error: 'Failed to toggle option availability' });
  }
}

export async function addCustomizationOption(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;
    const groupId = String(req.params.groupId);
    const { name, priceAddition } = req.body;

    const group = await prisma.customizationGroup.findFirst({
      where: { id: groupId },
      include: { menuItem: true, options: true },
    }) as any;

    if (!group || group.menuItem?.restaurantId !== restaurantId) {
      res.status(404).json({ error: 'Customization group not found' });
      return;
    }

    const newOption = await prisma.customizationOption.create({
      data: {
        customizationGroupId: groupId,
        name: String(name).trim(),
        priceAddition: Number(priceAddition || 0),
        sortOrder: (group.options?.length || 0) + 1,
      },
    });

    res.status(201).json(newOption);
  } catch (err: any) {
    console.error('addCustomizationOption error:', err);
    res.status(500).json({ error: 'Failed to add customization option' });
  }
}

export async function deleteCustomizationOption(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;
    const id = String(req.params.id);

    const option = await prisma.customizationOption.findFirst({
      where: { id },
      include: {
        customizationGroup: {
          include: { menuItem: true },
        },
      },
    }) as any;

    if (!option || option.customizationGroup?.menuItem?.restaurantId !== restaurantId) {
      res.status(404).json({ error: 'Customization option not found' });
      return;
    }

    await prisma.customizationOption.delete({ where: { id } });
    res.json({ success: true, message: 'Option deleted' });
  } catch (err: any) {
    console.error('deleteCustomizationOption error:', err);
    res.status(500).json({ error: 'Failed to delete customization option' });
  }
}

// --- STAFF MANAGEMENT (Manager-only operations) ---

/**
 * Get list of all staff and managers for the authenticated restaurant.
 * Excludes password hashes. Tenant-isolated by restaurantId from JWT.
 */
export async function getStaffList(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;

    const staff = await prisma.user.findMany({
      where: { restaurantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(staff);
  } catch (err: any) {
    console.error('getStaffList error:', err);
    res.status(500).json({ error: 'Failed to fetch staff list' });
  }
}

/**
 * Create a new staff or manager account under the same restaurant.
 * Only managers can create accounts. restaurantId derived from JWT, never from request body.
 */
export async function createStaffAccount(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;
    const { name, email, password, role = 'STAFF' } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Staff name is required' });
      return;
    }

    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'A valid email address is required' });
      return;
    }

    if (!password || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long' });
      return;
    }

    // Only allow creating STAFF or MANAGER accounts
    if (!['STAFF', 'MANAGER'].includes(role)) {
      res.status(400).json({ error: 'Invalid role. Must be STAFF or MANAGER.' });
      return;
    }

    // Check for duplicate email
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        restaurantId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (err: any) {
    console.error('createStaffAccount error:', err);
    res.status(500).json({ error: 'Failed to create staff account' });
  }
}

/**
 * Update name or role for a staff member in the same restaurant.
 * Managers cannot demote their own account.
 */
export async function updateStaffAccount(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;
    const userId = String(req.params.userId);
    const { name, role } = req.body;

    // Find user within same tenant boundary
    const target = await prisma.user.findFirst({
      where: { id: userId, restaurantId },
    });

    if (!target) {
      res.status(404).json({ error: 'Staff member not found' });
      return;
    }

    // Prevent self-demotion: managers cannot downgrade their own role
    if (userId === req.user!.id && role && !MANAGER_ROLES.includes(role)) {
      res.status(400).json({ error: 'Cannot demote your own account. Ask another manager to change your role.' });
      return;
    }

    // Only allow valid roles
    if (role !== undefined && !['STAFF', 'MANAGER'].includes(role)) {
      res.status(400).json({ error: 'Invalid role. Must be STAFF or MANAGER.' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(role !== undefined && { role }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(updated);
  } catch (err: any) {
    console.error('updateStaffAccount error:', err);
    res.status(500).json({ error: 'Failed to update staff account' });
  }
}

/**
 * Reset a staff member's password. Manager-only. Tenant-isolated.
 */
export async function resetStaffPassword(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;
    const userId = String(req.params.userId);
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters long' });
      return;
    }

    const target = await prisma.user.findFirst({
      where: { id: userId, restaurantId },
    });

    if (!target) {
      res.status(404).json({ error: 'Staff member not found' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    console.error('resetStaffPassword error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
}

/**
 * Deactivate (soft-delete) a staff member by marking role as DISABLED.
 * Prevents them from logging in without deleting their data.
 * Managers cannot deactivate themselves.
 */
export async function deactivateStaffAccount(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user!.restaurantId;
    const userId = String(req.params.userId);

    if (userId === req.user!.id) {
      res.status(400).json({ error: 'Cannot deactivate your own account' });
      return;
    }

    const target = await prisma.user.findFirst({
      where: { id: userId, restaurantId },
    });

    if (!target) {
      res.status(404).json({ error: 'Staff member not found' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: 'DISABLED' },
      select: { id: true, name: true, email: true, role: true },
    });

    res.json(updated);
  } catch (err: any) {
    console.error('deactivateStaffAccount error:', err);
    res.status(500).json({ error: 'Failed to deactivate account' });
  }
}

