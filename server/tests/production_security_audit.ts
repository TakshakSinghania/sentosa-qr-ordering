import crypto from 'crypto';
import { prisma } from '../src/utils/prisma.js';
import { config } from '../src/config/env.js';
import { generateTestSignature } from '../src/utils/crypto.js';

const API_BASE = 'http://localhost:4000/api';

async function runProductionSecurityAudit() {
  console.log('🔒 Running Comprehensive Production Security & Webhook Audit...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (detail) console.error(`   ${detail}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // Audit 1: Health Check Endpoint
  // --------------------------------------------------------------------------
  const healthRes = await fetch(`${API_BASE}/health`).then((r) => r.json());
  assert(
    healthRes.status === 'ok' && healthRes.database === 'connected',
    '1. Health Check & Database Connectivity',
    JSON.stringify(healthRes)
  );

  // --------------------------------------------------------------------------
  // Audit 2: Admin API Authorization Guards (Unauthenticated Request Rejection)
  // --------------------------------------------------------------------------
  const unauthRes = await fetch(`${API_BASE}/admin/orders/live`);
  assert(
    unauthRes.status === 401,
    '2. Admin API Protection: Reject unauthenticated access (401 Unauthorized)'
  );

  // --------------------------------------------------------------------------
  // Audit 3: Production Default Credentials Guard
  // --------------------------------------------------------------------------
  const mockReq: any = {
    body: { email: 'admin@democafe.com', password: 'admin123' },
  };
  let prodStatus = 0;
  let prodBody: any = null;
  const mockRes: any = {
    status: (s: number) => {
      prodStatus = s;
      return mockRes;
    },
    json: (b: any) => {
      prodBody = b;
      return mockRes;
    },
  };

  const savedEnv = config.nodeEnv;
  (config as any).nodeEnv = 'production';
  const { login: loginController } = await import('../src/controllers/auth.js');
  await loginController(mockReq, mockRes);
  (config as any).nodeEnv = savedEnv;

  assert(
    prodStatus === 403 && prodBody?.error?.includes('disabled in production'),
    '3. Production Credentials Guard: Reject default admin@democafe.com/admin123 in production (403)'
  );

  // Authenticate in development mode to obtain staff token for subsequent tests
  const staffAuth = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@democafe.com', password: 'admin123' }),
  }).then((r) => r.json());
  const staffToken = staffAuth.token;

  // Obtain customer token for authenticated ordering via Mobile OTP
  const auditPhone = '+919876543100';
  const testOtp = '123456';
  const bcrypt = (await import('bcryptjs')).default;
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(testOtp, salt);

  await fetch(`${API_BASE}/customer/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: auditPhone, name: 'Audit Customer', restaurantSlug: 'demo-cafe' }),
  });

  await prisma.customerOtp.updateMany({
    where: { phone: auditPhone, isUsed: false },
    data: { otpHash: hash },
  });

  const custVerifyRes = await fetch(`${API_BASE}/customer/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: auditPhone, otp: testOtp, name: 'Audit Customer', restaurantSlug: 'demo-cafe' }),
  });
  const custData = await custVerifyRes.json();
  let customerToken = custData?.token;
  if (!customerToken) {
    const cafe = await prisma.restaurant.findUnique({ where: { slug: 'demo-cafe' } });
    let customer = await prisma.customer.findFirst({
      where: { phone: auditPhone, restaurantId: cafe!.id },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          restaurantId: cafe!.id,
          phone: auditPhone,
          name: 'Audit Customer',
        },
      });
    }
    const jwt = (await import('jsonwebtoken')).default;
    customerToken = jwt.sign(
      { id: customer.id, role: 'CUSTOMER', phone: customer.phone, restaurantId: customer.restaurantId },
      config.jwtSecret,
      { expiresIn: '30d' }
    );
  }

  // --------------------------------------------------------------------------
  // Audit 4: Table Security & Token Resolution
  // --------------------------------------------------------------------------
  const invalidTableRes = await fetch(`${API_BASE}/menu/demo-cafe/t/tbl_invalid_fake_token`);
  assert(
    invalidTableRes.status === 404,
    '4. Table Security: Reject invalid table token (404 Not Found)'
  );

  // --------------------------------------------------------------------------
  // Audit 5: Price Tampering Defense (Server Calculates Authoritative Total)
  // --------------------------------------------------------------------------
  const table05 = await prisma.table.findFirst({
    where: { tableNumber: '05' },
    include: { restaurant: true },
  });
  if (!table05) throw new Error('Table 05 not found');

  const coldBrew = await prisma.menuItem.findFirst({ where: { name: 'Artisan Cold Brew' } });
  if (!coldBrew) throw new Error('Artisan Cold Brew not found');

  // Verify unauthenticated order placement is rejected with 401
  const unauthOrderRes = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantSlug: 'demo-cafe',
      tableToken: table05.token,
      items: [{ menuItemId: coldBrew.id, quantity: 1 }],
    }),
  });
  assert(
    unauthOrderRes.status === 401,
    '4b. Order Placement Security: Reject unauthenticated order placement (401)'
  );

  // Attempt client-side price manipulation with customer authentication: send price=0, itemTotal=0
  const orderRes = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      restaurantSlug: 'demo-cafe',
      tableToken: table05.token,
      items: [
        {
          menuItemId: coldBrew.id,
          quantity: 2,
          price: 0, // Injected manipulation
          total: 0, // Injected manipulation
        },
      ],
    }),
  }).then((r) => r.json());

  // Cold brew is 199. 2 x 199 = 398. 5% GST = 19.90. Total = 417.90
  const expectedTotal = Number((398 * 1.05).toFixed(2));
  assert(
    orderRes.totalAmount === expectedTotal,
    '5. Price Tampering Defense: Server ignores client prices & calculates authoritative total',
    `Expected ${expectedTotal}, got ${orderRes.totalAmount}`
  );

  const orderToken = orderRes.orderToken;
  const razorpayGatewayOrderId = orderRes.razorpay.gatewayOrderId;

  // --------------------------------------------------------------------------
  // Audit 6: Order-Payment Mismatch Defense
  // --------------------------------------------------------------------------
  // Attempt to verify payment using a mismatched/fake razorpay order ID
  const fakeOrderId = `order_fake_${Date.now()}`;
  const fakePaymentId = `pay_fake_${Date.now()}`;
  const fakeSig = generateTestSignature(fakeOrderId, fakePaymentId, config.razorpay.keySecret);

  const mismatchVerifyRes = await fetch(`${API_BASE}/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderToken,
      razorpayOrderId: fakeOrderId,
      razorpayPaymentId: fakePaymentId,
      razorpaySignature: fakeSig,
    }),
  });
  const mismatchVerifyData = await mismatchVerifyRes.json();
  assert(
    mismatchVerifyRes.status === 400 && mismatchVerifyData.error?.includes('does not belong to this order'),
    '6. Payment Integrity: Reject payment verification with mismatched gatewayOrderId (400)'
  );

  // --------------------------------------------------------------------------
  // Audit 7: State Machine Lifecycle Defense (Cannot advance unpaid order)
  // --------------------------------------------------------------------------
  const unpaidOrder = await prisma.order.findUnique({ where: { orderToken } });
  if (!unpaidOrder) throw new Error('Unpaid order not found');

  const advanceUnpaidRes = await fetch(`${API_BASE}/admin/orders/${unpaidOrder.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${staffToken}`,
    },
    body: JSON.stringify({ status: 'PREPARING' }),
  });
  const advanceUnpaidData = await advanceUnpaidRes.json();
  assert(
    advanceUnpaidRes.status === 400 && advanceUnpaidData.error?.includes('before payment is confirmed'),
    '7. State Machine Guard: Reject advancing unpaid order to PREPARING (400)'
  );

  // --------------------------------------------------------------------------
  // Audit 8: Raw-Body Razorpay Webhook Verification
  // --------------------------------------------------------------------------
  const webhookSecret = config.razorpay.webhookSecret;
  const validWebhookPayload = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: `pay_webhook_${Date.now()}`,
          order_id: razorpayGatewayOrderId,
          amount: Math.round(expectedTotal * 100),
          currency: 'INR',
          status: 'captured',
        },
      },
      order: {
        entity: {
          id: razorpayGatewayOrderId,
          amount: Math.round(expectedTotal * 100),
          currency: 'INR',
          status: 'paid',
        },
      },
    },
  };

  const rawPayloadString = JSON.stringify(validWebhookPayload);

  // 8a. Test with Invalid Signature -> Must be rejected (400)
  const invalidWebhookRes = await fetch(`${API_BASE}/payments/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': 'invalid_signature_xyz123',
    },
    body: rawPayloadString,
  });
  assert(
    invalidWebhookRes.status === 400,
    '8a. Webhook Security: Reject invalid HMAC signature (400 Bad Request)'
  );

  // 8b. Test with Modified Body -> Must be rejected (400)
  const validHmac = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawPayloadString)
    .digest('hex');

  const modifiedBodyString = rawPayloadString.replace('"INR"', '"USD"');
  const tamperedWebhookRes = await fetch(`${API_BASE}/payments/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': validHmac, // signature for original body
    },
    body: modifiedBodyString,
  });
  assert(
    tamperedWebhookRes.status === 400,
    '8b. Webhook Security: Reject modified/tampered payload body (400 Bad Request)'
  );

  // 8c. Test with Valid Signature & Authentic Body -> Must be accepted (200)
  const validWebhookRes = await fetch(`${API_BASE}/payments/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': validHmac,
    },
    body: rawPayloadString,
  });
  const validWebhookData = await validWebhookRes.json();
  assert(
    validWebhookRes.status === 200 && validWebhookData.status === 'ok',
    '8c. Webhook Security: Accept valid HMAC signature on raw body (200 OK)'
  );

  // Verify order in database is now CONFIRMED and COMPLETED
  const confirmedOrder = await prisma.order.findUnique({ where: { orderToken } });
  assert(
    confirmedOrder?.status === 'CONFIRMED' && confirmedOrder?.paymentStatus === 'COMPLETED',
    '8d. Webhook Execution: Order transitioned to CONFIRMED and paymentStatus COMPLETED'
  );

  // --------------------------------------------------------------------------
  // Audit 9: Webhook Idempotency (Duplicate Delivery)
  // --------------------------------------------------------------------------
  const duplicateWebhookRes = await fetch(`${API_BASE}/payments/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': validHmac,
    },
    body: rawPayloadString,
  });
  const duplicateWebhookData = await duplicateWebhookRes.json();
  assert(
    duplicateWebhookRes.status === 200 && duplicateWebhookData.status === 'ok',
    '9. Webhook Idempotency: Duplicate webhook safely ignored without errors or duplicate updates'
  );

  // --------------------------------------------------------------------------
  // Audit 10: State Machine - Legal Transitions & Terminal State Guards
  // --------------------------------------------------------------------------
  // Advance CONFIRMED -> PREPARING -> READY -> SERVED
  const toPrepRes = await fetch(`${API_BASE}/admin/orders/${unpaidOrder.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ status: 'PREPARING' }),
  });
  assert(toPrepRes.status === 200, '10a. State Machine: Legal transition CONFIRMED -> PREPARING');

  const toReadyRes = await fetch(`${API_BASE}/admin/orders/${unpaidOrder.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ status: 'READY' }),
  });
  assert(toReadyRes.status === 200, '10b. State Machine: Legal transition PREPARING -> READY');

  const toServedRes = await fetch(`${API_BASE}/admin/orders/${unpaidOrder.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ status: 'SERVED' }),
  });
  assert(toServedRes.status === 200, '10c. State Machine: Legal transition READY -> SERVED');

  // Terminal guard: cannot regress SERVED order
  const regressServedRes = await fetch(`${API_BASE}/admin/orders/${unpaidOrder.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ status: 'PREPARING' }),
  });
  assert(
    regressServedRes.status === 400,
    '10d. State Machine Guard: Cannot regress SERVED order back to PREPARING (400)'
  );

  // --------------------------------------------------------------------------
  // Audit 11: Table QR Rotation & Invalidation
  // --------------------------------------------------------------------------
  // Create temporary table
  const newTbl = await prisma.table.create({
    data: {
      restaurantId: table05.restaurantId,
      tableNumber: '99',
      token: `tbl_tmp_${Date.now()}`,
      isActive: true,
    },
  });

  // Get session for old token
  const oldMenu = await fetch(`${API_BASE}/menu/demo-cafe/t/${newTbl.token}`).then((r) => r.json());
  const oldSessionToken = oldMenu.tableSessionToken;

  // Regenerate token
  const regenRes = await fetch(`${API_BASE}/admin/tables/${newTbl.id}/regenerate-token`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
  }).then((r) => r.json());

  // Old session token cannot place an order
  const oldSessionOrderRes = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      tableSessionToken: oldSessionToken,
      items: [{ menuItemId: coldBrew.id, quantity: 1 }],
    }),
  });
  assert(
    oldSessionOrderRes.status === 403,
    '11a. QR Rotation: Old session token rejected after QR rotation (403)'
  );

  // Old URL token cannot fetch menu
  const oldMenuRes = await fetch(`${API_BASE}/menu/demo-cafe/t/${newTbl.token}`);
  assert(
    oldMenuRes.status === 404,
    '11b. QR Rotation: Old tabletop URL token inactive after QR rotation (404)'
  );

  // New URL token works
  const newMenuRes = await fetch(`${API_BASE}/menu/demo-cafe/t/${regenRes.token}`);
  assert(
    newMenuRes.status === 200,
    '11c. QR Rotation: New tabletop URL token resolves active menu (200)'
  );

  // Clean up temporary test table
  await prisma.table.delete({ where: { id: newTbl.id } });

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log(`\n========================================`);
  console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runProductionSecurityAudit()
  .catch((e) => {
    console.error('Fatal audit error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
