import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { config } from '../config/env.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid email or password format', details: parseResult.error.format() });
      return;
    }

    const { email, password } = parseResult.data;

    // Production Security Guard: Reject development/demo credentials in production mode
    if (config.nodeEnv === 'production') {
      if (
        email.toLowerCase() === 'admin@democafe.com' ||
        email.toLowerCase() === 'staff@democafe.com' ||
        password === 'admin123' ||
        password === 'staff123'
      ) {
        res.status(403).json({
          error:
            'Default demo credentials (admin@democafe.com / admin123) are disabled in production. Please use your configured restaurant credentials.',
        });
        return;
      }
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        restaurant: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Block deactivated accounts
    if (user.role === 'DISABLED') {
      res.status(403).json({ error: 'This account has been deactivated. Contact your manager.' });
      return;
    }

    const payload = {
      id: user.id,
      restaurantId: user.restaurantId,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      restaurant: {
        id: user.restaurant.id,
        name: user.restaurant.name,
        slug: user.restaurant.slug,
        isOpen: user.restaurant.isOpen,
        currencySymbol: user.restaurant.currencySymbol,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
}

export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        restaurant: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      restaurant: {
        id: user.restaurant.id,
        name: user.restaurant.name,
        slug: user.restaurant.slug,
        phone: user.restaurant.phone,
        address: user.restaurant.address,
        isOpen: user.restaurant.isOpen,
        taxRate: user.restaurant.taxRate,
        serviceChargeRate: user.restaurant.serviceChargeRate,
        currency: user.restaurant.currency,
        currencySymbol: user.restaurant.currencySymbol,
        logoUrl: user.restaurant.logoUrl,
      },
    });
  } catch (err: any) {
    console.error('getCurrentUser error:', err);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
}
