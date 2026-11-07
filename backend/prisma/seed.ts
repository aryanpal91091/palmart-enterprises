import {
  PrismaClient,
  Role,
  InventoryLogType,
  PaymentMethod,
  PaymentStatus,
  AttendanceStatus,
  NotificationType,
  LoyaltyType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Delete all existing records in foreign-key safe order (safe clean start)
  await prisma.settings.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.return.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.inventoryLog.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.leave.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users (Admin, Manager, Cashier)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const admin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'admin@martpro.com',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: 'John Manager',
      email: 'manager@martpro.com',
      passwordHash,
      role: Role.MANAGER,
    },
  });

  const cashier = await prisma.user.create({
    data: {
      name: 'Sarah Cashier',
      email: 'cashier@martpro.com',
      passwordHash,
      role: Role.CASHIER,
    },
  });

  console.log('Users created:', { admin: admin.email, manager: manager.email, cashier: cashier.email });

  // 3. Create Settings
  await prisma.settings.create({
    data: {
      id: 'default',
      storeName: 'PalMart Supermarket',
      storeLogo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=200&auto=format&fit=crop',
      gstNumber: '29AAACP1234A1Z1',
      address: '77 Double Road, Indiranagar, Bangalore, KA, 560038',
      phone: '+91 80 4321 8765',
      email: 'billing@palmart.com',
      currency: 'INR',
      taxRate: 18.0,
      theme: 'dark',
      language: 'en',
      invoiceFooter: 'Thank you for shopping at PalMart! Come back soon.',
    },
  });

  // 4. Create Categories
  const catGrocery = await prisma.category.create({ data: { name: 'Grocery & Staples', description: 'Flour, rice, dal, oil, and spices' } });
  const catBeverages = await prisma.category.create({ data: { name: 'Beverages', description: 'Juices, soft drinks, tea, and coffee' } });
  const catDairy = await prisma.category.create({ data: { name: 'Dairy & Eggs', description: 'Milk, cheese, butter, yogurt, and eggs' } });
  const catSnacks = await prisma.category.create({ data: { name: 'Snacks & Packaged Foods', description: 'Biscuits, chips, noodles, and chocolates' } });
  const catPersonal = await prisma.category.create({ data: { name: 'Personal Care', description: 'Soaps, shampoos, toothpaste, and skincare' } });

  // 5. Create Brands
  const brandNestle = await prisma.brand.create({ data: { name: 'Nestlé' } });
  const brandCocaCola = await prisma.brand.create({ data: { name: 'Coca-Cola' } });
  const brandAmul = await prisma.brand.create({ data: { name: 'Amul' } });
  const brandBritannia = await prisma.brand.create({ data: { name: 'Britannia' } });
  const brandHUL = await prisma.brand.create({ data: { name: 'Hindustan Unilever' } });
  const brandFortune = await prisma.brand.create({ data: { name: 'Fortune' } });

  // 6. Create Suppliers
  const supApex = await prisma.supplier.create({
    data: {
      name: 'Apex FMCG Distributors',
      contactName: 'Ramesh Kumar',
      email: 'contact@apexfmcg.com',
      phone: '+91 99887 76655',
      address: 'Wholesale Market, Gate 3, Bangalore',
      outstandingBalance: 15400.0,
    },
  });

  const supGlobal = await prisma.supplier.create({
    data: {
      name: 'Global Dairy & Cold Chain',
      contactName: 'Anita Sharma',
      email: 'orders@globaldairy.com',
      phone: '+91 91234 56789',
      address: 'Cold Storage Area, Sector 5, Bangalore',
      outstandingBalance: 0.0,
    },
  });

  console.log('Suppliers created');

  // 7. Create Products
  // Standard Grocery Item
  const prodRice = await prisma.product.create({
    data: {
      name: 'Fortune Premium Basmati Rice',
      sku: 'RIC-BAS-001',
      barcode: '8906007285123',
      description: 'Long grain, aromatic basmati rice ideal for biryani.',
      unit: 'kg',
      costPrice: 90.0,
      sellingPrice: 130.0,
      discount: 5.0, // 5% discount
      gstPercent: 5.0,
      mfgDate: new Date('2026-01-10'),
      expDate: new Date('2027-01-10'),
      batchNumber: 'B-RIC99',
      currentStock: 150,
      minStockLevel: 20,
      categoryId: catGrocery.id,
      brandId: brandFortune.id,
      supplierId: supApex.id,
    },
  });

  // Soft Drink
  const prodCoke = await prisma.product.create({
    data: {
      name: 'Coca-Cola Zero Sugar 300ml Can',
      sku: 'BEV-COK-002',
      barcode: '5449000131805',
      description: 'Refreshing sugar-free cola can.',
      unit: 'pcs',
      costPrice: 28.0,
      sellingPrice: 40.0,
      discount: 0.0,
      gstPercent: 28.0,
      mfgDate: new Date('2026-03-01'),
      expDate: new Date('2026-09-01'),
      batchNumber: 'C-COK88',
      currentStock: 300,
      minStockLevel: 50,
      categoryId: catBeverages.id,
      brandId: brandCocaCola.id,
      supplierId: supApex.id,
    },
  });

  // Low Stock item (to trigger notifications and analytics warnings)
  const prodMilk = await prisma.product.create({
    data: {
      name: 'Amul Taaza Toned Milk 1L',
      sku: 'DAI-AMU-003',
      barcode: '8901262010114',
      description: 'Pasteurized double toned fresh milk.',
      unit: 'pcs',
      costPrice: 52.0,
      sellingPrice: 66.0,
      discount: 0.0,
      gstPercent: 0.0,
      mfgDate: new Date('2026-06-30'),
      expDate: new Date('2026-07-04'), // Near expiry at current date (July 2, 2026)
      batchNumber: 'M-AMU44',
      currentStock: 4, // Low stock (min is 15)
      minStockLevel: 15,
      categoryId: catDairy.id,
      brandId: brandAmul.id,
      supplierId: supGlobal.id,
    },
  });

  // Biscuit Pack
  const prodMarie = await prisma.product.create({
    data: {
      name: 'Britannia Marie Gold 250g',
      sku: 'SNA-BRI-004',
      barcode: '8901063142273',
      description: 'Crisp and light tea-time biscuits.',
      unit: 'pcs',
      costPrice: 20.0,
      sellingPrice: 30.0,
      discount: 10.0, // 10% discount
      gstPercent: 18.0,
      mfgDate: new Date('2026-02-15'),
      expDate: new Date('2026-11-15'),
      batchNumber: 'S-BRI23',
      currentStock: 80,
      minStockLevel: 15,
      categoryId: catSnacks.id,
      brandId: brandBritannia.id,
      supplierId: supApex.id,
    },
  });

  // Soap
  const prodDove = await prisma.product.create({
    data: {
      name: 'Dove Cream Beauty Bar 75g',
      sku: 'PER-DOV-005',
      barcode: '8901030753006',
      description: 'Moisturizing cream bar for soft skin.',
      unit: 'pcs',
      costPrice: 42.0,
      sellingPrice: 59.0,
      discount: 0.0,
      gstPercent: 18.0,
      mfgDate: new Date('2025-10-01'),
      expDate: new Date('2027-10-01'),
      batchNumber: 'P-DOV11',
      currentStock: 12, // Low stock alert (min 20)
      minStockLevel: 20,
      categoryId: catPersonal.id,
      brandId: brandHUL.id,
      supplierId: supApex.id,
    },
  });

  console.log('Products created');

  // 8. Create Stock Logs
  await prisma.inventoryLog.createMany({
    data: [
      { productId: prodRice.id, quantityChange: 150, type: InventoryLogType.STOCK_IN, reason: 'Initial inventory load' },
      { productId: prodCoke.id, quantityChange: 300, type: InventoryLogType.STOCK_IN, reason: 'Supplier purchase' },
      { productId: prodMilk.id, quantityChange: 100, type: InventoryLogType.STOCK_IN, reason: 'Daily morning delivery' },
      { productId: prodMilk.id, quantityChange: -96, type: InventoryLogType.STOCK_OUT, reason: 'Fulfillment sales & spills' },
      { productId: prodMarie.id, quantityChange: 80, type: InventoryLogType.STOCK_IN, reason: 'Weekly snacks restock' },
      { productId: prodDove.id, quantityChange: 12, type: InventoryLogType.STOCK_IN, reason: 'Initial soap stock' },
    ],
  });

  // 9. Create Coupons
  await prisma.coupon.createMany({
    data: [
      { code: 'WELCOME10', discountType: 'PERCENTAGE', value: 10.0, minOrderAmount: 100.0, expiryDate: new Date('2026-12-31') },
      { code: 'FLAT50', discountType: 'FIXED', value: 50.0, minOrderAmount: 500.0, expiryDate: new Date('2026-12-31') },
      { code: 'FESTIVE15', discountType: 'PERCENTAGE', value: 15.0, minOrderAmount: 1500.0, expiryDate: new Date('2026-08-31') },
    ],
  });

  // 10. Create Customers
  const custRohan = await prisma.customer.create({
    data: {
      name: 'Rohan Deshmukh',
      email: 'rohan.desh@gmail.com',
      phone: '9888877777',
      address: 'Flat 402, Skyline Apts, Indiranagar',
      loyaltyPoints: 120,
      membershipLevel: 'SILVER',
      birthday: new Date('1992-05-12'),
    },
  });

  const custPriya = await prisma.customer.create({
    data: {
      name: 'Priya Sen',
      email: 'priya.sen@outlook.com',
      phone: '9777766666',
      address: '15 Main, HAL Stage 2, Bangalore',
      loyaltyPoints: 450,
      membershipLevel: 'GOLD',
      birthday: new Date('1988-11-22'),
    },
  });

  console.log('Customers and coupons seeded');

  // 11. Create some Mock Sales for Chart visual graphics
  // A sale yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const sale1 = await prisma.sale.create({
    data: {
      customerId: custRohan.id,
      cashierId: cashier.id,
      subTotal: 390.0,
      discountAmount: 19.5,
      gstAmount: 19.5, // 5% average
      totalAmount: 390.0,
      paymentMethod: PaymentMethod.UPI,
      paymentStatus: PaymentStatus.PAID,
      createdAt: yesterday,
      items: {
        create: [
          { productId: prodRice.id, quantity: 3, sellingPrice: 130.0, discountAmount: 19.5, gstAmount: 19.5, total: 390.0 },
        ],
      },
      payments: {
        create: { amount: 390.0, method: PaymentMethod.UPI, createdAt: yesterday },
      },
    },
  });

  // A sale today
  const sale2 = await prisma.sale.create({
    data: {
      customerId: custPriya.id,
      cashierId: cashier.id,
      subTotal: 350.0,
      discountAmount: 35.0, // Coupon applied
      gstAmount: 51.3,
      totalAmount: 366.3,
      paymentMethod: PaymentMethod.SPLIT,
      paymentStatus: PaymentStatus.PAID,
      createdAt: new Date(),
      items: {
        create: [
          { productId: prodCoke.id, quantity: 5, sellingPrice: 40.0, discountAmount: 0.0, gstAmount: 31.3, total: 231.3 },
          { productId: prodMarie.id, quantity: 5, sellingPrice: 30.0, discountAmount: 15.0, gstAmount: 20.0, total: 135.0 },
        ],
      },
      payments: {
        createMany: {
          data: [
            { amount: 166.3, method: PaymentMethod.CASH },
            { amount: 200.0, method: PaymentMethod.CARD },
          ],
        },
      },
    },
  });

  // 12. Create Loyalty Transactions
  await prisma.loyaltyTransaction.createMany({
    data: [
      { customerId: custRohan.id, points: 39, type: LoyaltyType.EARNED, saleId: sale1.id, createdAt: yesterday },
      { customerId: custPriya.id, points: 36, type: LoyaltyType.EARNED, saleId: sale2.id, createdAt: new Date() },
    ],
  });

  // 13. Create Attendance
  await prisma.attendance.createMany({
    data: [
      { employeeId: cashier.id, checkIn: new Date('2026-07-01T09:00:00'), checkOut: new Date('2026-07-01T18:00:00'), status: AttendanceStatus.PRESENT, date: new Date('2026-07-01') },
      { employeeId: cashier.id, checkIn: new Date('2026-07-02T08:58:00'), status: AttendanceStatus.PRESENT, date: new Date('2026-07-02') },
      { employeeId: manager.id, checkIn: new Date('2026-07-02T08:45:00'), status: AttendanceStatus.PRESENT, date: new Date('2026-07-02') },
    ],
  });

  // 14. Create Notifications
  await prisma.notification.createMany({
    data: [
      { title: 'Low Stock Alert', message: 'Product Amul Taaza Toned Milk is below safety stock limits (4 left).', type: NotificationType.LOW_STOCK },
      { title: 'Expiry Warning', message: 'Product Amul Taaza Toned Milk is expiring in 2 days.', type: NotificationType.EXPIRY_ALERT },
    ],
  });

  // 15. Create Audit Log
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'DATABASE_SEED',
      details: 'Initial corporate master data loaded into tables.',
      ipAddress: '127.0.0.1',
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
