import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../utils/prisma.js';
import { config } from '../config/env.js';
import { verifyPaymentSignature, generateSandboxPaymentDetails } from '../services/razorpay.js';
import { notifyNewOrder, notifyOrderStatusChanged } from '../services/realtime.js';

const verifyPaymentSchema = z.object({
  orderToken: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export async function verifyPayment(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = verifyPaymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid payment verification payload', details: parseResult.error.format() });
      return;
    }

    const { orderToken, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parseResult.data;

    // 1. Look up order with existing payment gateway intent records
    const order = await prisma.order.findUnique({
      where: { orderToken },
      include: {
        table: true,
        items: true,
        restaurant: true,
        payments: true,
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // 2. Check for duplicate verification (Idempotency)
    if (order.paymentStatus === 'COMPLETED' && order.status !== 'PENDING') {
      res.json({
        success: true,
        message: 'Payment already verified',
        orderToken: order.orderToken,
        orderNumber: order.orderNumber,
        status: order.status,
      });
      return;
    }

    // 3. Security: Verify that the payment gateway order belongs strictly to THIS order
    const matchingPayment = order.payments.find(
      (p) => p.gatewayOrderId === razorpayOrderId
    );

    if (!matchingPayment) {
      res.status(400).json({
        error: 'Payment verification failed: Gateway order ID does not belong to this order.',
      });
      return;
    }

    // 4. Cryptographic HMAC SHA256 Signature Verification on Server
    const isSignatureValid = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isSignatureValid) {
      // Record payment attempt failure
      await prisma.payment.update({
        where: { id: matchingPayment.id },
        data: {
          gatewayPaymentId: razorpayPaymentId,
          gatewaySignature: razorpaySignature,
          status: 'FAILED',
          failureReason: 'Cryptographic signature mismatch',
        },
      });

      res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
      return;
    }

    // 5. Update Payment and Order records atomically
    const [updatedPayment, confirmedOrder] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: matchingPayment.id },
        data: {
          gatewayPaymentId: razorpayPaymentId,
          gatewaySignature: razorpaySignature,
          status: 'SUCCESS',
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'COMPLETED',
        },
        include: {
          table: true,
          items: {
            include: {
              customizations: true,
            },
          },
          restaurant: {
            select: {
              id: true,
              name: true,
              slug: true,
              currencySymbol: true,
            },
          },
        },
      }),
    ]);

    // 5. Broadcast to kitchen POS dashboard and customer tracker
    notifyNewOrder(order.restaurantId, {
      id: confirmedOrder.id,
      orderNumber: confirmedOrder.orderNumber,
      orderToken: confirmedOrder.orderToken,
      tableNumber: confirmedOrder.table.tableNumber,
      table: { tableNumber: confirmedOrder.table.tableNumber },
      customerName: confirmedOrder.customerName,
      customerNote: confirmedOrder.customerNote,
      subtotal: confirmedOrder.subtotal,
      taxAmount: confirmedOrder.taxAmount,
      serviceCharge: confirmedOrder.serviceCharge,
      totalAmount: confirmedOrder.totalAmount,
      status: confirmedOrder.status,
      paymentStatus: confirmedOrder.paymentStatus,
      createdAt: confirmedOrder.createdAt,
      items: confirmedOrder.items.map((i) => ({
        id: i.id,
        orderId: i.orderId,
        menuItemId: i.menuItemId,
        name: i.nameSnapshot,
        nameSnapshot: i.nameSnapshot,
        price: i.priceSnapshot,
        priceSnapshot: i.priceSnapshot,
        quantity: i.quantity,
        itemTotal: i.itemTotal,
        specialInstructions: i.specialInstructions || null,
        customizations: (i.customizations || []).map((c) => ({
          id: c.id,
          groupName: c.groupName,
          optionName: c.optionName,
          priceAddition: c.priceAddition,
        })),
      })),
    });

    notifyOrderStatusChanged(order.restaurantId, order.orderToken, {
      orderToken: confirmedOrder.orderToken,
      orderNumber: confirmedOrder.orderNumber,
      status: confirmedOrder.status,
      paymentStatus: confirmedOrder.paymentStatus,
    });

    res.json({
      success: true,
      message: 'Payment verified and order confirmed',
      orderToken: confirmedOrder.orderToken,
      orderNumber: confirmedOrder.orderNumber,
      status: confirmedOrder.status,
    });
  } catch (err: any) {
    console.error('verifyPayment error:', err);
    res.status(500).json({ error: 'Server error during payment verification' });
  }
}

/**
 * Endpoint for Sandbox/Demo payment simulation.
 * Ensures the user can demonstrate the complete flow without needing a live payment card.
 */
