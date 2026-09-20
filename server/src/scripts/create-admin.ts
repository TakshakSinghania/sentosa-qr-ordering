import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';

async function createAdmin() {
  const email = (process.env.ADMIN_EMAIL || process.argv[2] || '').trim().toLowerCase();
  const password = (process.env.ADMIN_PASSWORD || process.argv[3] || '').trim();
  const name = (process.env.ADMIN_NAME || process.argv[4] || 'Restaurant Manager').trim();
  const role = (process.env.ADMIN_ROLE || process.argv[5] || 'MANAGER').trim().toUpperCase();
  const restaurantName = (process.env.RESTAURANT_NAME || process.argv[6] || 'Sentosa — The Coffee Unit').trim();
  const restaurantSlug = (process.env.RESTAURANT_SLUG || process.argv[7] || 'sentosa').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    console.error('❌ Error: A valid email must be provided.');
    console.error('Usage: npx tsx src/scripts/create-admin.ts <email> <password> [name] [role] [restaurantName] [restaurantSlug]');
    console.error('   or: ADMIN_EMAIL=owner@cafe.com ADMIN_PASSWORD=Secr3t!P@ss ADMIN_ROLE=MANAGER npm run create-admin');
    console.error('Roles: MANAGER (full access), STAFF (operational only)');
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error('❌ Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  if (password === 'admin123' || password === 'staff123') {
    console.error('❌ Security Error: Insecure default passwords (admin123/staff123) are rejected for production accounts.');
    process.exit(1);
  }

  if (!['MANAGER', 'STAFF', 'ADMIN'].includes(role)) {
    console.error(`❌ Error: Invalid role "${role}". Must be MANAGER or STAFF.`);
    process.exit(1);
  }

  console.log(`🔐 Provisioning secure ${role} account for: ${email}`);

  // 1. Find or create restaurant
  let restaurant = await prisma.restaurant.findUnique({
    where: { slug: restaurantSlug },
  });

  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: {
        name: restaurantName,
        slug: restaurantSlug,
        currency: 'INR',
        currencySymbol: '₹',
        taxRate: 5.0,
        serviceChargeRate: 0.0,
        isOpen: true,
      },
    });
    console.log(`✅ Created restaurant: "${restaurant.name}" (Slug: "${restaurant.slug}")`);
  } else {
    console.log(`ℹ️ Using existing restaurant: "${restaurant.name}" (ID: ${restaurant.id})`);
  }

  // 2. Hash password securely
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  // 3. Upsert user account
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      restaurantId: restaurant.id,
      name,
      email,
      passwordHash,
      role,
    },
    update: {
      restaurantId: restaurant.id,
      name,
      passwordHash,
      role,
    },
  });

  const loginUrl = role === 'STAFF' ? '/admin/staff/login' : '/admin/manager/login';

  console.log(`\n🎉 ${role} account configured successfully!`);
  console.log(`-----------------------------------------------------`);
  console.log(`Email:       ${user.email}`);
  console.log(`Name:        ${user.name}`);
  console.log(`Role:        ${user.role}`);
  console.log(`Restaurant:  ${restaurant.name} (${restaurant.slug})`);
  console.log(`Login URL:   ${loginUrl}`);
  console.log(`-----------------------------------------------------\n`);
}

createAdmin()
  .catch((err) => {
    console.error('❌ Failed to provision account:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

