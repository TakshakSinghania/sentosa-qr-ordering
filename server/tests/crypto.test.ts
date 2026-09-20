import { describe, it, expect } from 'vitest';
import { verifyRazorpaySignature, generateTestSignature } from '../src/utils/crypto.js';

describe('Razorpay Signature Verification Engine', () => {
  const secret = 'test_secret_key_12345';
  const orderId = 'order_DA1234567890';
  const paymentId = 'pay_DA0987654321';

  it('should verify genuine cryptographic HMAC SHA256 signatures', () => {
    const validSignature = generateTestSignature(orderId, paymentId, secret);
    const isValid = verifyRazorpaySignature(orderId, paymentId, validSignature, secret);
    expect(isValid).toBe(true);
  });

  it('should reject tampered payment signatures', () => {
    const tamperedSignature = 'deadbeefcafebabe1234567890abcdef1234567890abcdef1234567890abcdef';
    const isValid = verifyRazorpaySignature(orderId, paymentId, tamperedSignature, secret);
    expect(isValid).toBe(false);
  });

  it('should reject signatures generated with wrong secret', () => {
    const forgedSignature = generateTestSignature(orderId, paymentId, 'wrong_secret');
    const isValid = verifyRazorpaySignature(orderId, paymentId, forgedSignature, secret);
    expect(isValid).toBe(false);
  });

  it('should reject signatures if orderId or paymentId is tampered', () => {
    const validSignature = generateTestSignature(orderId, paymentId, secret);
    const isValid = verifyRazorpaySignature('order_TAMPERED', paymentId, validSignature, secret);
    expect(isValid).toBe(false);
  });
});
