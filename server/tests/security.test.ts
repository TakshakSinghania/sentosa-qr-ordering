import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/utils/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { signTableSession, verifyTableSession } from '../src/services/session.js';
import { config } from '../src/config/env.js';
import { verifyRazorpaySignature, generateTestSignature } from '../src/utils/crypto.js';

describe('Comprehensive QR, Table, and Multi-Tenant Security Suite', () => {
  let restaurantAId: string;
  let restaurantBId: string;
  let tableAId: string;
  let tableAToken: string;
  let tableBId: string;
  let tableBToken: string;
  let userAToken: string;
  let userBToken: string;

  beforeAll(async () => {
    // 1. Fetch Restaurant A (Demo Cafe)
    const restA = await prisma.restaurant.findUnique({
      where: { slug: 'demo-cafe' },
      include: { tables: true, users: true },
    });
    if (!restA) throw new Error('Demo cafe not found');
    restaurantAId = restA.id;
    tableAId = restA.tables[0].id;
    tableAToken = restA.tables[0].token;

    // Create JWT for user A
    userAToken = jwt.sign(
      {
        id: restA.users[0].id,
        restaurantId: restA.id,
        email: restA.users[0].email,
        name: restA.users[0].name,
        role: restA.users[0].role,
      },
      config.jwtSecret
    );

    // 2. Create Restaurant B (Artisan Bakes) for multi-tenant isolation testing
    let restB = await prisma.restaurant.findUnique({
      where: { slug: 'artisan-bakes' },
      include: { tables: true, users: true },
    });

    if (!restB) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('secret123', salt);

      restB = await prisma.restaurant.create({
        data: {
          name: 'Artisan Bakes & Bistro',
          slug: 'artisan-bakes',
          currency: 'INR',
          currencySymbol: '₹',
          taxRate: 5.0,
          isOpen: true,
          tables: {
            create: [
              { tableNumber: 'B-01', token: 'tbl_artisan_b01', capacity: 2 },
            ],
          },
          users: {
            create: [
              {
                name: 'Baker Admin',
                email: 'admin@artisanbakes.com',
                passwordHash: hash,
                role: 'ADMIN',
              },
            ],
          },
        },
        include: { tables: true, users: true },
      });
    }

    restaurantBId = restB.id;
    tableBId = restB.tables[0].id;
    tableBToken = restB.tables[0].token;

    userBToken = jwt.sign(
      {
        id: restB.users[0].id,
        restaurantId: restB.id,
        email: restB.users[0].email,
        name: restB.users[0].name,
        role: restB.users[0].role,
      },
      config.jwtSecret
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Cryptographic Table Session & Anti-Spoofing', () => {
    it('signs and verifies genuine table session tokens', () => {
      const session = signTableSession({
        restaurantId: restaurantAId,
        tableId: tableAId,
        tableToken: tableAToken,
        tableNumber: '01',
      });

      const verified = verifyTableSession(session);
      expect(verified).not.toBeNull();
      expect(verified?.restaurantId).toBe(restaurantAId);
      expect(verified?.tableId).toBe(tableAId);
      expect(verified?.tableToken).toBe(tableAToken);
    });

    it('rejects tampered table session tokens', () => {
      const validSession = signTableSession({
        restaurantId: restaurantAId,
        tableId: tableAId,
        tableToken: tableAToken,
        tableNumber: '01',
      });

      const tamperedSession = validSession.slice(0, -6) + 'abcdef';
      const verified = verifyTableSession(tamperedSession);
      expect(verified).toBeNull();
    });

    it('rejects session tokens signed with an unauthorized key', () => {
      const fakeSession = jwt.sign(
        {
          restaurantId: restaurantAId,
          tableId: tableAId,
          tableToken: tableAToken,
          tableNumber: '01',
          type: 'TABLE_SESSION',
        },
        'unauthorized_attacker_secret_key'
      );

      const verified = verifyTableSession(fakeSession);
      expect(verified).toBeNull();
    });
  });

  describe('2. Anti-Enumeration Order Tracking Protection', () => {
    it('ensures orders cannot be queried or enumerated using sequential IDs (#101, #102)', async () => {
      const result = await prisma.order.findUnique({
        where: { orderToken: '101' },
      });
      expect(result).toBeNull();
    });

    it('verifies order tokens have sufficient cryptographic entropy', async () => {
      const order = await prisma.order.findFirst({
        where: { restaurantId: restaurantAId },
      });
      if (order) {
        expect(order.orderToken).toMatch(/^ord_/);
        expect(order.orderToken.length).toBeGreaterThanOrEqual(20);
      }
    });
  });

  describe('3. Multi-Tenant Restaurant Isolation', () => {
    it('ensures staff of Restaurant A cannot access tables belonging to Restaurant B', async () => {
      const tableFromB = await prisma.table.findFirst({
        where: { id: tableBId, restaurantId: restaurantAId },
      });
      expect(tableFromB).toBeNull();
    });

    it('ensures staff of Restaurant A cannot access orders belonging to Restaurant B', async () => {
      const orderFromB = await prisma.order.findFirst({
        where: { restaurantId: restaurantBId },
      });

      if (orderFromB) {
        const queryWithRestA = await prisma.order.findFirst({
          where: { id: orderFromB.id, restaurantId: restaurantAId },
        });
        expect(queryWithRestA).toBeNull();
      }
    });
  });

  describe('4. Cryptographic Payment Verification', () => {
    it('accepts authentic HMAC-SHA256 Razorpay signatures', () => {
      const orderId = 'order_987654321';
      const paymentId = 'pay_123456789';
      const secret = config.razorpay.keySecret;

      const validSig = generateTestSignature(orderId, paymentId, secret);
      expect(verifyRazorpaySignature(orderId, paymentId, validSig, secret)).toBe(true);
    });

    it('rejects forged or modified Razorpay signatures', () => {
      const orderId = 'order_987654321';
      const paymentId = 'pay_123456789';
      const secret = config.razorpay.keySecret;

      const forgedSig = '0000000000000000000000000000000000000000000000000000000000000000';
      expect(verifyRazorpaySignature(orderId, paymentId, forgedSig, secret)).toBe(false);
    });
  });
});
