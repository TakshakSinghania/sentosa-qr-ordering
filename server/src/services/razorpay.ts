import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../config/env.js';
import { verifyRazorpaySignature, generateTestSignature } from '../utils/crypto.js';

let razorpayInstance: Razorpay | null = null;

// Initialize official Razorpay SDK if valid keys are provided
if (
  config.razorpay.keyId &&
  config.razorpay.keySecret &&
  !config.razorpay.keyId.includes('placeholder') &&
  !config.razorpay.keyId.includes('demokey')
) {
  try {
    razorpayInstance = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  } catch (err) {
    console.warn('⚠️ Razorpay initialization warning:', err);
  }
}

export interface RazorpayOrderResult {
  gatewayOrderId: string;
  amount: number; // in paise
  currency: string;
  keyId: string;
  isSandboxMock: boolean;
}

export async function createRazorpayOrder(
  amountInRupees: number,
  currency = 'INR',
  receipt = 'receipt_order'
): Promise<RazorpayOrderResult> {
  const amountInPaise = Math.round(amountInRupees * 100);

  // If real Razorpay instance is available, use official SDK
  if (razorpayInstance && !config.razorpay.mockSandbox) {
    try {
      const order = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency,
        receipt,
        payment_capture: true,
      });

      return {
        gatewayOrderId: order.id,
        amount: Number(order.amount),
        currency: order.currency,
        keyId: config.razorpay.keyId,
        isSandboxMock: false,
      };
    } catch (err) {
      console.error('Failed to create order with Razorpay API, falling back to sandbox mode:', err);
    }
  }

  // Built-in Sandbox Demo Mode
  const mockOrderId = `order_${crypto.randomBytes(10).toString('hex')}`;
  return {
    gatewayOrderId: mockOrderId,
    amount: amountInPaise,
    currency,
    keyId: config.razorpay.keyId || 'rzp_test_demokey12345',
    isSandboxMock: true,
  };
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = config.razorpay.keySecret;
  return verifyRazorpaySignature(orderId, paymentId, signature, secret);
}

export function generateSandboxPaymentDetails(gatewayOrderId: string) {
  const mockPaymentId = `pay_${crypto.randomBytes(10).toString('hex')}`;
  const mockSignature = generateTestSignature(
    gatewayOrderId,
    mockPaymentId,
    config.razorpay.keySecret
  );

  return {
    gatewayOrderId,
    gatewayPaymentId: mockPaymentId,
    gatewaySignature: mockSignature,
  };
}
