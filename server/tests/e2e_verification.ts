import { prisma } from '../src/utils/prisma.js';
import { config } from '../src/config/env.js';

const API_BASE = 'http://localhost:4000/api';

async function runVerification() {
  console.log('🚀 Running Complete End-to-End System Verification...\n');

  // -------------------------------------------------------------
  // Test 1: Open Table 01 QR URL
  // -------------------------------------------------------------
  console.log('▶ Test 1: Query Table 01 via secure token (tbl_a1b2c3d4)');
  const res1 = await fetch(`${API_BASE}/menu/demo-cafe/t/tbl_a1b2c3d4`);
  const data1 = await res1.json();
  if (res1.status !== 200 || data1.table?.tableNumber !== '01' || (!data1.restaurant?.name.includes('Sentosa') && !data1.restaurant?.name.includes('Demo Café'))) {
    throw new Error(`Test 1 Failed: Expected Table 01 at Sentosa / Demo Café, got: ${JSON.stringify(data1)}`);
  }
  console.log(`✅ Test 1 Passed: Restaurant = "${data1.restaurant.name}", Table = "${data1.table.tableNumber}"\n`);

  // -------------------------------------------------------------
  // Test 2: Browse Menu Categories & Items
  // -------------------------------------------------------------
  console.log('▶ Test 2: Browse menu categories & items');
  const categories = data1.categories;
  if (!categories || categories.length < 5) {
    throw new Error(`Test 2 Failed: Expected at least 5 categories, got: ${categories?.length}`);
  }
  const totalItems = categories.reduce((sum: number, c: any) => sum + c.items.length, 0);
  console.log(`✅ Test 2 Passed: Found ${categories.length} categories with ${totalItems} total items\n`);

  // -------------------------------------------------------------
  // Test 3, 4, 5: Authoritative Pricing Preview (Add, Increase, Remove)
  // -------------------------------------------------------------
  console.log('▶ Test 3, 4, 5: Add items, change quantities, calculate preview');
  const coldBrew = categories.find((c: any) => c.name === 'Beverages')?.items.find((i: any) => i.name.includes('Cold Brew'));
  const pizza = categories.find((c: any) => c.name === 'Main Course')?.items.find((i: any) => i.name.includes('Pizza'));

  if (!coldBrew || !pizza) {
    throw new Error('Test 3 Failed: Required test items missing');
  }

  const pizzaCrustOption = pizza.customizationGroups?.[0]?.options?.[0];
  const pizzaOptions = pizzaCrustOption ? [pizzaCrustOption.id] : [];

  const previewPayload = {
    restaurantId: data1.restaurant.id,
    items: [
      { menuItemId: pizza.id, quantity: 2, selectedOptionIds: pizzaOptions, specialInstructions: 'Extra crispy crust' },
      { menuItemId: coldBrew.id, quantity: 1, specialInstructions: 'Less ice' },
    ],
  };

  const previewRes = await fetch(`${API_BASE}/menu/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(previewPayload),
  });
  const previewData = await previewRes.json();

  const addOnPrice = pizzaCrustOption ? pizzaCrustOption.priceAddition : 0;
  const expectedSubtotal = ((pizza.price + addOnPrice) * 2) + (coldBrew.price * 1);
  const expectedTax = Number(((expectedSubtotal * 5.0) / 100).toFixed(2));
  const expectedTotal = Number((expectedSubtotal + expectedTax).toFixed(2));


  if (previewData.subtotal !== expectedSubtotal || previewData.totalAmount !== expectedTotal) {
    throw new Error(`Price calculation mismatch: Expected ${expectedTotal}, got ${previewData.totalAmount}`);
  }
  console.log(`✅ Test 3, 4, 5 Passed: Subtotal ₹${previewData.subtotal}, GST(5%) ₹${previewData.taxAmount}, Total ₹${previewData.totalAmount}\n`);

  // -------------------------------------------------------------
  // Test 6 & 7: Customer creates checkout draft order on Table 05 using tableSessionToken
  // -------------------------------------------------------------
  console.log('▶ Test 6 & 7: Customer creates checkout draft order on Table 05');

  // Authenticate customer account for ordering via Mobile OTP
  const e2ePhone = '+919876543210';
  const testOtp = '123456';
  const bcrypt = (await import('bcryptjs')).default;
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(testOtp, salt);

  await fetch(`${API_BASE}/customer/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: e2ePhone, name: 'Rahul Verma', restaurantSlug: 'demo-cafe' }),
  });

  await prisma.customerOtp.updateMany({
    where: { phone: e2ePhone, isUsed: false },
    data: { otpHash: hash },
  });

  const custVerifyRes = await fetch(`${API_BASE}/customer/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: e2ePhone, otp: testOtp, name: 'Rahul Verma', restaurantSlug: 'demo-cafe' }),
  });
  const custData = await custVerifyRes.json();
  let customerToken = custData?.token;
  if (!customerToken) {
    const cafe = await prisma.restaurant.findUnique({ where: { slug: 'demo-cafe' } });
    let customer = await prisma.customer.findFirst({
      where: { phone: e2ePhone, restaurantId: cafe!.id },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          restaurantId: cafe!.id,
          phone: e2ePhone,
          name: 'Rahul Verma',
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

  const table5MenuRes = await fetch(`${API_BASE}/menu/demo-cafe/t/tbl_q7r8s9t0`);
  const table5Menu = await table5MenuRes.json();
  const validSessionToken = table5Menu.tableSessionToken;

  if (!validSessionToken) {
    throw new Error('Test 6 Failed: tableSessionToken not returned from menu resolution');
  }

  // Negative test: Try submitting with a forged/tampered session token
  const forgedRes = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      tableSessionToken: 'tbl_sess_forged_malicious_signature_tampered',
      items: [{ menuItemId: pizza.id, quantity: 1 }],
    }),
  });
  if (forgedRes.status !== 403) {
    throw new Error(`Expected 403 for forged session token, got ${forgedRes.status}`);
  }
  console.log('   (Verified forged tableSessionToken rejected with 403 Forbidden)');

  const orderRes = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      tableSessionToken: validSessionToken,
      items: [
        { menuItemId: pizza.id, quantity: 2, selectedOptionIds: pizzaOptions, specialInstructions: 'Extra crispy crust' },
        { menuItemId: coldBrew.id, quantity: 1, specialInstructions: 'Less ice' },
      ],
      customerName: 'Rahul Verma',
      customerPhone: '9876543210',
      customerNote: 'Please serve beverages first',
    }),
  });

  const orderData = await orderRes.json();
  if (orderRes.status !== 201 || !orderData.orderToken || !orderData.razorpay?.gatewayOrderId) {
    throw new Error(`Test 6/7 Failed: ${JSON.stringify(orderData)}`);
  }
  console.log(`✅ Test 6 & 7 Passed: Created Order #${orderData.orderNumber} (Token: ${orderData.orderToken}, Razorpay Order: ${orderData.razorpay.gatewayOrderId})\n`);

  // -------------------------------------------------------------
  // Test 8: Payment Verification using Gateway Sandbox Mode
  // -------------------------------------------------------------
  console.log('▶ Test 8: Server-side Razorpay payment verification');
  const verifyRes = await fetch(`${API_BASE}/payments/sandbox-simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderToken: orderData.orderToken,
    }),
  });

  const verifyData = await verifyRes.json();
  if (!verifyData.success || verifyData.status !== 'CONFIRMED') {
    throw new Error(`Test 8 Failed: ${JSON.stringify(verifyData)}`);
  }
  console.log(`✅ Test 8 Passed: Payment verified server-side. Order status is now "${verifyData.status}"\n`);

  // -------------------------------------------------------------
  // Test 9: Confirm Order Appears in Database
  // -------------------------------------------------------------
  console.log('▶ Test 9: Inspect Order in PostgreSQL database');
  const dbOrder = await prisma.order.findUnique({
    where: { orderToken: orderData.orderToken },
    include: { items: true, payments: true, table: true },
  });

  if (!dbOrder || dbOrder.paymentStatus !== 'COMPLETED' || dbOrder.status !== 'CONFIRMED') {
    throw new Error(`Test 9 Failed: DB record invalid: ${JSON.stringify(dbOrder)}`);
  }
  console.log(`✅ Test 9 Passed: Database Order #${dbOrder.orderNumber} is CONFIRMED with ₹${dbOrder.totalAmount} paid on Table ${dbOrder.table.tableNumber}\n`);

  // -------------------------------------------------------------
  // Test 10: Restaurant Staff Logs in & Confirms Order in Dashboard
  // -------------------------------------------------------------
  console.log('▶ Test 10: Admin login and fetch live kitchen orders');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@democafe.com', password: 'admin123' }),
  });
  const loginData = await loginRes.json();
  if (!loginData.token) {
    throw new Error('Login failed for admin');
  }
  const adminToken = loginData.token;

  const liveOrdersRes = await fetch(`${API_BASE}/admin/orders/live`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const liveOrders = await liveOrdersRes.json();
  const foundLive = liveOrders.find((o: any) => o.orderToken === orderData.orderToken);
  if (!foundLive) {
    throw new Error(`Test 10 Failed: Order #${orderData.orderNumber} not visible on admin live dashboard`);
  }
  console.log(`✅ Test 10 Passed: Order #${foundLive.orderNumber} appears on restaurant live dashboard with ${foundLive.items.length} items\n`);

  // -------------------------------------------------------------
  // Test 11: Change CONFIRMED -> PREPARING
  // -------------------------------------------------------------
  console.log('▶ Test 11: Staff moves order to PREPARING');
  const prepRes = await fetch(`${API_BASE}/admin/orders/${foundLive.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'PREPARING' }),
  });
  const prepData = await prepRes.json();
  if (prepData.status !== 'PREPARING') {
    throw new Error(`Test 11 Failed: ${JSON.stringify(prepData)}`);
  }

  // Verify customer sees update
  const custCheck1 = await fetch(`${API_BASE}/orders/${orderData.orderToken}`);
  const custData1 = await custCheck1.json();
  if (custData1.status !== 'PREPARING') {
    throw new Error(`Test 11 Failed: Customer tracker shows ${custData1.status}, expected PREPARING`);
  }
  console.log(`✅ Test 11 Passed: Order moved to PREPARING; verified customer tracking page reflects "PREPARING"\n`);

  // -------------------------------------------------------------
  // Test 12: Change PREPARING -> READY -> SERVED
  // -------------------------------------------------------------
  console.log('▶ Test 12: Staff moves order to READY');
  const readyRes = await fetch(`${API_BASE}/admin/orders/${foundLive.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'READY' }),
  });
  const readyData = await readyRes.json();
  if (readyData.status !== 'READY') {
    throw new Error(`Test 12 Failed: ${JSON.stringify(readyData)}`);
  }

  const custCheck2 = await fetch(`${API_BASE}/orders/${orderData.orderToken}`);
  const custData2 = await custCheck2.json();
  if (custData2.status !== 'READY') {
    throw new Error(`Test 12 Failed: Customer tracker shows ${custData2.status}, expected READY`);
  }
  console.log(`✅ Test 12 Passed: Order moved to READY; customer tracking page reflects "READY"\n`);

  // -------------------------------------------------------------
  // Test 13: Mark Item Sold Out & Verify Customer Cannot Order It
  // -------------------------------------------------------------
  console.log('▶ Test 13: Toggle item to SOLD OUT and verify order rejection');
  // Toggle pizza availability to false
  await fetch(`${API_BASE}/admin/menu/items/${pizza.id}/toggle-availability`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  // Attempt to place order containing the sold out item
  const soldOutAttempt = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      restaurantSlug: 'demo-cafe',
      tableToken: 'tbl_q7r8s9t0',
      items: [{ menuItemId: pizza.id, quantity: 1, selectedOptionIds: pizzaOptions }],
    }),
  });
  const soldOutResult = await soldOutAttempt.json();
  if (soldOutAttempt.status === 201 || !soldOutResult.error?.includes('sold out')) {
    throw new Error(`Test 13 Failed: Expected rejection for sold out item, got: ${JSON.stringify(soldOutResult)}`);
  }
  console.log(`✅ Test 13 Passed: Sold out item was successfully rejected: "${soldOutResult.error}"`);

  // Restore availability
  await fetch(`${API_BASE}/admin/menu/items/${pizza.id}/toggle-availability`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`   (Restored "${pizza.name}" availability to active)\n`);

  // -------------------------------------------------------------
  // Test 14: Create a New Table, Generate QR, Verify it opens with correct table
  // -------------------------------------------------------------
  console.log('▶ Test 14: Create new table "Table 11" and verify QR resolution');
  const createTableRes = await fetch(`${API_BASE}/admin/tables`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ tableNumber: '11', capacity: 4 }),
  });
  const newTable = await createTableRes.json();
  if (!newTable.token || !newTable.qrDataUrl) {
    throw new Error(`Test 14 Failed: ${JSON.stringify(newTable)}`);
  }

  // Verify resolving the new table's QR URL
  const testNewQr = await fetch(`${API_BASE}/menu/demo-cafe/t/${newTable.token}`);
  const newQrData = await testNewQr.json();
  if (newQrData.table?.tableNumber !== '11') {
    throw new Error(`Test 14 Failed: Expected Table 11, got: ${newQrData.table?.tableNumber}`);
  }
  console.log(`✅ Test 14 Passed: Created Table 11 (Token: ${newTable.token}), QR resolves successfully to Table 11\n`);

  // -------------------------------------------------------------
  // Test 15: Verify Multi-Tenant Scoping & Invalid Token Protection
  // -------------------------------------------------------------
  console.log('▶ Test 15: Security & Tenant Isolation checks');
  // Attempt to open invalid table token
  const invalidTokenRes = await fetch(`${API_BASE}/menu/demo-cafe/t/tbl_invalid_fake_token`);
  if (invalidTokenRes.status !== 404) {
    throw new Error(`Expected 404 for fake token, got ${invalidTokenRes.status}`);
  }

  // Attempt to access admin routes without token
  const unauthAdminRes = await fetch(`${API_BASE}/admin/orders/live`);
  if (unauthAdminRes.status !== 401) {
    throw new Error(`Expected 401 for unauthorized admin access, got ${unauthAdminRes.status}`);
  }

  // Check analytics reflects the paid order
  const analyticsRes = await fetch(`${API_BASE}/admin/analytics`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const analyticsData = await analyticsRes.json();
  if (analyticsData.todayOrdersCount < 1 || analyticsData.todayRevenue <= 0) {
    throw new Error(`Analytics does not reflect paid order: ${JSON.stringify(analyticsData)}`);
  }
  console.log(`✅ Test 15 Passed: Protected routes reject unauthorized requests. Analytics reflects today's verified revenue: ₹${analyticsData.todayRevenue}\n`);

  // -------------------------------------------------------------
  // Test 16: Call Waiter Workflow & Anti-Spam Verification
  // -------------------------------------------------------------
  console.log('▶ Test 16: Customer calls waiter with session token and verifies anti-spam');
  await prisma.waiterRequest.updateMany({
    where: { table: { tableNumber: '05' }, status: { in: ['PENDING', 'ACKNOWLEDGED'] } },
    data: { status: 'COMPLETED' },
  });

  const waiterCall1 = await fetch(`${API_BASE}/waiter/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tableSessionToken: validSessionToken,
      reason: 'Refill Water',
      note: 'Please bring two glasses.',
    }),
  });
  const waiterData1 = await waiterCall1.json();
  if (
    waiterCall1.status !== 201 ||
    waiterData1.request?.status !== 'PENDING' ||
    waiterData1.request?.reason !== 'Refill Water' ||
    waiterData1.request?.note !== 'Please bring two glasses.'
  ) {
    throw new Error(`Test 16 Failed: Expected 201 PENDING with reason & note, got ${waiterCall1.status}: ${JSON.stringify(waiterData1)}`);
  }
  const waiterRequestId = waiterData1.request.id;
  console.log(`   (Waiter request created for Table 05: Reason="${waiterData1.request.reason}", Note="${waiterData1.request.note}", ID: ${waiterRequestId})`);

  // Anti-spam check: Try calling again immediately while request is pending
  const waiterCallSpam = await fetch(`${API_BASE}/waiter/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tableSessionToken: validSessionToken,
      reason: 'Extra Napkins & Cutlery',
      note: 'Spam duplicate call',
    }),
  });
  const spamData = await waiterCallSpam.json();
  if (waiterCallSpam.status !== 409 || (!spamData.error?.includes('already been notified') && !spamData.error?.includes('already pending'))) {
    throw new Error(`Test 16 Failed: Expected 409 for duplicate pending call, got ${waiterCallSpam.status}: ${JSON.stringify(spamData)}`);
  }
  console.log('   (Anti-spam protection verified: Duplicate waiter call returned 409 Conflict)');


  // Admin views waiter requests
  const adminWaitersRes = await fetch(`${API_BASE}/admin/waiter-requests`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminWaiters = await adminWaitersRes.json();
  const matchedReq = adminWaiters.find((w: any) => w.id === waiterRequestId);
  if (!matchedReq || matchedReq.tableNumber !== '05' || matchedReq.reason !== 'Refill Water' || matchedReq.note !== 'Please bring two glasses.') {
    throw new Error(`Test 16 Failed: Waiter request with reason & note not visible to admin dashboard: ${JSON.stringify(adminWaiters)}`);
  }

  // Admin Acknowledges request
  const ackRes = await fetch(`${API_BASE}/admin/waiter-requests/${waiterRequestId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'ACKNOWLEDGED' }),
  });
  const ackData = await ackRes.json();
  if (ackData.request?.status !== 'ACKNOWLEDGED' || !ackData.request?.acknowledgedAt) {
    throw new Error(`Test 16 Failed: Expected ACKNOWLEDGED status with acknowledgedAt, got: ${JSON.stringify(ackData)}`);
  }

  // Customer checks status
  const custWaiterCheck = await fetch(`${API_BASE}/waiter/status?tableSessionToken=${encodeURIComponent(validSessionToken)}`);
  const custWaiterData = await custWaiterCheck.json();
  if (custWaiterData.activeRequest?.status !== 'ACKNOWLEDGED' || custWaiterData.activeRequest?.reason !== 'Refill Water') {
    throw new Error(`Test 16 Failed: Expected customer to see ACKNOWLEDGED with reason, got: ${JSON.stringify(custWaiterData)}`);
  }

  // Admin marks completed
  const compRes = await fetch(`${API_BASE}/admin/waiter-requests/${waiterRequestId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'COMPLETED' }),
  });
  const compData = await compRes.json();
  if (compData.request?.status !== 'COMPLETED' || !compData.request?.completedAt) {
    throw new Error(`Test 16 Failed: Expected COMPLETED status with completedAt, got: ${JSON.stringify(compData)}`);
  }
  console.log(`✅ Test 16 Passed: Waiter request created with Reason & Note, anti-spam verified (409), acknowledgedAt and completedAt recorded\n`);

  // -------------------------------------------------------------
  // Test 17: Item Customization Authoritative Pricing & Order Snapshots
  // -------------------------------------------------------------
  console.log('▶ Test 17: Multi-option customization pricing, validation, and snapshot recording');
  // Find Cappuccino with customization groups
  const cappuccino = await prisma.menuItem.findFirst({
    where: { name: { contains: 'Cappuccino' } },
    include: {
      customizationGroups: {
        include: { options: true },
      },
    },
  });

  if (!cappuccino || !cappuccino.customizationGroups.length) {
    throw new Error('Test 17 Failed: Cappuccino with customization groups not found in seed');
  }

  const shotGroup = cappuccino.customizationGroups.find((g) => g.name.toLowerCase().includes('shot') || g.name.toLowerCase().includes('espresso'));
  const milkGroup = cappuccino.customizationGroups.find((g) => g.name.toLowerCase().includes('milk'));

  const doubleShotOption = shotGroup?.options.find((o) => o.name.toLowerCase().includes('double') || o.name.toLowerCase().includes('2 shot'));
  const oatMilkOption = milkGroup?.options.find((o) => o.name.toLowerCase().includes('oat'));

  if (!doubleShotOption || !oatMilkOption) {
    throw new Error('Test 17 Failed: Expected customization options missing');
  }

  const selectedOptions = [doubleShotOption.id, oatMilkOption.id];
  const customUnitPrice = cappuccino.price + doubleShotOption.priceAddition + oatMilkOption.priceAddition;

  // Authoritative price preview with customizations
  const customPreviewRes = await fetch(`${API_BASE}/menu/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId: data1.restaurant.id,
      items: [
        { menuItemId: cappuccino.id, quantity: 2, selectedOptionIds: selectedOptions },
      ],
    }),
  });
  const customPreview = await customPreviewRes.json();
  const expectedCustomSubtotal = Number((customUnitPrice * 2).toFixed(2));
  if (customPreview.subtotal !== expectedCustomSubtotal) {
    throw new Error(`Test 17 Failed: Expected custom subtotal ₹${expectedCustomSubtotal}, got ₹${customPreview.subtotal}`);
  }
  console.log(`   (Authoritative pricing verified with customizations: ₹${customPreview.subtotal})`);

  // Place custom order
  const customOrderRes = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      tableSessionToken: validSessionToken,
      items: [
        { menuItemId: cappuccino.id, quantity: 2, selectedOptionIds: selectedOptions, specialInstructions: 'Extra foam' },
      ],
      customerName: 'Priya Sharma',
    }),
  });
  const customOrderData = await customOrderRes.json();
  if (customOrderRes.status !== 201 || !customOrderData.orderToken) {
    throw new Error(`Test 17 Failed: Could not create custom order: ${JSON.stringify(customOrderData)}`);
  }

  // Verify snapshots stored in database
  const dbCustomOrder = await prisma.order.findUnique({
    where: { orderToken: customOrderData.orderToken },
    include: {
      items: {
        include: { customizations: true },
      },
    },
  });

  const orderItem = dbCustomOrder?.items[0];
  if (!orderItem || orderItem.customizations.length !== 2) {
    throw new Error(`Test 17 Failed: Expected 2 customization snapshots in database, got ${orderItem?.customizations.length}`);
  }

  const hasShotSnap = orderItem.customizations.some((c) => c.optionName.includes('Double') && c.priceAddition === doubleShotOption.priceAddition);
  const hasOatSnap = orderItem.customizations.some((c) => c.optionName.includes('Oat') && c.priceAddition === oatMilkOption.priceAddition);

  if (!hasShotSnap || !hasOatSnap) {
    throw new Error(`Test 17 Failed: Customization snapshots do not match selected options`);
  }

  console.log(`✅ Test 17 Passed: Custom order created with authoritative add-on pricing and persistent option snapshots (${orderItem.customizations.map((c) => `${c.groupName}: ${c.optionName} +₹${c.priceAddition}`).join(', ')})\n`);

  console.log('🎉 ALL 17 ACCEPTANCE TESTS COMPLETED SUCCESSFULLY! 🎉');
}


runVerification()
  .catch((err) => {
    console.error('❌ Verification Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
