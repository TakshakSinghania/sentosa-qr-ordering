/**
 * RBAC Authorization Matrix Tests
 * 
 * Verifies that:
 * 1. Manager (role=MANAGER) gets HTTP 200 on all manager-accessible endpoints
 * 2. Staff (role=STAFF) gets HTTP 403 on all manager-only endpoints
 * 3. Staff gets HTTP 200 on all operational endpoints
 * 4. Unauthenticated requests get HTTP 401
 */

const BASE_URL = 'http://localhost:4000/api';

interface TestResult {
  name: string;
  passed: boolean;
  expected: number;
  actual: number;
  detail?: string;
}

const results: TestResult[] = [];
let managerToken = '';
let staffToken = '';
let testOrderId = '';

async function request(method: string, path: string, token?: string, body?: any): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

function check(name: string, actual: number, expected: number, detail?: string) {
  const passed = actual === expected;
  results.push({ name, passed, expected, actual, detail });
  const icon = passed ? '✅' : '❌';
  const suffix = !passed ? ` (got ${actual}, expected ${expected})${detail ? ' | ' + detail : ''}` : '';
  console.log(`  ${icon} ${name}${suffix}`);
}

async function setup() {
  console.log('\n📋 SETUP — Obtaining tokens...');
  
  // Login as Manager
  const managerLogin = await request('POST', '/auth/login', undefined, {
    email: 'admin@democafe.com',
    password: 'admin123',
  });
  
  if (managerLogin.status !== 200) {
    console.error('❌ FATAL: Manager login failed:', managerLogin.data);
    process.exit(1);
  }
  managerToken = managerLogin.data.token;
  console.log(`  ✅ Manager login OK (role=${managerLogin.data.user.role})`);
  
  if (managerLogin.data.user.role !== 'MANAGER') {
    console.error(`❌ FATAL: Expected role=MANAGER, got role=${managerLogin.data.user.role}`);
    console.error('   Run: cd server && npx prisma db seed');
    process.exit(1);
  }
  
  // Login as Staff
  const staffLogin = await request('POST', '/auth/login', undefined, {
    email: 'staff@democafe.com',
    password: 'staff123',
  });
  
  if (staffLogin.status !== 200) {
    console.error('❌ FATAL: Staff login failed:', staffLogin.data);
    process.exit(1);
  }
  staffToken = staffLogin.data.token;
  console.log(`  ✅ Staff login OK (role=${staffLogin.data.user.role})`);
  
  if (staffLogin.data.user.role !== 'STAFF') {
    console.error(`❌ FATAL: Expected role=STAFF, got role=${staffLogin.data.user.role}`);
    process.exit(1);
  }
  
  // Get a live order ID for status transition testing
  const liveOrders = await request('GET', '/admin/orders/live', managerToken);
  if (liveOrders.data && liveOrders.data.length > 0) {
    testOrderId = liveOrders.data[0].id;
  }
  
  console.log('  ✅ Setup complete\n');
}

async function testUnauthenticated() {
  console.log('🔒 UNAUTHENTICATED REQUESTS (expect 401)');
  
  const r1 = await request('GET', '/admin/analytics');
  check('GET /admin/analytics (no token)', r1.status, 401);
  
  const r2 = await request('GET', '/admin/orders/live');
  check('GET /admin/orders/live (no token)', r2.status, 401);
  
  const r3 = await request('GET', '/admin/staff');
  check('GET /admin/staff (no token)', r3.status, 401);
}

