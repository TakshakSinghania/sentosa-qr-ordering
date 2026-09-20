import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://takshak@localhost:5432/qr_cafe',
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-cafe-qr-system-2025-very-long',
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:4000',
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_demokey12345',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'demosecretkey1234567890',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'demowebhooksecret12345',
    mockSandbox:
      process.env.RAZORPAY_MOCK_SANDBOX === 'true' ||
      !process.env.RAZORPAY_KEY_ID ||
      process.env.RAZORPAY_KEY_ID.includes('demokey') ||
      process.env.RAZORPAY_KEY_ID.includes('placeholder'),
  },
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : [],
};
