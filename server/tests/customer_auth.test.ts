import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/index.js';
import { prisma } from '../src/utils/prisma.js';
import { normalizeIndianPhoneNumber } from '../src/utils/phone.js';
import { DevelopmentOtpProvider } from '../src/services/otp/developmentProvider.js';

const request = supertest(app);

describe('Customer Phone OTP Authentication & Ownership Security Suite', () => {
  let restaurantId: string;
  let tableToken: string;
  let menuItemId: string;
  let customerAPhone = '+919999911111';
  let customerBPhone = '+919999922222';
  let customerAToken: string;
  let customerAId: string;
  let customerBToken: string;
  let customerBId: string;
  let orderAId: string;
  let orderAToken: string;
  let orderBId: string;
  let orderBToken: string;

  beforeAll(async () => {
    // 1. Fetch Demo Cafe and Table
    const rest = await prisma.restaurant.findUnique({
      where: { slug: 'demo-cafe' },
      include: {
        tables: true,
        menuItems: { where: { isAvailable: true }, include: { customizationGroups: true } },
      },
    });

    if (!rest || rest.tables.length === 0 || rest.menuItems.length === 0) {
      throw new Error('Database not seeded with demo restaurant, tables, or menu items');
    }

    restaurantId = rest.id;
    tableToken = rest.tables[0].token;
    const simpleItem = rest.menuItems.find((i) => !i.customizationGroups || i.customizationGroups.length === 0) || rest.menuItems[0];
    menuItemId = simpleItem.id;

    // Clean up any test records created in previous runs
    await prisma.customerOtp.deleteMany({
      where: { phone: { in: [customerAPhone, customerBPhone, '+919999933333', '+919876543210'] } },
    });
    await prisma.order.deleteMany({
      where: {
        OR: [
          { customerName: 'Test Customer A' },
          { customerName: 'Test Customer B' },
        ],
      },
    });
    await prisma.customer.deleteMany({
      where: {
        phone: { in: [customerAPhone, customerBPhone, '+919999933333'] },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ============================================================
  // 1. PHONE NUMBER NORMALIZATION UTILITY TESTS
  // ============================================================
  describe('Indian Phone Number Normalization', () => {
    it('normalizes 10-digit bare number to canonical +91 format', () => {
      const res = normalizeIndianPhoneNumber('9876543210');
      expect(res.valid).toBe(true);
      expect(res.normalized).toBe('+919876543210');
      expect(res.display).toBe('+91 98765 43210');
      expect(res.masked).toBe('+91 ••••• ••210');
    });

    it('normalizes number with spaces and +91 prefix', () => {
      const res = normalizeIndianPhoneNumber('+91 98765 43210');
      expect(res.valid).toBe(true);
      expect(res.normalized).toBe('+919876543210');
    });

    it('normalizes number with leading zero (09876543210)', () => {
      const res = normalizeIndianPhoneNumber('09876543210');
      expect(res.valid).toBe(true);
      expect(res.normalized).toBe('+919876543210');
    });

    it('normalizes number with 91 prefix without plus (919876543210)', () => {
      const res = normalizeIndianPhoneNumber('919876543210');
      expect(res.valid).toBe(true);
      expect(res.normalized).toBe('+919876543210');
    });

    it('rejects numbers with fewer than 10 digits', () => {
      const res = normalizeIndianPhoneNumber('98765');
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('rejects invalid empty string or non-phone inputs', () => {
      expect(normalizeIndianPhoneNumber('').valid).toBe(false);
      expect(normalizeIndianPhoneNumber('abc').valid).toBe(false);
    });
  });

  // ============================================================
  // 2. SEND OTP ENDPOINT & SECURITY
  // ============================================================
  describe('POST /api/customer/auth/send-otp', () => {
    it('generates an OTP, saves it securely, and does NOT return the code in response', async () => {
      const res = await request.post('/api/customer/auth/send-otp').send({
        restaurantSlug: 'demo-cafe',
        phone: customerAPhone,
        name: 'Test Customer A',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.resendCooldownSeconds).toBe(30);
      expect(res.body.expiresInSeconds).toBe(300);
      expect(res.body.otp).toBeUndefined(); // Security: Never return OTP in response

      // Inspect database record
      const otpRecord = await prisma.customerOtp.findFirst({
        where: { phone: customerAPhone, isUsed: false },
        orderBy: { createdAt: 'desc' },
      });

      expect(otpRecord).toBeDefined();
      expect(otpRecord!.otpHash).toBeDefined();
      expect(otpRecord!.otpHash).not.toBe('');
      expect(otpRecord!.attempts).toBe(0);
      expect(otpRecord!.maxAttempts).toBe(5);
    });

    it('enforces 30-second resend cooldown (429 Too Many Requests)', async () => {
      const res = await request.post('/api/customer/auth/send-otp').send({
        restaurantSlug: 'demo-cafe',
        phone: customerAPhone,
      });

      expect(res.status).toBe(429);
      expect(res.body.error).toMatch(/wait/i);
    });

    it('rejects invalid phone format with 400 Bad Request', async () => {
      const res = await request.post('/api/customer/auth/send-otp').send({
        restaurantSlug: 'demo-cafe',
        phone: '123',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  // ============================================================
  // 3. VERIFY OTP ENDPOINT & CUSTOMER CREATION
  // ============================================================
  describe('POST /api/customer/auth/verify-otp', () => {
    it('rejects incorrect OTP (400 Bad Request) and decrements remaining attempts', async () => {
      const res = await request.post('/api/customer/auth/verify-otp').send({
        restaurantSlug: 'demo-cafe',
        phone: customerAPhone,
        otp: '000000', // incorrect
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/try again/i);
      expect(res.body.remainingAttempts).toBe(4);
    });

    it('verifies correct OTP, marks OTP used, and creates Customer A session', async () => {
      // In test mode, retrieve the latest active OTP hash for Customer A and simulate
      // We can also create a known OTP in DB for exact matching
      const testOtp = '654321';
      const bcrypt = (await import('bcryptjs')).default;
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(testOtp, salt);

      // Create known active OTP
      await prisma.customerOtp.updateMany({
        where: { phone: customerAPhone },
        data: { isUsed: true },
      });

      await prisma.customerOtp.create({
        data: {
          restaurantId,
          phone: customerAPhone,
          name: 'Test Customer A',
          otpHash: hash,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          resendAfter: new Date(Date.now() - 1000),
          attempts: 0,
          maxAttempts: 5,
          isUsed: false,
        },
      });

      const res = await request.post('/api/customer/auth/verify-otp').send({
        restaurantSlug: 'demo-cafe',
        phone: customerAPhone,
        otp: testOtp,
        name: 'Test Customer A',
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.customer).toBeDefined();
      expect(res.body.customer.name).toBe('Test Customer A');
      expect(res.body.customer.phone).toBe(customerAPhone);
      expect(res.body.customer.passwordHash).toBeUndefined();

      customerAToken = res.body.token;
      customerAId = res.body.customer.id;
    });

    it('prevents OTP replay: already-used OTP cannot be used again (400 Bad Request)', async () => {
      const res = await request.post('/api/customer/auth/verify-otp').send({
        restaurantSlug: 'demo-cafe',
        phone: customerAPhone,
        otp: '654321',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no active verification code/i);
    });

    it('rejects expired OTP (400 Bad Request)', async () => {
      const bcrypt = (await import('bcryptjs')).default;
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('112233', salt);

      await prisma.customerOtp.create({
        data: {
          restaurantId,
          phone: '+919999933333',
          name: 'Expired User',
          otpHash: hash,
          expiresAt: new Date(Date.now() - 1000), // expired 1s ago
          resendAfter: new Date(Date.now() - 1000),
          attempts: 0,
          maxAttempts: 5,
          isUsed: false,
        },
      });

      const res = await request.post('/api/customer/auth/verify-otp').send({
        restaurantSlug: 'demo-cafe',
        phone: '+919999933333',
        otp: '112233',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/expired/i);
    });

    it('blocks verification after 5 failed attempts (429 Too Many Requests)', async () => {
      const testPhone = '+919999933333';
      const bcrypt = (await import('bcryptjs')).default;
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('998877', salt);

      await prisma.customerOtp.create({
        data: {
          restaurantId,
          phone: testPhone,
          name: 'Brute Force Target',
          otpHash: hash,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          resendAfter: new Date(Date.now() - 1000),
          attempts: 5, // already reached max
          maxAttempts: 5,
          isUsed: false,
        },
      });

      const res = await request.post('/api/customer/auth/verify-otp').send({
        restaurantSlug: 'demo-cafe',
        phone: testPhone,
        otp: '998877',
      });

      expect(res.status).toBe(429);
      expect(res.body.error).toMatch(/too many incorrect attempts/i);
    });

    it('authenticates returning customer B without asking for account creation', async () => {
      const testOtp = '888999';
      const bcrypt = (await import('bcryptjs')).default;
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(testOtp, salt);

      await prisma.customerOtp.create({
        data: {
          restaurantId,
          phone: customerBPhone,
          name: 'Test Customer B',
          otpHash: hash,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          resendAfter: new Date(Date.now() - 1000),
          attempts: 0,
          maxAttempts: 5,
          isUsed: false,
        },
      });

      const res = await request.post('/api/customer/auth/verify-otp').send({
        restaurantSlug: 'demo-cafe',
        phone: customerBPhone,
        otp: testOtp,
      });

      expect(res.status).toBe(200);
      expect(res.body.customer.name).toBe('Test Customer B');
      expect(res.body.customer.phone).toBe(customerBPhone);

      customerBToken = res.body.token;
      customerBId = res.body.customer.id;
    });
  });

  // ============================================================
  // 4. CUSTOMER PROFILE (/api/customer/auth/me)
  // ============================================================
  describe('GET /api/customer/auth/me', () => {
    it('returns current customer profile with phone and name', async () => {
      const res = await request
        .get('/api/customer/auth/me')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.customer.id).toBe(customerAId);
      expect(res.body.customer.name).toBe('Test Customer A');
      expect(res.body.customer.phone).toBe(customerAPhone);
      expect(res.body.customer.passwordHash).toBeUndefined();
    });

    it('rejects unauthenticated profile request (401 Unauthorized)', async () => {
      const res = await request.get('/api/customer/auth/me');
      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // 5. ORDER CREATION WITH OTP CUSTOMER TOKEN
  // ============================================================
  describe('Order Creation & Table Session Integration', () => {
    it('creates Order A bound to verified Customer A and Table 01', async () => {
      // Get table session token
      const menuRes = await request.get(`/api/menu/demo-cafe/t/${tableToken}`);
      const sessionToken = menuRes.body.tableSessionToken;

      const orderRes = await request
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          tableSessionToken: sessionToken,
          restaurantSlug: 'demo-cafe',
          tableToken,
          items: [{ menuItemId, quantity: 1, specialInstructions: 'Hot' }],
        });

      expect(orderRes.status).toBe(201);
      expect(orderRes.body.orderToken).toBeDefined();

      orderAToken = orderRes.body.orderToken;

      // Simulate payment
      await request.post('/api/payments/sandbox-simulate').send({ orderToken: orderAToken });

      // Check order in DB
      const dbOrder = await prisma.order.findUnique({
        where: { orderToken: orderAToken },
      });
      expect(dbOrder).toBeDefined();
      expect(dbOrder!.customerId).toBe(customerAId);
      expect(dbOrder!.customerName).toBe('Test Customer A');
      expect(dbOrder!.customerPhone).toBe(customerAPhone);
      orderAId = dbOrder!.id;
    });

    it('creates Order B bound to Customer B', async () => {
      const menuRes = await request.get(`/api/menu/demo-cafe/t/${tableToken}`);
      const sessionToken = menuRes.body.tableSessionToken;

      const orderRes = await request
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerBToken}`)
        .send({
          tableSessionToken: sessionToken,
          restaurantSlug: 'demo-cafe',
          tableToken,
          items: [{ menuItemId, quantity: 2 }],
        });

      expect(orderRes.status).toBe(201);
      orderBToken = orderRes.body.orderToken;

      await request.post('/api/payments/sandbox-simulate').send({ orderToken: orderBToken });

      const dbOrder = await prisma.order.findUnique({
        where: { orderToken: orderBToken },
      });
      expect(dbOrder!.customerId).toBe(customerBId);
      orderBId = dbOrder!.id;
    });
  });

  // ============================================================
  // 6. CUSTOMER ORDER HISTORY & OWNERSHIP ISOLATION
  // ============================================================
  describe('Customer Order History & Ownership Security', () => {
    it('Customer A order history returns ONLY Order A', async () => {
      const res = await request
        .get('/api/customer/orders')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const orderIds = res.body.map((o: any) => o.id);
      expect(orderIds).toContain(orderAId);
      expect(orderIds).not.toContain(orderBId); // STRICT ISOLATION
    });

    it('Customer A cannot access Customer B order by orderId (404 Not Found)', async () => {
      const res = await request
        .get(`/api/customer/orders/${orderBId}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('Customer A can access own order by orderId (200 OK)', async () => {
      const res = await request
        .get(`/api/customer/orders/${orderAId}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(orderAId);
      expect(res.body.customerPhone).toBe(customerAPhone);
    });

    it('Active orders returns Order A for Customer A', async () => {
      const res = await request
        .get('/api/customer/orders/active')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.orders[0].id).toBe(orderAId);
    });
  });

  // ============================================================
  // 7. RBAC PRIVILEGE ISOLATION: CUSTOMER CANNOT ACCESS ADMIN ROUTES
  // ============================================================
  describe('RBAC Customer Privilege Segregation', () => {
    it('Customer token is rejected from /api/admin/orders/live (403 Forbidden)', async () => {
      const res = await request
        .get('/api/admin/orders/live')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(403);
    });

    it('Customer token is rejected from /api/admin/analytics (403 Forbidden)', async () => {
      const res = await request
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(403);
    });

    it('Customer token is rejected from /api/admin/staff (403 Forbidden)', async () => {
      const res = await request
        .get('/api/admin/staff')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ============================================================
  // 8. DEVELOPMENT OTP PROVIDER PRODUCTION GUARD
  // ============================================================
  describe('OTP Provider Security Invariant', () => {
    it('DevelopmentOtpProvider strictly throws when NODE_ENV=production', () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        expect(() => new DevelopmentOtpProvider()).toThrow(/cannot be used in a production environment/i);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  // ============================================================
  // 9. STAFF & MANAGER LOGIN INTEGRITY
  // ============================================================
  describe('Staff & Manager Email/Password Authentication Integrity', () => {
    it('Manager login continues to work with email + password', async () => {
      const res = await request.post('/api/auth/login').send({
        email: 'admin@democafe.com',
        password: 'admin123',
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(['ADMIN', 'MANAGER']).toContain(res.body.user.role);
    });

    it('Staff login continues to work with email + password', async () => {
      const res = await request.post('/api/auth/login').send({
        email: 'staff@democafe.com',
        password: 'staff123',
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('STAFF');
    });
  });
});
