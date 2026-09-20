import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export interface TableSessionPayload {
  restaurantId: string;
  tableId: string;
  tableToken: string;
  tableNumber: string;
}

/**
 * Creates a cryptographically signed table session token.
 * This token binds the customer's browser strictly to the scanned table and restaurant.
 * Valid for 12 hours (typical dining session duration).
 */
export function signTableSession(payload: TableSessionPayload): string {
  return jwt.sign(
    {
      restaurantId: payload.restaurantId,
      tableId: payload.tableId,
      tableToken: payload.tableToken,
      tableNumber: payload.tableNumber,
      type: 'TABLE_SESSION',
    },
    config.jwtSecret,
    { expiresIn: '12h' }
  );
}

/**
 * Verifies a cryptographic table session token.
 * Returns decoded payload if valid and unexpired; otherwise null.
 */
export function verifyTableSession(token: string): TableSessionPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    if (decoded.type !== 'TABLE_SESSION') {
      return null;
    }
    return {
      restaurantId: decoded.restaurantId,
      tableId: decoded.tableId,
      tableToken: decoded.tableToken,
      tableNumber: decoded.tableNumber,
    };
  } catch {
    return null;
  }
}

/**
 * Generates an unguessable, high-entropy cryptographic tracking token for orders.
 * Prefix 'ord_trk_' followed by 48 hex characters (192 bits of entropy).
 * Completely eliminates any sequential order enumeration attacks.
 */
export function generateSecureOrderToken(): string {
  return `ord_trk_${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * Generates a cryptographically random, unguessable table token.
 * Prefix 'tbl_sec_' followed by 24 hex characters.
 */
export function generateSecureTableToken(): string {
  return `tbl_sec_${crypto.randomBytes(12).toString('hex')}`;
}
