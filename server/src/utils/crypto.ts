import crypto from 'crypto';

export function generateToken(prefix = 'ord_'): string {
  return `${prefix}${crypto.randomBytes(12).toString('hex')}`;
}

export function generateTableToken(): string {
  return `tbl_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Verify Razorpay HMAC-SHA256 signature server-side.
 * Razorpay expects: hmac_sha256(order_id + "|" + payment_id, secret) == signature
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf-8'),
      Buffer.from(signature, 'utf-8')
    );
  } catch {
    return false;
  }
}

/**
 * Generate a valid test signature for sandbox mock payments.
 */
export function generateTestSignature(
  orderId: string,
  paymentId: string,
  secret: string
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}
