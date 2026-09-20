import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export interface AuthUser {
  id: string;
  restaurantId: string;
  email: string;
  name: string;
  role: string;
}

export interface CustomerUser {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  email?: string | null;
  role: 'CUSTOMER';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      customer?: CustomerUser;
    }
  }
}

// Roles that carry full management + financial access
export const MANAGER_ROLES = ['ADMIN', 'MANAGER'];

// Staff roles (operational + management)
export const STAFF_ROLES = ['ADMIN', 'MANAGER', 'STAFF'];

// Helper: check if a role string has manager privileges
export function isManagerRole(role: string): boolean {
  return MANAGER_ROLES.includes(role);
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired session token' });
    return;
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient privileges for this operation' });
      return;
    }

    next();
  };
}

// Convenience middleware: Manager-only (ADMIN or MANAGER role required)
export const requireManager = requireRole(MANAGER_ROLES);

// Staff-level middleware (ADMIN, MANAGER, or STAFF role required; rejects CUSTOMER role)
export const requireStaff = requireRole(STAFF_ROLES);

/**
 * Customer Authentication Middleware
 * Enforces valid Bearer JWT token with role === 'CUSTOMER'
 */
export function authenticateCustomer(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ error: 'Customer authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as CustomerUser;
    if (decoded.role !== 'CUSTOMER') {
      res.status(403).json({ error: 'Forbidden: Valid customer authentication token required' });
      return;
    }
    req.customer = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired customer session token' });
    return;
  }
}