export async function simulateSandboxPayment(req: Request, res: Response): Promise<void> {
  try {
    const { orderToken } = req.body;

    if (!orderToken) {
      res.status(400).json({ error: 'orderToken is required' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { orderToken },
      include: { payments: { take: 1 } },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const gatewayOrderId = order.payments[0]?.gatewayOrderId || `order_mock_${Date.now()}`;
    const sandboxDetails = generateSandboxPaymentDetails(gatewayOrderId);

    // Call verifyPayment logic with the generated sandbox signature
    req.body = {
      orderToken,
      razorpayOrderId: sandboxDetails.gatewayOrderId,
      razorpayPaymentId: sandboxDetails.gatewayPaymentId,
      razorpaySignature: sandboxDetails.gatewaySignature,
    };

    return verifyPayment(req, res);
  } catch (err: any) {
    console.error('simulateSandboxPayment error:', err);
    res.status(500).json({ error: 'Failed to simulate payment' });
  }
}

/**
 * Official Razorpay Webhook listener for background payment capture
 */
export async function handleRazorpayWebhook(req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const secret = config.razorpay.webhookSecret;

    if (!signature || !secret) {
      res.status(400).json({ error: 'Missing webhook signature or secret' });
      return;
    }

    const bodyToVerify = (req as any).rawBody || JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyToVerify)
      .digest('hex');

    if (expectedSignature !== signature) {
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    const event = req.body.event;
    if (event === 'payment.captured' || event === 'order.paid') {
      const payload = req.body.payload;
      const gatewayOrderId = payload?.order?.entity?.id || payload?.payment?.entity?.order_id;
      const gatewayPaymentId = payload?.payment?.entity?.id;

      if (gatewayOrderId) {
        const payment = await prisma.payment.findFirst({
          where: { gatewayOrderId },
          include: { order: true },
        });

        if (payment && payment.order.status === 'PENDING') {
          // Security: Verify amount and currency if provided in webhook payload
          const webhookAmount = payload?.payment?.entity?.amount;
          const webhookCurrency = payload?.payment?.entity?.currency;
          const expectedAmountPaise = Math.round(payment.order.totalAmount * 100);

          if (webhookAmount && webhookAmount !== expectedAmountPaise) {
            console.error(`⚠️ Webhook amount mismatch: expected ${expectedAmountPaise} paise, received ${webhookAmount} paise`);
            res.status(400).json({ error: 'Webhook payment amount mismatch' });
            return;
          }

          if (webhookCurrency && webhookCurrency.toUpperCase() !== payment.currency.toUpperCase()) {
            console.error(`⚠️ Webhook currency mismatch: expected ${payment.currency}, received ${webhookCurrency}`);
            res.status(400).json({ error: 'Webhook payment currency mismatch' });
            return;
          }

          await prisma.$transaction([
            prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: 'SUCCESS',
                gatewayPaymentId: gatewayPaymentId || payment.gatewayPaymentId,
              },
            }),
            prisma.order.update({
              where: { id: payment.orderId },
              data: {
                status: 'CONFIRMED',
                paymentStatus: 'COMPLETED',
              },
            }),
          ]);

          const fullConfirmedOrder = await prisma.order.findUnique({
            where: { id: payment.orderId },
            include: {
              table: true,
              items: {
                include: {
                  customizations: true,
                },
              },
            },
          });

          if (fullConfirmedOrder) {
            notifyNewOrder(payment.restaurantId, {
              id: fullConfirmedOrder.id,
              orderNumber: fullConfirmedOrder.orderNumber,
              orderToken: fullConfirmedOrder.orderToken,
              tableNumber: fullConfirmedOrder.table.tableNumber,
              table: { tableNumber: fullConfirmedOrder.table.tableNumber },
              customerName: fullConfirmedOrder.customerName,
              customerNote: fullConfirmedOrder.customerNote,
              subtotal: fullConfirmedOrder.subtotal,
              taxAmount: fullConfirmedOrder.taxAmount,
              serviceCharge: fullConfirmedOrder.serviceCharge,
              totalAmount: fullConfirmedOrder.totalAmount,
              status: fullConfirmedOrder.status,
              paymentStatus: fullConfirmedOrder.paymentStatus,
              createdAt: fullConfirmedOrder.createdAt,
              items: fullConfirmedOrder.items.map((i) => ({
                id: i.id,
                orderId: i.orderId,
                menuItemId: i.menuItemId,
                name: i.nameSnapshot,
                nameSnapshot: i.nameSnapshot,
                price: i.priceSnapshot,
                priceSnapshot: i.priceSnapshot,
                quantity: i.quantity,
                itemTotal: i.itemTotal,
                specialInstructions: i.specialInstructions || null,
                customizations: (i.customizations || []).map((c) => ({
                  id: c.id,
                  groupName: c.groupName,
                  optionName: c.optionName,
                  priceAddition: c.priceAddition,
                })),
              })),
            });
          }
        }
      }
    }

    res.json({ status: 'ok' });
  } catch (err: any) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing error' });
  }
}
