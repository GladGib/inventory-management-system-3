import { PrismaClient, TaxType, ItemType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test organization
  let organization = await prisma.organization.findFirst({
    where: { slug: 'demo-company' },
  });

  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        name: 'Demo Company',
        slug: 'demo-company',
        industry: 'AUTO_PARTS',
        email: 'admin@demo.com',
        phone: '+60123456789',
        baseCurrency: 'MYR',
        timezone: 'Asia/Kuala_Lumpur',
      },
    });
  }

  console.log(`Organization: ${organization.name}`);

  // Create default warehouse
  let warehouse = await prisma.warehouse.findFirst({
    where: { organizationId: organization.id, code: 'MAIN' },
  });

  if (!warehouse) {
    warehouse = await prisma.warehouse.create({
      data: {
        organizationId: organization.id,
        name: 'Main Warehouse',
        code: 'MAIN',
        isDefault: true,
        address: '123 Main Street, Kuala Lumpur',
      },
    });
  }

  console.log(`Warehouse: ${warehouse.name}`);

  // Create default tax rates
  const taxRates = [
    { name: 'SST 10%', rate: 10, type: TaxType.SST, description: 'Standard Sales and Service Tax', isDefault: true },
    { name: 'Service Tax 6%', rate: 6, type: TaxType.SERVICE_TAX, description: 'Service Tax', isDefault: false },
    { name: 'Zero Rated', rate: 0, type: TaxType.ZERO_RATED, description: 'Zero rated supplies', isDefault: false },
    { name: 'Exempt', rate: 0, type: TaxType.EXEMPT, description: 'Tax exempt supplies', isDefault: false },
  ];

  for (const tax of taxRates) {
    const existing = await prisma.taxRate.findFirst({
      where: { organizationId: organization.id, name: tax.name },
    });
    if (!existing) {
      await prisma.taxRate.create({
        data: { organizationId: organization.id, ...tax },
      });
    }
  }
  console.log('Tax rates created');

  // Create default payment terms
  const paymentTerms = [
    { name: 'Due on Receipt', days: 0, description: 'Payment due immediately', isDefault: false },
    { name: 'Net 7', days: 7, description: 'Payment due in 7 days', isDefault: false },
    { name: 'Net 14', days: 14, description: 'Payment due in 14 days', isDefault: false },
    { name: 'Net 30', days: 30, description: 'Payment due in 30 days', isDefault: true },
    { name: 'Net 60', days: 60, description: 'Payment due in 60 days', isDefault: false },
  ];

  for (const term of paymentTerms) {
    const existing = await prisma.paymentTerm.findFirst({
      where: { organizationId: organization.id, name: term.name },
    });
    if (!existing) {
      await prisma.paymentTerm.create({
        data: { organizationId: organization.id, ...term },
      });
    }
  }
  console.log('Payment terms created');

  // Create admin user
  let adminUser = await prisma.user.findFirst({
    where: { email: 'admin@demo.com' },
  });

  if (!adminUser) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@demo.com',
        passwordHash,
        name: 'Admin User',
        phone: '+60123456789',
        role: 'ADMIN',
        organizationId: organization.id,
      },
    });
  }
  console.log(`Admin user: ${adminUser.email}`);

  // Create categories
  const categories = [
    { name: 'Engine Parts', description: 'Engine components and accessories' },
    { name: 'Brake System', description: 'Brake pads, rotors, and components' },
    { name: 'Suspension', description: 'Shocks, struts, and suspension parts' },
    { name: 'Electrical', description: 'Batteries, alternators, starters' },
    { name: 'Filters', description: 'Oil, air, and fuel filters' },
  ];

  for (const cat of categories) {
    const existing = await prisma.category.findFirst({
      where: { organizationId: organization.id, name: cat.name },
    });
    if (!existing) {
      await prisma.category.create({
        data: { organizationId: organization.id, ...cat },
      });
    }
  }
  console.log('Categories created');

  // Create sample items
  const filtersCategory = await prisma.category.findFirst({
    where: { organizationId: organization.id, name: 'Filters' },
  });

  const defaultTaxRate = await prisma.taxRate.findFirst({
    where: { organizationId: organization.id, isDefault: true },
  });

  const sampleItems = [
    {
      sku: 'OIL-FILTER-001',
      name: 'Oil Filter - Toyota',
      description: 'High quality oil filter for Toyota vehicles',
      type: ItemType.INVENTORY,
      unit: 'PCS',
      brand: 'Denso',
      partNumber: '90915-YZZD1',
      costPrice: 15.00,
      sellingPrice: 25.00,
      reorderLevel: 10,
      reorderQty: 50,
    },
    {
      sku: 'AIR-FILTER-001',
      name: 'Air Filter - Honda',
      description: 'OEM quality air filter for Honda vehicles',
      type: ItemType.INVENTORY,
      unit: 'PCS',
      brand: 'Honda',
      partNumber: '17220-RNA-A00',
      costPrice: 20.00,
      sellingPrice: 35.00,
      reorderLevel: 15,
      reorderQty: 30,
    },
    {
      sku: 'BRAKE-PAD-001',
      name: 'Front Brake Pads - Universal',
      description: 'High performance ceramic brake pads',
      type: ItemType.INVENTORY,
      unit: 'SET',
      brand: 'Brembo',
      partNumber: 'P85020',
      costPrice: 80.00,
      sellingPrice: 150.00,
      reorderLevel: 5,
      reorderQty: 20,
    },
  ];

  for (const item of sampleItems) {
    const existingItem = await prisma.item.findFirst({
      where: { organizationId: organization.id, sku: item.sku },
    });

    if (!existingItem) {
      const createdItem = await prisma.item.create({
        data: {
          organizationId: organization.id,
          categoryId: filtersCategory?.id,
          taxRateId: defaultTaxRate?.id,
          ...item,
        },
      });

      await prisma.stockLevel.create({
        data: {
          itemId: createdItem.id,
          warehouseId: warehouse.id,
          stockOnHand: 100,
          committedStock: 0,
          incomingStock: 0,
        },
      });
    }
  }
  console.log('Sample items created');

  // Create sample customer
  const existingCustomer = await prisma.contact.findFirst({
    where: { organizationId: organization.id, displayName: 'ABC Auto Parts Sdn Bhd' },
  });

  if (!existingCustomer) {
    await prisma.contact.create({
      data: {
        organizationId: organization.id,
        type: 'CUSTOMER',
        companyName: 'ABC Auto Parts Sdn Bhd',
        displayName: 'ABC Auto Parts Sdn Bhd',
        email: 'contact@abcauto.com.my',
        phone: '+60312345678',
        creditLimit: 50000,
      },
    });
  }

  // Create sample vendor
  const existingVendor = await prisma.contact.findFirst({
    where: { organizationId: organization.id, displayName: 'Parts Supplier Co' },
  });

  if (!existingVendor) {
    await prisma.contact.create({
      data: {
        organizationId: organization.id,
        type: 'VENDOR',
        companyName: 'Parts Supplier Co',
        displayName: 'Parts Supplier Co',
        email: 'sales@partssupplier.com',
        phone: '+60387654321',
      },
    });
  }
  console.log('Sample contacts created');

  console.log('\n========================================');
  console.log('Database seeded successfully!');
  console.log('========================================');
  console.log('\nTest Credentials:');
  console.log('  Email: admin@demo.com');
  console.log('  Password: admin123');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
