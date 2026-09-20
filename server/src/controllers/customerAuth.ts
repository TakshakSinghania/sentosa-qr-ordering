import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { config } from '../config/env.js';
import { normalizeIndianPhoneNumber } from '../utils/phone.js';
import { getOtpProvider } from '../services/otp/index.js';

const sendOtpSchema = z.object({
  restaurantSlug: z.string().optional(),
  restaurantId: z.string().optional(),
  phone: z.string().trim().min(5, 'Mobile number is required'),
  name: z.string().trim().optional(),
});

const verifyOtpSchema = z.object({
  restaurantSlug: z.string().optional(),
  restaurantId: z.string().optional(),
  phone: z.string().trim().min(5, 'Mobile number is required'),
  otp: z.string().trim().length(6, 'Verification code must be 6 digits'),
  name: z.string().trim().optional(),
});

async function resolveRestaurant(restaurantId?: string, restaurantSlug?: string) {
  if (restaurantId) {
    const rest = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (rest) return rest;
  }

  const slugToSearch = restaurantSlug || 'demo-cafe';
  let rest = await prisma.restaurant.findUnique({ where: { slug: slugToSearch } });
  if (!rest && (slugToSearch === 'sentosa' || slugToSearch === 'sentosa-cafe' || slugToSearch === 'demo-cafe')) {
    rest = await prisma.restaurant.findFirst({
      where: { OR: [{ slug: 'demo-cafe' }, { name: { contains: 'Sentosa' } }] },
    });
  }

  return rest;
}

/**
 * POST /api/customer/auth/send-otp
 * Dispatches a 6-digit OTP to the normalized Indian mobile number with cooldown and rate limiting.
 */
export async function sendCustomerOtp(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = sendOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid input', details: parseResult.error.format() });
      return;
    }

    const { phone: rawPhone, name, restaurantId, restaurantSlug } = parseResult.data;

    // 1. Validate and normalize mobile number to canonical E.164 (+91XXXXXXXXXX)
    const phoneResult = normalizeIndianPhoneNumber(rawPhone);
    if (!phoneResult.valid || !phoneResult.normalized) {
      res.status(400).json({ error: phoneResult.error || 'Please enter a valid 10-digit Indian mobile number.' });
      return;
    }
    const normalizedPhone = phoneResult.normalized;

    // 2. Resolve café tenant
    const restaurant = await resolveRestaurant(restaurantId, restaurantSlug);
    if (!restaurant) {
      res.status(404).json({ error: 'Café not found' });
      return;
    }

    // 3. Cooldown guard: Enforce 30-second cooldown between OTP requests
    const activeCooldownOtp = await prisma.customerOtp.findFirst({
      where: {
        restaurantId: restaurant.id,
        phone: normalizedPhone,
        isUsed: false,
        resendAfter: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeCooldownOtp) {
      const waitSeconds = Math.max(1, Math.ceil((activeCooldownOtp.resendAfter.getTime() - Date.now()) / 1000));
      res.status(429).json({
        error: `Please wait ${waitSeconds}s before requesting another verification code.`,
        retryAfterSeconds: waitSeconds,
      });
      return;
    }

    // 4. Abuse guard: Max 5 OTP requests per phone per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hourlyRequestsCount = await prisma.customerOtp.count({
      where: {
        restaurantId: restaurant.id,
        phone: normalizedPhone,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (hourlyRequestsCount >= 5) {
      res.status(429).json({
        error: 'Too many verification code requests for this number. Please wait a while before trying again.',
      });
      return;
    }

    // 5. Invalidate previous active OTPs for this phone
    await prisma.customerOtp.updateMany({
      where: {
        restaurantId: restaurant.id,
        phone: normalizedPhone,
        isUsed: false,
      },
      data: { isUsed: true },
    });

    // 6. Generate cryptographically secure 6-digit random code
    const otpCode = crypto.randomInt(100000, 1000000).toString();

    // 7. Cryptographically hash OTP before persisting in database
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otpCode, salt);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity
    const resendAfter = new Date(Date.now() + 30 * 1000);    // 30 seconds cooldown

    await prisma.customerOtp.create({
      data: {
        restaurantId: restaurant.id,
        phone: normalizedPhone,
        name: name?.trim() || null,
        otpHash,
        expiresAt,
        resendAfter,
        attempts: 0,
        maxAttempts: 5,
        isUsed: false,
      },
    });

    // 8. Dispatch code via configured OTP provider (development logs to terminal; production calls SMS gateway)
    const provider = getOtpProvider();
    const sendResult = await provider.sendOtp({
      phone: normalizedPhone,
      otp: otpCode,
      restaurantName: restaurant.name || 'Sentosa',
    });

    if (!sendResult.success) {
      res.status(502).json({ error: sendResult.error || 'Failed to send SMS verification code. Please try again.' });
      return;
    }

    // 9. Check if returning customer
    const existingCustomer = await prisma.customer.findUnique({
      where: {
        restaurantId_phone: {
          restaurantId: restaurant.id,
          phone: normalizedPhone,
        },
      },
      select: { id: true, name: true },
    });

    // Generic, secure response — actual OTP is NEVER returned or exposed
    res.json({
      success: true,
      message: 'Verification code sent successfully',
      phone: phoneResult.display,
      resendCooldownSeconds: 30,
      expiresInSeconds: 300,
      isExistingCustomer: Boolean(existingCustomer),
      customerName: existingCustomer?.name || undefined,
    });
  } catch (err: any) {
    console.error('sendCustomerOtp error:', err);
    res.status(500).json({ error: 'Failed to generate verification code' });
  }
}

