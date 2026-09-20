import { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';

export async function getCustomerOrders(req: Request, res: Response): Promise<void> {
  try {
    if (!req.customer) {
      res.status(401).json({ error: 'Unauthorized: Customer session required' });
      return;
    }

    const orders = await prisma.order.findMany({
      where: {
        customerId: req.customer.id,
        restaurantId: req.customer.restaurantId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        table: {
          select: { tableNumber: true, token: true },
        },
        restaurant: {
          select: { name: true, slug: true, currencySymbol: true },
        },
        items: {
          include: {
            customizations: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const formatted = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      orderToken: order.orderToken,
      tableNumber: order.table.tableNumber,
      tableToken: order.table.token,
      restaurant: order.restaurant,
      status: order.status,
      paymentStatus: order.paymentStatus,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerNote: order.customerNote,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      serviceCharge: order.serviceCharge,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((i) => ({
        id: i.id,
        menuItemId: i.menuItemId,
        name: i.nameSnapshot,
        nameSnapshot: i.nameSnapshot,
        price: i.priceSnapshot,
        priceSnapshot: i.priceSnapshot,
        quantity: i.quantity,
        itemTotal: i.itemTotal,
        specialInstructions: i.specialInstructions,
        customizations: i.customizations.map((c) => ({
          id: c.id,
          groupName: c.groupName,
          optionName: c.optionName,
          priceAddition: c.priceAddition,
        })),
      })),
      payment: order.payments[0]
        ? {
            gateway: order.payments[0].gateway,
            status: order.payments[0].status,
          }
        : null,
    }));

    res.json(formatted);
  } catch (err: any) {
    console.error('getCustomerOrders error:', err);
    res.status(500).json({ error: 'Failed to retrieve customer order history' });
  }
}

export async function getCustomerActiveOrders(req: Request, res: Response): Promise<void> {
  try {
    if (!req.customer) {
      res.status(401).json({ error: 'Unauthorized: Customer session required' });
      return;
    }

    const orders = await prisma.order.findMany({
      where: {
        customerId: req.customer.id,
        restaurantId: req.customer.restaurantId,
        status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        table: {
          select: { tableNumber: true, token: true },
        },
        restaurant: {
          select: { name: true, slug: true, currencySymbol: true },
        },
        items: {
          include: {
            customizations: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const formatted = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      orderToken: order.orderToken,
      tableNumber: order.table.tableNumber,
      tableToken: order.table.token,
      restaurant: order.restaurant,
      status: order.status,
      paymentStatus: order.paymentStatus,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerNote: order.customerNote,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      serviceCharge: order.serviceCharge,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((i) => ({
        id: i.id,
        menuItemId: i.menuItemId,
        name: i.nameSnapshot,
        nameSnapshot: i.nameSnapshot,
        price: i.priceSnapshot,
        priceSnapshot: i.priceSnapshot,
        quantity: i.quantity,
        itemTotal: i.itemTotal,
        specialInstructions: i.specialInstructions,
        customizations: i.customizations.map((c) => ({
          id: c.id,
          groupName: c.groupName,
          optionName: c.optionName,
          priceAddition: c.priceAddition,
        })),
      })),
      payment: order.payments[0]
        ? {
            gateway: order.payments[0].gateway,
            status: order.payments[0].status,
          }
        : null,
    }));

    res.json({
      count: formatted.length,
      orders: formatted,
    });
  } catch (err: any) {
    console.error('getCustomerActiveOrders error:', err);
    res.status(500).json({ error: 'Failed to retrieve active orders' });
  }
}

export async function getCustomerOrderById(req: Request, res: Response): Promise<void> {
  try {
    if (!req.customer) {
      res.status(401).json({ error: 'Unauthorized: Customer session required' });
      return;
    }

    const orderId = String(req.params.orderId || '').trim();
    if (!orderId) {
      res.status(400).json({ error: 'Valid order ID or token required' });
      return;
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderToken: orderId }],
      },
      include: {
        table: {
          select: { tableNumber: true, token: true },
        },
        restaurant: {
          select: { name: true, slug: true, currencySymbol: true },
        },
        items: {
          include: {
            customizations: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Enforce strict customer ownership and tenant isolation
    if (!order || order.customerId !== req.customer.id || order.restaurantId !== req.customer.restaurantId) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json({
      id: order.id,
      orderNumber: order.orderNumber,
      orderToken: order.orderToken,
      tableNumber: order.table.tableNumber,
      tableToken: order.table.token,
      restaurant: order.restaurant,
      status: order.status,
      paymentStatus: order.paymentStatus,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerNote: order.customerNote,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      serviceCharge: order.serviceCharge,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((i) => ({
        id: i.id,
        menuItemId: i.menuItemId,
        name: i.nameSnapshot,
        nameSnapshot: i.nameSnapshot,
        price: i.priceSnapshot,
        priceSnapshot: i.priceSnapshot,
        quantity: i.quantity,
        itemTotal: i.itemTotal,
        specialInstructions: i.specialInstructions,
        customizations: i.customizations.map((c) => ({
          id: c.id,
          groupName: c.groupName,
          optionName: c.optionName,
          priceAddition: c.priceAddition,
        })),
      })),
      payment: order.payments[0]
        ? {
            gateway: order.payments[0].gateway,
            status: order.payments[0].status,
          }
        : null,
    });
  } catch (err: any) {
    console.error('getCustomerOrderById error:', err);
    res.status(500).json({ error: 'Failed to retrieve order' });
  }
}