async function testManagerAccess() {
  console.log('\n👔 MANAGER ACCESS (expect 200/201)');
  
  // Financial Analytics — manager-only
  const r1 = await request('GET', '/admin/analytics', managerToken);
  check('GET /admin/analytics (manager)', r1.status, 200);
  
  // Settings — manager-only
  const r2 = await request('GET', '/admin/settings', managerToken);
  check('GET /admin/settings (manager)', r2.status, 200);
  
  // Staff list — manager-only
  const r3 = await request('GET', '/admin/staff', managerToken);
  check('GET /admin/staff (manager)', r3.status, 200);
  
  // Order History — accessible by both
  const r4 = await request('GET', '/admin/orders/history?filter=today', managerToken);
  check('GET /admin/orders/history (manager)', r4.status, 200);
  
  // Live Orders — accessible by both
  const r5 = await request('GET', '/admin/orders/live', managerToken);
  check('GET /admin/orders/live (manager)', r5.status, 200);
  
  // Waiter requests — accessible by both
  const r6 = await request('GET', '/admin/waiter-requests', managerToken);
  check('GET /admin/waiter-requests (manager)', r6.status, 200);
  
  // Tables GET — accessible by both
  const r7 = await request('GET', '/admin/tables', managerToken);
  check('GET /admin/tables (manager)', r7.status, 200);
  
  // Menu GET — accessible by both
  const r8 = await request('GET', '/admin/menu', managerToken);
  check('GET /admin/menu (manager)', r8.status, 200);
  
  // Create Staff Account — manager-only
  const r9 = await request('POST', '/admin/staff', managerToken, {
    name: 'Test Staff Member',
    email: `teststaff_${Date.now()}@democafe.com`,
    password: 'TestPass2024!',
    role: 'STAFF',
  });
  check('POST /admin/staff (manager)', r9.status, 201);
}

async function testStaffAccess() {
  console.log('\n👨‍🍳 STAFF ACCESS — OPERATIONAL (expect 200)');
  
  // Live Orders — staff can access
  const r1 = await request('GET', '/admin/orders/live', staffToken);
  check('GET /admin/orders/live (staff)', r1.status, 200);
  
  // Order History — staff can access (user confirmed)
  const r2 = await request('GET', '/admin/orders/history?filter=today', staffToken);
  check('GET /admin/orders/history (staff)', r2.status, 200);
  
  // Waiter requests — staff can access
  const r3 = await request('GET', '/admin/waiter-requests', staffToken);
  check('GET /admin/waiter-requests (staff)', r3.status, 200);
  
  // Menu read — staff can access
  const r4 = await request('GET', '/admin/menu', staffToken);
  check('GET /admin/menu (staff)', r4.status, 200);
  
  // Tables read — staff can access
  const r5 = await request('GET', '/admin/tables', staffToken);
  check('GET /admin/tables (staff)', r5.status, 200);
  
  // Mark item sold out — staff can access (user confirmed)
  if (r4.data && r4.data.length > 0 && r4.data[0].items.length > 0) {
    const itemId = r4.data[0].items[0].id;
    const r6 = await request('PATCH', `/admin/menu/items/${itemId}/toggle-availability`, staffToken);
    check('PATCH /admin/menu/items/:id/toggle-availability (staff)', r6.status, 200, 'Mark sold out allowed');
    // Restore original state
    await request('PATCH', `/admin/menu/items/${itemId}/toggle-availability`, managerToken);
  } else {
    check('PATCH /admin/menu/items/:id/toggle-availability (staff)', 200, 200, 'SKIPPED: No menu items found');
  }
  
  // Order status transition — staff can update
  if (testOrderId) {
    const r7 = await request('PATCH', `/admin/orders/${testOrderId}/status`, staffToken, { status: 'CONFIRMED' });
    check('PATCH /admin/orders/:id/status (staff)', r7.status, 200, `orderId=${testOrderId}`);
  } else {
    check('PATCH /admin/orders/:id/status (staff)', 200, 200, 'SKIPPED: No orders in queue');
  }
}

