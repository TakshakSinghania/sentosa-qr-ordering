import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/index.js';
import { prisma } from '../src/utils/prisma.js';
import { DemoOtpProvider } from '../src/services/otp/demoProvider.js';
import { DevelopmentOtpProvider } from '../src/services/otp/developmentProvider.js';
import { ProductionSmsOtpProvider } from '../src/services/otp/productionSmsProvider.js';
import { getOtpProvider, resetOtpProviderForTesting } from '../src/services/otp/index.js';

const request = supertest(app);

describe('Recruiter Demo OTP Architecture & Provider Test Suite', () => {
  const originalEnv = { ...process.env };
  const demoPhoneRaw = '9999999999';
  const demoPhoneNormalized = '+919999999999';
  const demoCode = '123456';
  const nonDemoPhone = '8888888888';
  let restaurantId: string;

  beforeAll(async () => {
    const rest = await prisma.restaurant.findUnique({
      where: { slug: 'demo-cafe' },
    });
    if (!rest) {
      throw new Error('Database missing demo-cafe');
    }
    restaurantId = rest.id;

    // Clean up test phone records
    await prisma.customerOtp.deleteMany({
      where: { phone: { in: [demoPhoneNormalized, '+918888888888'] } },
    });
  });

  afterAll(async () => {
    process.env = originalEnv;
    resetOtpProviderForTesting();

    await prisma.customerOtp.deleteMany({
      where: { phone: { in: [demoPhoneNormalized, '+918888888888'] } },
    });
    await prisma.customer.deleteMany({
      where: { phone: { in: [demoPhoneNormalized, '+918888888888'] } },
    });
  });

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.DEMO_OTP_PHONE = demoPhoneRaw;
    process.env.DEMO_OTP_CODE = demoCode;
    process.env.OTP_PROVIDER = 'demo';
    resetOtpProviderForTesting();
  });

  describe('1. Unit Tests: DemoOtpProvider Behavior', () => {
    it('accepts configured demo phone number and returns configured fixed OTP code', () => {
      const provider = new DemoOtpProvider();
      const resolved = provider.resolveOtpCode(demoPhoneRaw, '654321');
      expect(resolved).toBe(demoCode);

      const resolvedCanonical = provider.resolveOtpCode(demoPhoneNormalized, '654321');
      expect(resolvedCanonical).toBe(demoCode);
    });

    it('rejects any non-demo phone number in resolveOtpCode', () => {
      const provider = new DemoOtpProvider();
      expect(() => {
        provider.resolveOtpCode(nonDemoPhone, '654321');
      }).toThrow(/not enabled for recruiter demo access/i);
    });

    it('sendOtp succeeds for configured demo phone without leaking code in result', async () => {
      const provider = new DemoOtpProvider();
      const result = await provider.sendOtp({
        phone: demoPhoneNormalized,
        otp: demoCode,
        restaurantName: 'Sentosa',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('sendOtp rejects non-demo phone number with safe error message', async () => {
      const provider = new DemoOtpProvider();
      const result = await provider.sendOtp({
        phone: '+918888888888',
        otp: demoCode,
        restaurantName: 'Sentosa',
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/unavailable for this number/i);
    });

    it('throws configuration error if DEMO_OTP_PHONE is missing or invalid', () => {
      delete process.env.DEMO_OTP_PHONE;
      expect(() => new DemoOtpProvider()).toThrow(/DEMO_OTP_PHONE/i);

      process.env.DEMO_OTP_PHONE = '123'; // invalid phone
      expect(() => new DemoOtpProvider()).toThrow(/DEMO_OTP_PHONE/i);
    });

    it('throws configuration error if DEMO_OTP_CODE is not exactly 6 digits', () => {
      process.env.DEMO_OTP_PHONE = demoPhoneRaw;
      process.env.DEMO_OTP_CODE = '12345'; // 5 digits
      expect(() => new DemoOtpProvider()).toThrow(/DEMO_OTP_CODE/i);

      process.env.DEMO_OTP_CODE = 'abcdef'; // non-numeric
      expect(() => new DemoOtpProvider()).toThrow(/DEMO_OTP_CODE/i);
    });
  });

  describe('2. Unit Tests: Development & Production Providers Invariants', () => {
    it('DevelopmentOtpProvider returns the generated OTP', () => {
      const devProvider = new DevelopmentOtpProvider();
      const generated = '789123';
      const resolved = devProvider.resolveOtpCode('+919876543210', generated);
      expect(resolved).toBe(generated);
    });

    it('ProductionSmsOtpProvider returns the generated OTP', () => {
      const prodProvider = new ProductionSmsOtpProvider();
      const generated = '321987';
      const resolved = prodProvider.resolveOtpCode('+919876543210', generated);
      expect(resolved).toBe(generated);
    });

    it('Factory blocks OTP_PROVIDER=development when NODE_ENV=production', () => {
      process.env.NODE_ENV = 'production';
      process.env.OTP_PROVIDER = 'development';
      resetOtpProviderForTesting();

      expect(() => getOtpProvider()).toThrow(/SECURITY VIOLATION/i);

      process.env.NODE_ENV = 'test';
      resetOtpProviderForTesting();
    });

    it('Factory allows OTP_PROVIDER=demo in production environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.OTP_PROVIDER = 'demo';
      process.env.DEMO_OTP_PHONE = demoPhoneRaw;
      process.env.DEMO_OTP_CODE = demoCode;
      resetOtpProviderForTesting();

      const provider = getOtpProvider();
      expect(provider).toBeInstanceOf(DemoOtpProvider);

      process.env.NODE_ENV = 'test';
      resetOtpProviderForTesting();
    });
  });

  describe('3. Integration Flow: Demo OTP API Endpoints', () => {
    beforeEach(() => {
      process.env.OTP_PROVIDER = 'demo';
      process.env.DEMO_OTP_PHONE = demoPhoneRaw;
      process.env.DEMO_OTP_CODE = demoCode;
      resetOtpProviderForTesting();
    });

    it('GET /api/customer/auth/demo-config returns public demo credentials when OTP_PROVIDER=demo', async () => {
      const res = await request.get('/api/customer/auth/demo-config');
      expect(res.status).toBe(200);
      expect(res.body.demoMode).toBe(true);
      expect(res.body.demoPhone).toBe(demoPhoneRaw);
      expect(res.body.demoCode).toBe(demoCode);
    });

    it('GET /api/customer/auth/demo-config returns demoMode=false when OTP_PROVIDER=development', async () => {
      process.env.OTP_PROVIDER = 'development';
      resetOtpProviderForTesting();

      const res = await request.get('/api/customer/auth/demo-config');
      expect(res.status).toBe(200);
      expect(res.body.demoMode).toBe(false);
      expect(res.body.demoPhone).toBeUndefined();
    });

    it('POST /api/customer/auth/send-otp hashes and persists demo OTP, never returning it in response', async () => {
      // Clean up previous OTPs
      await prisma.customerOtp.deleteMany({ where: { phone: demoPhoneNormalized } });

      const res = await request.post('/api/customer/auth/send-otp').send({
        restaurantId,
        phone: demoPhoneRaw,
        name: 'Demo Recruiter',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Security check: response MUST NOT contain the code
      expect(res.body.otp).toBeUndefined();
      expect(res.body.code).toBeUndefined();

      // Database check: verify record is saved with bcrypt hash of demoCode
      const savedOtp = await prisma.customerOtp.findFirst({
        where: {
          restaurantId,
          phone: demoPhoneNormalized,
          isUsed: false,
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(savedOtp).toBeDefined();
      expect(savedOtp!.attempts).toBe(0);
      const isMatch = await bcrypt.compare(demoCode, savedOtp!.otpHash);
      expect(isMatch).toBe(true);
    }, 15000);

    it('POST /api/customer/auth/send-otp rejects unauthorized phone numbers in demo mode', async () => {
      const res = await request.post('/api/customer/auth/send-otp').send({
        restaurantId,
        phone: nonDemoPhone,
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not enabled for recruiter demo/i);
    }, 15000);

    it('POST /api/customer/auth/verify-otp rejects incorrect verification code', async () => {
      await prisma.customerOtp.deleteMany({ where: { phone: demoPhoneNormalized } });
      await request.post('/api/customer/auth/send-otp').send({
        restaurantId,
        phone: demoPhoneRaw,
        name: 'Recruiter Jane',
      });

      const failRes = await request.post('/api/customer/auth/verify-otp').send({
        restaurantId,
        phone: demoPhoneRaw,
        otp: '999999',
      });
      expect(failRes.status).toBe(400);
      expect(failRes.body.error).toMatch(/doesn't look right|invalid/i);
    }, 15000);

    it('POST /api/customer/auth/verify-otp successfully authenticates with demo code', async () => {
      await prisma.customerOtp.deleteMany({ where: { phone: demoPhoneNormalized } });
      await request.post('/api/customer/auth/send-otp').send({
        restaurantId,
        phone: demoPhoneRaw,
        name: 'Recruiter Jane',
      });

      const successRes = await request.post('/api/customer/auth/verify-otp').send({
        restaurantId,
        phone: demoPhoneRaw,
        otp: demoCode,
      });

      expect(successRes.status).toBe(200);
      expect(successRes.body.token).toBeDefined();
      expect(successRes.body.customer.phone).toBe(demoPhoneNormalized);

      // Invalidation check: OTP is now marked as used
      const usedOtp = await prisma.customerOtp.findFirst({
        where: { restaurantId, phone: demoPhoneNormalized },
        orderBy: { createdAt: 'desc' },
      });
      expect(usedOtp!.isUsed).toBe(true);
    }, 15000);
  });
});