/**
 * POST /api/customer/auth/verify-otp
 * Verifies the 6-digit OTP, creates or identifies customer, and issues a 30-day session token.
 */
export async function verifyCustomerOtp(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = verifyOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid verification input', details: parseResult.error.format() });
      return;
    }

    const { phone: rawPhone, otp, name: providedName, restaurantId, restaurantSlug } = parseResult.data;

    // 1. Normalize phone
    const phoneResult = normalizeIndianPhoneNumber(rawPhone);
    if (!phoneResult.valid || !phoneResult.normalized) {
      res.status(400).json({ error: 'Invalid mobile number format' });
      return;
    }
    const normalizedPhone = phoneResult.normalized;

    // 2. Resolve restaurant
    const restaurant = await resolveRestaurant(restaurantId, restaurantSlug);
    if (!restaurant) {
      res.status(404).json({ error: 'Café not found' });
      return;
    }

    // 3. Find active OTP record
    const now = new Date();
    const activeOtp = await prisma.customerOtp.findFirst({
      where: {
        restaurantId: restaurant.id,
        phone: normalizedPhone,
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeOtp) {
      res.status(400).json({ error: 'No active verification code found for this number. Please request a new code.' });
      return;
    }

    // 4. Expiration check
    if (now > activeOtp.expiresAt) {
      await prisma.customerOtp.update({
        where: { id: activeOtp.id },
        data: { isUsed: true },
      });
      res.status(400).json({ error: 'Your verification code has expired. Please request a new one.' });
      return;
    }

    // 5. Brute-force attempt threshold check
    if (activeOtp.attempts >= activeOtp.maxAttempts) {
      await prisma.customerOtp.update({
        where: { id: activeOtp.id },
        data: { isUsed: true },
      });
      res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
      return;
    }

    // 6. Verify OTP hash
    const isMatch = await bcrypt.compare(otp, activeOtp.otpHash);

    if (!isMatch) {
      const updatedAttempts = activeOtp.attempts + 1;
      const isNowMax = updatedAttempts >= activeOtp.maxAttempts;

      await prisma.customerOtp.update({
        where: { id: activeOtp.id },
        data: {
          attempts: updatedAttempts,
          isUsed: isNowMax,
        },
      });

      if (isNowMax) {
        res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
        return;
      }

      const remaining = activeOtp.maxAttempts - updatedAttempts;
      res.status(400).json({
        error: "That code doesn't look right. Please try again.",
        remainingAttempts: remaining,
      });
      return;
    }

    // 7. Successful match: Invalidate OTP so it can never be reused
    await prisma.customerOtp.update({
      where: { id: activeOtp.id },
      data: { isUsed: true },
    });

    // 8. Find or create customer account
    let customer = await prisma.customer.findUnique({
      where: {
        restaurantId_phone: {
          restaurantId: restaurant.id,
          phone: normalizedPhone,
        },
      },
    });

    const finalName = providedName?.trim() || activeOtp.name?.trim() || 'Guest Customer';

    if (!customer) {
      // New customer: create profile with verified mobile number
      customer = await prisma.customer.create({
        data: {
          restaurantId: restaurant.id,
          phone: normalizedPhone,
          name: finalName,
        },
      });
    } else if (providedName?.trim() && providedName.trim() !== customer.name) {
      // Returning customer updated their name
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { name: providedName.trim() },
      });
    }

    // 9. Issue 30-day customer session JWT
    const payload = {
      id: customer.id,
      restaurantId: customer.restaurantId,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || null,
      role: 'CUSTOMER' as const,
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '30d' });

    res.json({
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email || null,
        restaurantId: customer.restaurantId,
      },
    });
  } catch (err: any) {
    console.error('verifyCustomerOtp error:', err);
    res.status(500).json({ error: 'Failed to verify code' });
  }
}

/**
 * GET /api/customer/auth/me
 * Retrieves the currently authenticated customer profile.
 */
export async function getCurrentCustomer(req: Request, res: Response): Promise<void> {
  try {
    if (!req.customer) {
      res.status(401).json({ error: 'Unauthorized: Customer session missing' });
      return;
    }

    const customer = await prisma.customer.findUnique({
      where: { id: req.customer.id },
      select: {
        id: true,
        restaurantId: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer account not found' });
      return;
    }

    res.json({ customer });
  } catch (err: any) {
    console.error('getCurrentCustomer error:', err);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
}

/**
 * POST /api/customer/auth/logout
 */
export async function logoutCustomer(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, message: 'Logged out successfully' });
}