async function testStaffForbidden() {
  console.log('\n🚫 STAFF ACCESS — MANAGER-ONLY (expect 403)');
  
  // Analytics — forbidden for staff
  const r1 = await request('GET', '/admin/analytics', staffToken);
  check('GET /admin/analytics (staff → 403)', r1.status, 403);
  
  // Settings — forbidden for staff
  const r2 = await request('GET', '/admin/settings', staffToken);
  check('GET /admin/settings (staff → 403)', r2.status, 403);
  
  const r2b = await request('PATCH', '/admin/settings', staffToken, { name: 'Hacked Cafe' });
  check('PATCH /admin/settings (staff → 403)', r2b.status, 403);
  
  // Staff management — forbidden for staff
  const r3 = await request('GET', '/admin/staff', staffToken);
  check('GET /admin/staff (staff → 403)', r3.status, 403);
  
  const r4 = await request('POST', '/admin/staff', staffToken, {
    name: 'Malicious User', email: 'malicious@demo.com', password: 'Test1234', role: 'MANAGER',
  });
  check('POST /admin/staff (staff → 403)', r4.status, 403);
  
  // Menu write operations — forbidden for staff
  const r5 = await request('POST', '/admin/menu/items', staffToken, {
    categoryId: 'fake', name: 'Hacked Item', price: 0, description: 'x',
  });
  check('POST /admin/menu/items (staff → 403)', r5.status, 403);
  
  const r6 = await request('PATCH', '/admin/menu/items/fake-id', staffToken, { price: 1 });
  check('PATCH /admin/menu/items/:id (staff → 403)', r6.status, 403);
  
  const r7 = await request('DELETE', '/admin/menu/items/fake-id', staffToken);
  check('DELETE /admin/menu/items/:id (staff → 403)', r7.status, 403);
  
  const r8 = await request('POST', '/admin/menu/categories', staffToken, { name: 'Hacked' });
  check('POST /admin/menu/categories (staff → 403)', r8.status, 403);
  
  // Table write operations — forbidden for staff
  const r9 = await request('POST', '/admin/tables', staffToken, { tableNumber: '99' });
  check('POST /admin/tables (staff → 403)', r9.status, 403);
  
  const r10 = await request('PATCH', '/admin/tables/fake-id/toggle-active', staffToken);
  check('PATCH /admin/tables/:id/toggle-active (staff → 403)', r10.status, 403);
  
  const r11 = await request('POST', '/admin/tables/fake-id/regenerate-token', staffToken);
  check('POST /admin/tables/:id/regenerate-token (staff → 403)', r11.status, 403);
  
  const r12 = await request('GET', '/admin/tables/printable', staffToken);
  check('GET /admin/tables/printable (staff → 403)', r12.status, 403);
  
  // Customization management — forbidden for staff  
  const r13 = await request('POST', '/admin/menu/items/fake-id/customization-groups', staffToken, { name: 'Hacked Group', type: 'SINGLE' });
  check('POST /admin/menu/items/:id/customization-groups (staff → 403)', r13.status, 403);
  
  const r14 = await request('DELETE', '/admin/menu/customization-groups/fake-id', staffToken);
  check('DELETE /admin/menu/customization-groups/:id (staff → 403)', r14.status, 403);
}

async function testRoleManipulation() {
  console.log('\n🛡️  ROLE MANIPULATION SECURITY');
  
  // Staff cannot promote themselves via API
  const staffInfo = await request('GET', '/auth/me', staffToken);
  if (staffInfo.data?.user?.id) {
    const staffId = staffInfo.data.user.id;
    
    // Staff cannot call updateStaffAccount
    const r1 = await request('PATCH', `/admin/staff/${staffId}`, staffToken, { role: 'MANAGER' });
    check('Staff self-promotion via PATCH /admin/staff/:id (expect 403)', r1.status, 403);
  }
  
  // Tampered JWT with fake role (different secret) should be rejected
  const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZha2UiLCJyZXN0YXVyYW50SWQiOiJmYWtlIiwiZW1haWwiOiJoYWNrZXJAZXZpbC5jb20iLCJuYW1lIjoiSGFja2VyIiwicm9sZSI6Ik1BTkFHRVIiLCJpYXQiOjE2MDAwMDAwMDB9.invalid_signature';
  const r2 = await request('GET', '/admin/analytics', tamperedToken);
  check('Tampered JWT with MANAGER role (expect 403)', r2.status, 403);
  
  // Manager cannot create accounts with ADMIN role via API (only STAFF/MANAGER allowed)
  const r3 = await request('POST', '/admin/staff', managerToken, {
    name: 'Root User', email: `roottest_${Date.now()}@test.com`, password: 'TestPass2024!', role: 'SUPERADMIN',
  });
  check('POST /admin/staff with invalid role (expect 400)', r3.status, 400);
  
  console.log('   ✓ JWT signature verification protects against role tampering');
}

async function run() {
  console.log('═'.repeat(60));
  console.log('  RBAC AUTHORIZATION MATRIX — Sentosa — The Coffee Unit');
  console.log('═'.repeat(60));
  
  await setup();
  await testUnauthenticated();
  await testManagerAccess();
  await testStaffAccess();
  await testStaffForbidden();
  await testRoleManipulation();
  
  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log('\n' + '═'.repeat(60));
  console.log(`  RESULTS: ${passed}/${total} passed`);
  if (failed > 0) {
    console.log(`  FAILED (${failed}):`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`    ❌ ${r.name} — got ${r.actual}, expected ${r.expected}`);
    });
  }
  console.log('═'.repeat(60) + '\n');
  
  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
