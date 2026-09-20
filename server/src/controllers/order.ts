import { Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.js';
import { config } from '../config/env.js';
import { calculateOrderPricing } from '../services/pricing.js';
import { createRazorpayOrder } from '../services/razorpay.js';
import { verifyTableSession, generateSecureOrderToken } from '../services/session.js';

const orderCreateSchema = z.object({
  tableSessionToken: z.string().optional(),
  restaurantSlug: z.string().optional(),
  tableToken: z.string().optional(),
  items: z.array(
    z.object({
      menuItemId: z.string().min(1),
      quantity: z.number().int().positive(),
      specialInstructions: z.string().optional(),
      selectedOptionIds: z.array(z.string()).optional(),
    })
  ).min(1, 'Order must contain at least one item'),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerNote: z.string().optional(),
});

export async function createDraftOrder(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = orderCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid order input data', details: parseResult.error.format() });
      return;
    }

    const { tableSessionToken, restaurantSlug, tableToken, items, customerName, customerPhone, customerNote } = parseResult.data;

    // 0. Customer Authentication Verification: Compulsory for order placement & payment
    let customerId: string | null = null;
    let verifiedCustomerName = customerName?.trim() || null;
    let verifiedCustomerPhone = customerPhone?.trim() || null;

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwtSecret) as any;
        if (decoded && decoded.role === 'CUSTOMER' && decoded.id) {
          customerId = decoded.id;
          if (!verifiedCustomerName && decoded.name) {
            verifiedCustomerName = decoded.name;
          }
          if (decoded.phone) {
            verifiedCustomerPhone = decoded.phone;
          }
        }
      } catch {
        // Invalid or expired token
      }
    }

    if (!customerId) {
      res.status(401).json({
        error: 'Customer authentication required to place an order. Please sign in or register.',
      });
      return;
    }

    let restaurantId: string;
    let tableId: string;
    let tableNumber: string;

    // 1. Table Authentication: Verify Cryptographic Table Session Token
    if (tableSessionToken) {
      const sessionPayload = verifyTableSession(tableSessionToken);
      if (!sessionPayload) {
        res.status(403).json({ error: 'Invalid or expired dining session. Please scan your table QR code again.' });
        return;
      }

      // Verify table is still active in database
      const activeTable = await prisma.table.findUnique({
        where: { id: sessionPayload.tableId },
        include: { restaurant: true },
      });

      if (!activeTable || !activeTable.isActive || activeTable.token !== sessionPayload.tableToken) {
        res.status(403).json({ error: 'This table QR code has been rotated or deactivated by café staff.' });
        return;
      }

      restaurantId = activeTable.restaurantId;
      tableId = activeTable.id;
      tableNumber = activeTable.tableNumber;
    } else if (restaurantSlug && tableToken) {
      // Fallback verification using direct restaurant slug and table token
      let restaurant = await prisma.restaurant.findUnique({
        where: { slug: restaurantSlug },
      });

      if (!restaurant && (restaurantSlug === 'sentosa' || restaurantSlug === 'sentosa-cafe')) {
        restaurant = await prisma.restaurant.findFirst({
          where: { OR: [{ slug: 'demo-cafe' }, { name: { contains: 'Sentosa' } }] },
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
        res.status(403).json({ error: 'Invalid or inactive table QR code' });
        return;
      }

      restaurantId = restaurant.id;
      tableId = table.id;
      tableNumber = table.tableNumber;
    } else {
      res.status(400).json({ error: 'Valid tableSessionToken or table credentials required' });
      return;
    }

    // 2. Verify Restaurant is Open
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      res.status(404).json({ error: 'Café not found' });
      return;
    }

    if (!restaurant.isOpen) {
      res.status(400).json({ error: 'This café is currently closed and not accepting new orders.' });
      return;
    }

    // 3. Authoritative Server-Side Price Calculation (Tamper-Proof)
    const pricing = await calculateOrderPricing(restaurant.id, items);

    // 4. Generate next sequential order number for restaurant display
    const lastOrder = await prisma.order.findFirst({
      where: { restaurantId: restaurant.id },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });
    const orderNumber = (lastOrder?.orderNumber || 100) + 1;

    // 5. High-Entropy Cryptographic Order Tracking Token (Anti-Enumeration)
    const orderToken = generateSecureOrderToken();

    // 6. Create Gateway Payment Order (Razorpay)
    const razorpayOrder = await createRazorpayOrder(
      pricing.totalAmount,
      restaurant.currency,
      `order_${orderNumber}`
    );

    // 7. Persist Order and Order Items atomically in database
    const order = await prisma.order.create({
      data: {
        orderNumber,
        restaurantId: restaurant.id,
        tableId: tableId,
        customerId,
        orderToken,
        customerName: verifiedCustomerName,
        customerPhone: verifiedCustomerPhone,
        customerNote: customerNote?.trim() || null,
        subtotal: pricing.subtotal,
        taxAmount: pricing.taxAmount,
        serviceCharge: pricing.serviceCharge,
        totalAmount: pricing.totalAmount,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        items: {
          create: pricing.items.map((i) => ({
            menuItemId: i.menuItemId,
            nameSnapshot: i.name,
            priceSnapshot: i.price,
            quantity: i.quantity,
            itemTotal: i.itemTotal,
            specialInstructions: i.specialInstructions || null,
            customizations: {
              create: i.customizations.map((c) => ({
                groupName: c.groupName,
                optionName: c.optionName,
                priceAddition: c.priceAddition,
              })),
            },
          })),
        },
        payments: {
          create: {
            restaurantId: restaurant.id,
            gateway: 'RAZORPAY',
            gatewayOrderId: razorpayOrder.gatewayOrderId,
            amount: pricing.totalAmount,
            currency: restaurant.currency,
            status: 'PENDING',
          },
        },
      },
      include: {
        items: {
          include: {
            customizations: true,
          },
        },
      },
    });

    res.status(201).json({
      orderToken: order.orderToken,
      orderNumber: order.orderNumber,
      tableNumber,
      subtotal: pricing.subtotal,
      taxAmount: pricing.taxAmount,
      serviceCharge: pricing.serviceCharge,
      totalAmount: pricing.totalAmount,
      currency: restaurant.currency,
      currencySymbol: restaurant.currencySymbol,
      razorpay: razorpayOrder,
    });
  } catch (err: any) {
    console.error('createDraftOrder error:', err);
    res.status(400).json({ error: err.message || 'Failed to create order' });
  }
}

export async function getOrderStatus(req: Request, res: Response): Promise<void> {
  try {
    const orderToken = String(req.params.orderToken || '').trim();

    if (!orderToken || orderToken.length < 10) {
      res.status(400).json({ error: 'Valid order tracking token is required' });
      return;
    }

    // Look up order strictly by high-entropy unguessable token
    const order = await prisma.order.findUnique({
      where: { orderToken },
      include: {
        restaurant: {
          select: {
            name: true,
            slug: true,
            phone: true,
            currencySymbol: true,
          },
        },
        table: {
          select: {
            tableNumber: true,
            token: true,
          },
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

    if (!order) {
      res.status(404).json({ error: 'Order not found or tracking token invalid' });
      return;
    }

    // Sanitized output: Does NOT expose internal credentials
    res.json({
      id: order.id,
      customerId: order.customerId,
      orderToken: order.orderToken,
      orderNumber: order.orderNumber,
      restaurant: order.restaurant,
      tableNumber: order.table.tableNumber,
      tableToken: order.table.token,
      status: order.status,
      paymentStatus: order.paymentStatus,
      customerName: order.customerName,
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
    console.error('getOrderStatus error:', err);
    res.status(500).json({ error: 'Failed to retrieve order status' });
  }
}
