import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:4000/api';

async function run() {
  console.log('🧪 Starting Multi-Order Persistence & Customer Flow Verification...\n');

  // 1. Find demo cafe & table 05
  const restaurant = await prisma.restaurant.findUnique({ where: { slug: 'demo-cafe' } });
  if (!restaurant) throw new Error('Demo restaurant not found');

  const table05 = await prisma.table.findFirst({
    where: { restaurantId: restaurant.id, tableNumber: '05' },
  });
  if (!table05) throw new Error('Table 05 not found');

  // Find a couple menu items
  const items = await prisma.menuItem.findMany({
    where: { restaurantId: restaurant.id, isAvailable: true },
    take: 2,
  });
  if (items.length < 2) throw new Error('Need at least 2 items for test');

  // 2. Authenticate customer with Phone + OTP
  const customerPhone = `+91987654${Math.floor(1000 + Math.random() * 9000)}`;
  const testOtp = '123456';
  const bcrypt = (await import('bcryptjs')).default;
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(testOtp, salt);

  const sendRes = await fetch(`${BASE_URL}/customer/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: customerPhone,
      name: 'Aria Montgomery',
      restaurantSlug: 'demo-cafe',
    }),
  });
  if (!sendRes.ok) throw new Error(`send-otp failed: ${await sendRes.text()}`);

  // Set known hash for test verification
  await prisma.customerOtp.updateMany({
    where: { phone: customerPhone, isUsed: false },
    data: { otpHash: hash },
  });

  const verifyRes = await fetch(`${BASE_URL}/customer/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: customerPhone,
      otp: testOtp,
      name: 'Aria Montgomery',
      restaurantSlug: 'demo-cafe',
    }),
  });
  if (!verifyRes.ok) throw new Error(`verify-otp failed: ${await verifyRes.text()}`);
  const authData = (await verifyRes.json()) as any;
  const customerToken = authData.token;
  console.log('✅ Customer verified via Mobile OTP successfully:', authData.customer.name, `(${authData.customer.phone})`);

  // 3. Get table session token from public menu
  const menuRes = await fetch(`${BASE_URL}/menu/demo-cafe/t/${table05.token}`);
  const menuData = (await menuRes.json()) as any;
  const tableSessionToken = menuData.tableSessionToken;
  console.log('✅ Public menu loaded for Table 05. TableSessionToken received.');

  // 4. Place Order #1
  const order1Res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      tableSessionToken,
      restaurantSlug: 'demo-cafe',
      tableToken: table05.token,
      items: [{ menuItemId: items[0].id, quantity: 2, specialInstructions: 'Extra hot' }],
      customerName: 'Aria Montgomery',
    }),
  });
  if (!order1Res.ok) throw new Error(`Order 1 failed: ${await order1Res.text()}`);
  const order1Data = (await order1Res.json()) as any;
  console.log(`✅ Order 1 placed: Order #${order1Data.orderNumber} (Token: ${order1Data.orderToken.slice(0, 15)}...)`);

  // Simulate instant payment for Order 1
  const pay1Res = await fetch(`${BASE_URL}/payments/sandbox-simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderToken: order1Data.orderToken }),
  });
  if (!pay1Res.ok) throw new Error(`Payment 1 failed: ${await pay1Res.text()}`);
  console.log(`✅ Order 1 payment confirmed: Order #${order1Data.orderNumber}`);

  // 5. Simulate "Add More Items"
  // The customer returns to the menu on table 05.
  // Verify that customer can check active orders from the menu page
  const activeRes1 = await fetch(`${BASE_URL}/customer/orders/active`, {
    headers: { 'Authorization': `Bearer ${customerToken}` },
  });
  const activeData1 = (await activeRes1.json()) as any;
  if (activeData1.count !== 1 || activeData1.orders[0].orderNumber !== order1Data.orderNumber) {
    throw new Error(`Expected 1 active order, got: ${JSON.stringify(activeData1)}`);
  }
  console.log(`✅ Floating pill on Menu: "${activeData1.count} active order in kitchen" (Order #${order1Data.orderNumber})`);

  // 6. Place Order #2 (Ordering again on Table 05)
  const order2Res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      tableSessionToken,
      restaurantSlug: 'demo-cafe',
      tableToken: table05.token,
      items: [{ menuItemId: items[1].id, quantity: 1, specialInstructions: 'Less sweet' }],
      customerName: 'Aria Montgomery',
    }),
  });
  if (!order2Res.ok) throw new Error(`Order 2 failed: ${await order2Res.text()}`);
  const order2Data = (await order2Res.json()) as any;
  console.log(`✅ Order 2 placed: Order #${order2Data.orderNumber} (Token: ${order2Data.orderToken.slice(0, 15)}...)`);

  // Simulate instant payment for Order 2
  const pay2Res = await fetch(`${BASE_URL}/payments/sandbox-simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderToken: order2Data.orderToken }),
  });
  if (!pay2Res.ok) throw new Error(`Payment 2 failed: ${await pay2Res.text()}`);
  console.log(`✅ Order 2 payment confirmed: Order #${order2Data.orderNumber}`);

  // 7. Verify Customer Order History now contains BOTH orders
  const historyRes = await fetch(`${BASE_URL}/customer/orders`, {
    headers: { 'Authorization': `Bearer ${customerToken}` },
  });
  const historyOrders = (await historyRes.json()) as any[];
  if (historyOrders.length < 2) {
    throw new Error(`Expected at least 2 orders in history, got ${historyOrders.length}`);
  }
  const orderNumbers = historyOrders.map((o) => o.orderNumber);
  if (!orderNumbers.includes(order1Data.orderNumber) || !orderNumbers.includes(order2Data.orderNumber)) {
    throw new Error(`Both orders #${order1Data.orderNumber} and #${order2Data.orderNumber} must be in history. Found: ${orderNumbers}`);
  }
  console.log(`✅ Customer Order History verified: Contains both orders [${orderNumbers.join(', ')}]`);

  // 8. Verify Active Orders returns 2 orders
  const activeRes2 = await fetch(`${BASE_URL}/customer/orders/active`, {
    headers: { 'Authorization': `Bearer ${customerToken}` },
  });
  const activeData2 = (await activeRes2.json()) as any;
  if (activeData2.count !== 2) {
    throw new Error(`Expected 2 active orders, got ${activeData2.count}`);
  }
  console.log(`✅ Floating pill on Menu: "${activeData2.count} orders currently in kitchen"`);

  // 9. Inspect independent status for Order 1 and Order 2 via /api/orders/:orderToken
  const status1Res = await fetch(`${BASE_URL}/orders/${order1Data.orderToken}`);
  const status1 = (await status1Res.json()) as any;
  if (status1.orderNumber !== order1Data.orderNumber || status1.tableToken !== table05.token) {
    throw new Error(`Order 1 status mismatch: ${JSON.stringify(status1)}`);
  }

  const status2Res = await fetch(`${BASE_URL}/orders/${order2Data.orderToken}`);
  const status2 = (await status2Res.json()) as any;
  if (status2.orderNumber !== order2Data.orderNumber || status2.tableToken !== table05.token) {
    throw new Error(`Order 2 status mismatch: ${JSON.stringify(status2)}`);
  }
  console.log('✅ Both orders have independent, verified status and retain tableToken for "Add More Items".');

  // 10. Staff advances Order 1 to SERVED; Order 2 remains PREPARING
  // Staff login
  const staffLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'staff@democafe.com', password: 'staff123' }),
  });
  const staffData = (await staffLoginRes.json()) as any;
  const staffToken = staffData.token;

  // Move Order 1: CONFIRMED -> PREPARING -> READY -> SERVED
  await fetch(`${BASE_URL}/admin/orders/${status1.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${staffToken}`,
    },
    body: JSON.stringify({ status: 'PREPARING' }),
  });
  await fetch(`${BASE_URL}/admin/orders/${status1.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${staffToken}`,
    },
    body: JSON.stringify({ status: 'READY' }),
  });
  await fetch(`${BASE_URL}/admin/orders/${status1.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${staffToken}`,
    },
    body: JSON.stringify({ status: 'SERVED' }),
  });

  // Now active orders count should be 1 (Order 2 is still active, Order 1 is SERVED)
  const activeRes3 = await fetch(`${BASE_URL}/customer/orders/active`, {
    headers: { 'Authorization': `Bearer ${customerToken}` },
  });
  const activeData3 = (await activeRes3.json()) as any;
  if (activeData3.count !== 1 || activeData3.orders[0].orderNumber !== order2Data.orderNumber) {
    throw new Error(`Expected Order 2 to remain active, got: ${JSON.stringify(activeData3)}`);
  }
  console.log(`✅ After Order #${order1Data.orderNumber} is SERVED: Active count dropped to 1 (Order #${order2Data.orderNumber}).`);

  // Check history still shows BOTH orders with their respective statuses: Order 1 SERVED, Order 2 CONFIRMED
  const historyRes2 = await fetch(`${BASE_URL}/customer/orders`, {
    headers: { 'Authorization': `Bearer ${customerToken}` },
  });
  const historyOrders2 = (await historyRes2.json()) as any[];
  const finalO1 = historyOrders2.find((o) => o.orderNumber === order1Data.orderNumber);
  const finalO2 = historyOrders2.find((o) => o.orderNumber === order2Data.orderNumber);
  if (finalO1.status !== 'SERVED') throw new Error(`Expected Order 1 to be SERVED, got ${finalO1.status}`);
  if (finalO2.status !== 'CONFIRMED') throw new Error(`Expected Order 2 to be CONFIRMED, got ${finalO2.status}`);

  console.log(`✅ Order #${order1Data.orderNumber} status in history: ${finalO1.status}`);
  console.log(`✅ Order #${order2Data.orderNumber} status in history: ${finalO2.status}`);

  console.log('\n🎉 ALL MULTI-ORDER PERSISTENCE & HISTORY TESTS PASSED PERFECTLY! 🎉\n');
}

run()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
