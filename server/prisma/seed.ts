import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generateSecureToken(prefix = 'tbl_'): string {
  return `${prefix}${crypto.randomBytes(8).toString('hex')}`;
}

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    console.error('⛔ Refusing to run demo seed in PRODUCTION environment.');
    console.error('Demo seed wipes all database records and restores demo accounts (admin@democafe.com).');
    console.error('To initialize a production restaurant and staff, use: npm run create-admin');
    console.error('If you genuinely intend to wipe production and seed demo data, pass ALLOW_PRODUCTION_SEED=true.');
    process.exit(1);
  }

  console.log('🌱 Starting database seed...');

  // 1. Clean existing records for fresh idempotent seed
  await prisma.waiterRequest.deleteMany();
  await prisma.orderItemCustomization.deleteMany();
  await prisma.customizationOption.deleteMany();
  await prisma.customizationGroup.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.orderSession.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.table.deleteMany();
  await prisma.user.deleteMany();
  await prisma.restaurant.deleteMany();

  // 2. Create Sentosa Café Restaurant
  const restaurant = await prisma.restaurant.create({
    data: {
      name: 'Sentosa — The Coffee Unit',
      slug: 'demo-cafe',
      phone: '+91 98765 43210',
      address: 'Sentosa — The Coffee Unit, 124 Indiranagar 100ft Road, Bengaluru, Karnataka 560038',
      currency: 'INR',
      currencySymbol: '₹',
      taxRate: 5.0, // 5% GST
      serviceChargeRate: 0.0,
      isOpen: true,
      logoUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=200&q=80',
    },
  });

  console.log(`✅ Created restaurant: ${restaurant.name} (${restaurant.id})`);

  // 3. Create Admin & Staff Users
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('admin123', salt);
  const staffPasswordHash = await bcrypt.hash('staff123', salt);

  await prisma.user.createMany({
    data: [
      {
        restaurantId: restaurant.id,
        name: 'Café Manager',
        email: 'admin@democafe.com',
        passwordHash: adminPasswordHash,
        role: 'MANAGER',
      },
      {
        restaurantId: restaurant.id,
        name: 'Front Staff',
        email: 'staff@democafe.com',
        passwordHash: staffPasswordHash,
        role: 'STAFF',
      },
    ],
  });

  console.log('✅ Created demo manager (admin@democafe.com / admin123) and staff (staff@democafe.com / staff123)');

  // 4. Create Tables (01 to 10) with secure tokens
  const tableData = [
    { tableNumber: '01', capacity: 2, token: 'tbl_a1b2c3d4' },
    { tableNumber: '02', capacity: 2, token: 'tbl_e5f6g7h8' },
    { tableNumber: '03', capacity: 4, token: 'tbl_i9j0k1l2' },
    { tableNumber: '04', capacity: 4, token: 'tbl_m3n4o5p6' },
    { tableNumber: '05', capacity: 4, token: 'tbl_q7r8s9t0' }, // Primary demo table
    { tableNumber: '06', capacity: 6, token: 'tbl_u1v2w3x4' },
    { tableNumber: '07', capacity: 6, token: 'tbl_y5z6a7b8' },
    { tableNumber: '08', capacity: 2, token: 'tbl_c9d0e1f2' },
    { tableNumber: '09', capacity: 4, token: 'tbl_g3h4i5j6' },
    { tableNumber: '10', capacity: 8, token: 'tbl_k7l8m9n0' },
  ];

  for (const t of tableData) {
    await prisma.table.create({
      data: {
        restaurantId: restaurant.id,
        tableNumber: t.tableNumber,
        token: t.token,
        capacity: t.capacity,
        isActive: true,
      },
    });
  }

  console.log('✅ Created 10 tables with secure table tokens');

  // 5. Create Categories
  const categories = [
    { name: 'Beverages', sortOrder: 1 },
    { name: 'Breakfast', sortOrder: 2 },
    { name: 'Starters', sortOrder: 3 },
    { name: 'Main Course', sortOrder: 4 },
    { name: 'Desserts', sortOrder: 5 },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    const created = await prisma.menuCategory.create({
      data: {
        restaurantId: restaurant.id,
        name: cat.name,
        sortOrder: cat.sortOrder,
      },
    });
    categoryMap.set(cat.name, created.id);
  }

  console.log('✅ Created 5 menu categories');

  // 6. Create 18 Realistic Menu Items
  const menuItems = [
    // Beverages
    {
      category: 'Beverages',
      name: 'Artisan Cold Brew',
      description: 'Slow-steeped for 18 hours using 100% single-origin Arabica beans with hints of dark chocolate.',
      price: 199,
      isVeg: true,
      isAvailable: true,
      isFeatured: true,
      imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
    },
    {
      category: 'Beverages',
      name: 'Spanish Iced Latte',
      description: 'Double espresso pulled over chilled condensed milk and whole milk on ice.',
      price: 229,
      isVeg: true,
      isAvailable: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80',
    },
    {
      category: 'Beverages',
      name: 'Fresh Mint Lime Fizz',
      description: 'Hand-pressed garden mint, fresh Tahitian limes, and sparkling mineral soda.',
      price: 149,
      isVeg: true,
      isAvailable: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
    },
    {
      category: 'Beverages',
      name: 'Hot Cappuccino',
      description: 'Velvety micro-foamed milk paired with a robust double shot of house espresso.',
      price: 179,
      isVeg: true,
      isAvailable: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80',
    },

    // Breakfast
    {
      category: 'Breakfast',
      name: 'Avocado Sourdough Toast',
      description: 'Crushed Hass avocado on toasted artisan sourdough, cherry tomatoes, feta crumbles, and toasted seeds.',
      price: 299,
      isVeg: true,
      isAvailable: true,
      isFeatured: true,
      imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
    },
    {
      category: 'Breakfast',
      name: 'Truffle Scrambled Eggs on Brioche',
      description: 'Silky scrambled organic eggs infused with white truffle oil, served on toasted buttery brioche.',
      price: 329,
      isVeg: false,
      isAvailable: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
    },
    {
      category: 'Breakfast',
      name: 'Belgian Buttermilk Waffles',
      description: 'Fluffy golden waffles served with warm pure maple syrup, whipped butter, and fresh berries.',
      price: 279,
      isVeg: true,
      isAvailable: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80',
    },

    // Starters
    {
      category: 'Starters',
      name: 'Crispy Peri-Peri Fries',
      description: 'Skin-on golden fries tossed in our signature smoky peri-peri spice dust with garlic aioli dip.',
      price: 169,
      isVeg: true,
      isAvailable: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80',
    },
    {
      category: 'Starters',
      name: 'Truffle Parmesan Crostini',
      description: 'Toasted baguette rounds topped with garlic confit, melted aged parmesan, and micro-herbs.',
      price: 249,
      isVeg: true,
      isAvailable: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&w=600&q=80',
    },
    {
      category: 'Starters',
      name: 'Smoky Chipotle Chicken Wings',
      description: 'Tender chicken wings glazed in hickory woodchip barbecue sauce, finished with toasted sesame.',
      price: 349,
      isVeg: false,
      isAvailable: true,
      isFeatured: true,
      imageUrl: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80',
    },
    {
      category: 'Starters',
      name: 'Paneer Tikka Skewers',
      description: 'Char-grilled cottage cheese cubes marinated in Kashmiri chili and Greek yogurt with mint chutney.',
      price: 289,
      isVeg: true,
      isAvailable: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80',
    },

    // Main Course
    {
      category: 'Main Course',
      name: 'Margherita Wood-Fired Pizza',
      description: 'San Marzano tomato sauce, fresh buffalo mozzarella, hand-torn sweet basil, and extra virgin olive oil.',
      price: 349,
      isVeg: true,
      isAvailable: true,
      isFeatured: true,
      imageUrl: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=600&q=80',
    },
    {
      category: 'Main Course',
      name: 'Wild Mushroom Risotto',
      description: 'Arborio rice simmered in slow-cooked vegetable stock with porcini, button mushrooms, and Grana Padano.',
      price: 399,
      isVeg: true,
      isAvailable: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=600&q=80',
    },
    {
      category: 'Main Course',
      name: 'Grilled Herb Chicken Steak',
      description: 'Rosemary-marinated chicken breast served with roasted baby potatoes, buttered asparagus, and pepper jus.',
      price: 449,
      isVeg: false,
      isAvailable: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80',
    },
    {
      category: 'Main Course',
      name: 'Classic Smash Cheeseburger',
      description: 'Caramelized double beef/veg patty, melted cheddar, house pickle relish, and secret sauce on brioche.',
      price: 329,
      isVeg: false,
      isAvailable: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    },
    {
      category: 'Main Course',
      name: 'Penne Arrabiata',
      description: 'Al dente penne pasta in a fiery plum tomato sauce with garlic, chili flakes, and fresh basil.',
      price: 319,
      isVeg: true,
      isAvailable: false, // Initially marked SOLD OUT to demonstrate sold out behavior
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3d5d628169e?auto=format&fit=crop&w=600&q=80',
    },

    // Desserts
    {
      category: 'Desserts',
      name: 'Belgian Dark Chocolate Fondant',
      description: 'Warm, molten chocolate lava cake served with a generous scoop of Madagascar vanilla gelato.',
      price: 249,
      isVeg: true,
      isAvailable: true,
      isFeatured: true,
      imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80',
    },
    {
      category: 'Desserts',
      name: 'Classic New York Cheesecake',
      description: 'Baked cream cheese cake on a graham cracker crust, topped with fresh blueberry compote.',
      price: 269,
      isVeg: true,
      isAvailable: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80',
    },
    {
      category: 'Desserts',
      name: 'Tiramisu Tradizionale',
      description: 'Espresso-soaked Savoiardi ladyfingers layered with rich mascarpone zabaglione and Dutch cocoa.',
      price: 279,
      isVeg: true,
      isAvailable: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80',
    },
  ];

  for (const item of menuItems) {
    const categoryId = categoryMap.get(item.category)!;
    await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
        isVeg: item.isVeg,
        isAvailable: item.isAvailable,
        isFeatured: item.isFeatured,
      },
    });
  }

  console.log(`✅ Created ${menuItems.length} menu items across 5 categories`);

  // 7. Seed Customization Groups & Options for key demo dishes
  const cappuccino = await prisma.menuItem.findFirst({ where: { name: 'Hot Cappuccino' } });
  if (cappuccino) {
    // Group 1: Milk Option (Required, SINGLE)
    await prisma.customizationGroup.create({
      data: {
        menuItemId: cappuccino.id,
        name: 'Milk Option',
        type: 'SINGLE',
        required: true,
        minSelections: 1,
        maxSelections: 1,
        sortOrder: 1,
        options: {
          create: [
            { name: 'Whole Dairy Milk', priceAddition: 0.0, sortOrder: 1 },
            { name: 'Creamy Oat Milk', priceAddition: 40.0, sortOrder: 2 },
            { name: 'Roasted Almond Milk', priceAddition: 50.0, sortOrder: 3 },
          ],
        },
      },
    });

    // Group 2: Espresso Shots (Required, SINGLE)
    await prisma.customizationGroup.create({
      data: {
        menuItemId: cappuccino.id,
        name: 'Espresso Shots',
        type: 'SINGLE',
        required: true,
        minSelections: 1,
        maxSelections: 1,
        sortOrder: 2,
        options: {
          create: [
            { name: '1 Shot (Standard)', priceAddition: 0.0, sortOrder: 1 },
            { name: '2 Shots (Double)', priceAddition: 50.0, sortOrder: 2 },
            { name: '3 Shots (Triple Intense)', priceAddition: 90.0, sortOrder: 3 },
          ],
        },
      },
    });

    // Group 3: Whipped Cream (Optional, SINGLE)
    await prisma.customizationGroup.create({
      data: {
        menuItemId: cappuccino.id,
        name: 'Whipped Cream',
        type: 'SINGLE',
        required: false,
        minSelections: 0,
        maxSelections: 1,
        sortOrder: 3,
        options: {
          create: [
            { name: 'No Cream', priceAddition: 0.0, sortOrder: 1 },
            { name: 'Fresh Whipped Cream', priceAddition: 30.0, sortOrder: 2 },
          ],
        },
      },
    });

    // Group 4: Add-ons & Flavours (Optional, MULTI)
    await prisma.customizationGroup.create({
      data: {
        menuItemId: cappuccino.id,
        name: 'Add-ons & Flavours',
        type: 'MULTI',
        required: false,
        minSelections: 0,
        maxSelections: 3,
        sortOrder: 4,
        options: {
          create: [
            { name: 'Chocolate Chips', priceAddition: 25.0, sortOrder: 1 },
            { name: 'Madagascar Vanilla Syrup', priceAddition: 30.0, sortOrder: 2 },
            { name: 'Organic Cinnamon Dust', priceAddition: 15.0, sortOrder: 3 },
          ],
        },
      },
    });

    console.log('✅ Created customization groups for Hot Cappuccino');
  }

  const pizza = await prisma.menuItem.findFirst({ where: { name: 'Margherita Wood-Fired Pizza' } });
  if (pizza) {
    // Crust & Size (Required, SINGLE)
    await prisma.customizationGroup.create({
      data: {
        menuItemId: pizza.id,
        name: 'Crust & Size',
        type: 'SINGLE',
        required: true,
        minSelections: 1,
        maxSelections: 1,
        sortOrder: 1,
        options: {
          create: [
            { name: '10-inch Classic Thin Crust', priceAddition: 0.0, sortOrder: 1 },
            { name: '12-inch Sharing Large Crust', priceAddition: 100.0, sortOrder: 2 },
          ],
        },
      },
    });

    // Extras & Toppings (Optional, MULTI)
    await prisma.customizationGroup.create({
      data: {
        menuItemId: pizza.id,
        name: 'Gourmet Toppings',
        type: 'MULTI',
        required: false,
        minSelections: 0,
        maxSelections: 4,
        sortOrder: 2,
        options: {
          create: [
            { name: 'Extra Fior di Latte Cheese', priceAddition: 60.0, sortOrder: 1 },
            { name: 'Kalamata Black Olives', priceAddition: 35.0, sortOrder: 2 },
            { name: 'Pickled Jalapeños', priceAddition: 25.0, sortOrder: 3 },
            { name: 'Sautéed Wild Mushrooms', priceAddition: 45.0, sortOrder: 4 },
          ],
        },
      },
    });

    console.log('✅ Created customization groups for Margherita Wood-Fired Pizza');
  }

  const burger = await prisma.menuItem.findFirst({ where: { name: 'Classic Smash Cheeseburger' } });
  if (burger) {
    // Cheese (Optional, SINGLE)
    await prisma.customizationGroup.create({
      data: {
        menuItemId: burger.id,
        name: 'Cheese Selection',
        type: 'SINGLE',
        required: false,
        minSelections: 0,
        maxSelections: 1,
        sortOrder: 1,
        options: {
          create: [
            { name: 'Standard Melted Cheddar', priceAddition: 0.0, sortOrder: 1 },
            { name: 'Double Aged Cheddar', priceAddition: 40.0, sortOrder: 2 },
          ],
        },
      },
    });

    // Add-ons (Optional, MULTI)
    await prisma.customizationGroup.create({
      data: {
        menuItemId: burger.id,
        name: 'Add-ons & Extras',
        type: 'MULTI',
        required: false,
        minSelections: 0,
        maxSelections: 3,
        sortOrder: 2,
        options: {
          create: [
            { name: 'Spicy Jalapeños', priceAddition: 20.0, sortOrder: 1 },
            { name: 'Caramelized Onions', priceAddition: 30.0, sortOrder: 2 },
            { name: 'Extra Smash Patty', priceAddition: 120.0, sortOrder: 3 },
          ],
        },
      },
    });

    console.log('✅ Created customization groups for Classic Smash Cheeseburger');
  }

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
