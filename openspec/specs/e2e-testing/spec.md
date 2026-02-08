# End-to-End Testing (Playwright)

## Overview
Comprehensive end-to-end test suite using Playwright for the IMS application. Tests cover critical user workflows across authentication, inventory management, sales and purchase cycles, reporting, and settings. Tests are organized by feature area with shared utilities for authentication, data seeding, and cleanup.

## Requirements

### E2E-001: Playwright Configuration
- **Priority**: P0
- **Description**: Configure Playwright for the IMS test environment
- **Acceptance Criteria**:
  - Test directory: `apps/web/e2e/`
  - Configuration file: `apps/web/playwright.config.ts`
  - Base URL: `http://localhost:3000` (configurable via env)
  - API URL: `http://localhost:3001` (configurable via env)
  - Browsers: Chromium (primary), Firefox, WebKit (CI only)
  - Viewport: 1280x720 (desktop), 375x667 (mobile tests)
  - Screenshot on failure: enabled
  - Video on failure: retain-on-failure
  - Trace on failure: retain-on-failure
  - Timeout: 30 seconds per test, 60 seconds for navigation
  - Retries: 0 locally, 2 in CI
  - Workers: 1 (serial execution due to shared database state)
  - Global setup: start dev servers if not running, seed database
  - Global teardown: cleanup test data

### E2E-002: Authentication Setup
- **Priority**: P0
- **Description**: Shared authentication state for tests
- **Acceptance Criteria**:
  - Auth setup file: `apps/web/e2e/setup/auth.setup.ts`
  - Creates test user via API seeding (not UI registration)
  - Performs login and saves storage state to `apps/web/e2e/.auth/user.json`
  - Tests can use saved auth state (no re-login per test)
  - Support multiple auth roles: admin, manager, staff, viewer
  - Auth state files per role: `.auth/admin.json`, `.auth/staff.json`
  - Refresh auth state before test suite if expired

### E2E-003: Test Data Seeding
- **Priority**: P0
- **Description**: Seed test data for reliable test execution
- **Acceptance Criteria**:
  - Seed script: `apps/web/e2e/helpers/seed.ts`
  - Creates test organization with known settings
  - Creates test users with each role
  - Creates test data:
    - 5 categories (Auto Parts, Hardware, Electrical, Plumbing, General)
    - 10 items with stock levels across 2 warehouses
    - 3 customers and 3 vendors
    - Tax rates (SST 10%, Service Tax 6%, Zero Rated, Exempt)
    - Payment terms (Net 30, Net 60, COD)
    - 2 warehouses (Main Warehouse, Secondary Warehouse)
  - Seed data uses deterministic IDs for reliable test references
  - Cleanup function to reset database to seeded state between test files

### E2E-004: Test Helpers & Utilities
- **Priority**: P0
- **Description**: Shared test utilities and page object models
- **Acceptance Criteria**:
  - Helper files in `apps/web/e2e/helpers/`
  - `login.ts`: Login utility function
    ```typescript
    async function login(page: Page, email: string, password: string): Promise<void>
    ```
  - `api.ts`: Direct API call helpers for setup/teardown
    ```typescript
    async function createItem(data: Partial<Item>): Promise<Item>
    async function createSalesOrder(data: Partial<SalesOrder>): Promise<SalesOrder>
    async function createPurchaseOrder(data: Partial<PurchaseOrder>): Promise<PurchaseOrder>
    async function cleanup(entityType: string, id: string): Promise<void>
    ```
  - `assertions.ts`: Custom assertion helpers
    ```typescript
    async function expectToast(page: Page, message: string): Promise<void>
    async function expectTableRowCount(page: Page, count: number): Promise<void>
    async function expectBreadcrumb(page: Page, text: string): Promise<void>
    ```
  - `navigation.ts`: Navigation helpers
    ```typescript
    async function navigateToSidebar(page: Page, menuItem: string, subItem?: string): Promise<void>
    async function waitForPageLoad(page: Page): Promise<void>
    ```
  - `forms.ts`: Form interaction helpers
    ```typescript
    async function fillAntSelect(page: Page, label: string, value: string): Promise<void>
    async function fillAntDatePicker(page: Page, label: string, date: string): Promise<void>
    async function fillAntInput(page: Page, label: string, value: string): Promise<void>
    ```

### E2E-005: Authentication Tests
- **Priority**: P0
- **Description**: Test authentication flows
- **Test File**: `apps/web/e2e/auth.spec.ts`
- **Test Cases**:

  #### auth-001: Successful login
  - Navigate to `/login`
  - Enter valid email and password
  - Click "Sign In" button
  - **Assert**: redirected to `/dashboard`
  - **Assert**: user name displayed in header
  - **Assert**: sidebar navigation visible

  #### auth-002: Failed login with wrong password
  - Navigate to `/login`
  - Enter valid email and wrong password
  - Click "Sign In"
  - **Assert**: error message "Invalid credentials" displayed
  - **Assert**: remains on `/login`

  #### auth-003: Failed login with non-existent email
  - Navigate to `/login`
  - Enter non-existent email
  - Click "Sign In"
  - **Assert**: error message displayed
  - **Assert**: remains on `/login`

  #### auth-004: Login form validation
  - Navigate to `/login`
  - Click "Sign In" without entering credentials
  - **Assert**: validation errors shown for email and password fields

  #### auth-005: Protected route redirect
  - Clear auth state
  - Navigate to `/dashboard`
  - **Assert**: redirected to `/login`
  - **Assert**: original URL preserved for post-login redirect

  #### auth-006: Logout
  - Login as test user
  - Click user dropdown in header
  - Click "Sign Out"
  - **Assert**: redirected to `/login`
  - **Assert**: subsequent navigation to `/dashboard` redirects to `/login`

  #### auth-007: Token refresh
  - Login as test user
  - Wait for access token to expire (or mock expiry)
  - Make an API call
  - **Assert**: token refreshed automatically
  - **Assert**: user remains logged in

### E2E-006: Items Management Tests
- **Priority**: P0
- **Description**: Test item CRUD operations
- **Test File**: `apps/web/e2e/items.spec.ts`
- **Test Cases**:

  #### items-001: Create new item
  - Navigate to Items list
  - Click "New Item" button
  - Fill in: SKU, Name, Category, Cost Price, Selling Price, Unit
  - Enable inventory tracking
  - Click "Save"
  - **Assert**: success toast message
  - **Assert**: redirected to item detail page
  - **Assert**: item data displayed correctly

  #### items-002: Edit existing item
  - Navigate to a seeded item's detail page
  - Click "Edit"
  - Change name and selling price
  - Click "Save"
  - **Assert**: success toast
  - **Assert**: updated values displayed

  #### items-003: Search items
  - Navigate to Items list
  - Enter search term in search box (known item name)
  - **Assert**: filtered results contain expected item
  - **Assert**: non-matching items not shown

  #### items-004: Filter items by category
  - Navigate to Items list
  - Select a category from filter dropdown
  - **Assert**: only items in that category displayed

  #### items-005: Delete draft item
  - Create a new item via API
  - Navigate to item detail page
  - Click "Delete" button
  - Confirm deletion
  - **Assert**: success toast
  - **Assert**: item no longer in list

  #### items-006: View stock levels
  - Navigate to a seeded item with stock
  - **Assert**: stock on hand displayed per warehouse
  - **Assert**: committed stock shown
  - **Assert**: available stock calculated correctly

  #### items-007: Items list pagination
  - Ensure more than 20 items exist (via seeding)
  - Navigate to Items list
  - **Assert**: first page shows 20 items
  - Click next page
  - **Assert**: next page loads with remaining items

### E2E-007: Sales Workflow Tests
- **Priority**: P0
- **Description**: Test complete sales cycle from quote to payment
- **Test File**: `apps/web/e2e/sales-workflow.spec.ts`
- **Test Cases**:

  #### sales-001: Create sales order
  - Navigate to Sales Orders
  - Click "New Sales Order"
  - Select a customer
  - Add 2 line items from seeded items
  - Set quantities and verify price auto-fill
  - **Assert**: subtotal, tax, and total calculated correctly
  - Click "Save as Draft"
  - **Assert**: success toast
  - **Assert**: order status is DRAFT

  #### sales-002: Confirm sales order
  - Create a draft SO (via API or previous test)
  - Navigate to SO detail page
  - Click "Confirm"
  - Confirm in modal
  - **Assert**: status changes to CONFIRMED
  - **Assert**: stock committed (check stock levels)

  #### sales-003: Create invoice from sales order
  - Using confirmed SO from previous test
  - Click "Create Invoice"
  - Verify line items pre-filled from SO
  - Set due date
  - Click "Save"
  - **Assert**: invoice created
  - **Assert**: SO invoice status updated to INVOICED
  - **Assert**: invoice linked to SO

  #### sales-004: Record payment against invoice
  - Using invoice from previous test
  - Navigate to invoice detail
  - Click "Record Payment"
  - Enter full payment amount
  - Select payment method: Bank Transfer
  - Enter reference number
  - Click "Save"
  - **Assert**: payment recorded
  - **Assert**: invoice status = PAID, balance = 0
  - **Assert**: SO payment status = PAID

  #### sales-005: Partial payment workflow
  - Create SO, confirm, create invoice (via API for speed)
  - Record partial payment (50% of total)
  - **Assert**: invoice status = PARTIALLY_PAID
  - **Assert**: balance shows remaining amount
  - Record second payment for remaining balance
  - **Assert**: invoice status = PAID

  #### sales-006: Cancel sales order
  - Create and confirm an SO
  - Click "Cancel Order"
  - Enter cancellation reason
  - Confirm
  - **Assert**: status = CANCELLED
  - **Assert**: committed stock released

### E2E-008: Purchase Workflow Tests
- **Priority**: P0
- **Description**: Test complete purchase cycle
- **Test File**: `apps/web/e2e/purchase-workflow.spec.ts`
- **Test Cases**:

  #### purchase-001: Create purchase order
  - Navigate to Purchase Orders
  - Click "New Purchase Order"
  - Select a vendor
  - Add 2 line items
  - Set expected delivery date
  - Select delivery warehouse
  - Click "Save as Draft"
  - **Assert**: PO created in DRAFT status

  #### purchase-002: Issue purchase order
  - Using draft PO from previous test
  - Click "Issue"
  - Confirm
  - **Assert**: status = ISSUED

  #### purchase-003: Receive goods against PO
  - Using issued PO
  - Click "Create Receive"
  - Verify items pre-filled from PO
  - Enter received quantities (full receive)
  - Click "Save"
  - **Assert**: receive record created
  - **Assert**: PO status = RECEIVED
  - **Assert**: stock on hand increased in delivery warehouse

  #### purchase-004: Partial receive workflow
  - Create and issue PO (via API)
  - Receive 50% of quantities
  - **Assert**: PO status = PARTIALLY_RECEIVED
  - Receive remaining quantities
  - **Assert**: PO status = RECEIVED

  #### purchase-005: Create bill from PO
  - Using fully received PO
  - Click "Create Bill"
  - Verify items pre-filled
  - Enter vendor bill number
  - Set due date
  - Click "Save"
  - **Assert**: bill created
  - **Assert**: PO bill status updated

  #### purchase-006: Record vendor payment
  - Using bill from previous test
  - Navigate to bill detail
  - Click "Record Payment"
  - Enter payment amount and method
  - Click "Save"
  - **Assert**: payment recorded
  - **Assert**: bill status = PAID

### E2E-009: Inventory Tests
- **Priority**: P0
- **Description**: Test inventory operations
- **Test File**: `apps/web/e2e/inventory.spec.ts`
- **Test Cases**:

  #### inventory-001: Create stock adjustment (increase)
  - Navigate to Inventory > Adjustments
  - Click "New Adjustment"
  - Select warehouse
  - Select adjustment type: INCREASE
  - Add item and quantity
  - Enter reason
  - Click "Save"
  - **Assert**: adjustment created
  - **Assert**: stock level increased

  #### inventory-002: Create stock adjustment (decrease)
  - Navigate to Inventory > Adjustments
  - Create DECREASE adjustment for seeded item
  - **Assert**: stock level decreased
  - **Assert**: cannot decrease below 0 (validation)

  #### inventory-003: Create inventory transfer
  - Navigate to Inventory > Transfers
  - Click "New Transfer"
  - Select source warehouse (with stock)
  - Select target warehouse
  - Add items and quantities
  - Click "Save as Draft"
  - **Assert**: transfer in DRAFT status

  #### inventory-004: Issue and receive transfer
  - Using draft transfer
  - Click "Issue Transfer"
  - **Assert**: status = IN_TRANSIT
  - **Assert**: source warehouse stock decreased
  - Click "Receive Transfer"
  - Enter received quantities
  - **Assert**: status = RECEIVED
  - **Assert**: target warehouse stock increased

  #### inventory-005: View stock movement history
  - Navigate to a seeded item's stock tab
  - **Assert**: stock movement log shows all adjustments and transfers

### E2E-010: Reports Tests
- **Priority**: P1
- **Description**: Test report pages
- **Test File**: `apps/web/e2e/reports.spec.ts`
- **Test Cases**:

  #### reports-001: Navigate to sales report
  - Navigate to Reports > Sales Reports
  - **Assert**: page loads without errors
  - **Assert**: date filters visible
  - Apply date range filter
  - **Assert**: report data loads (table or chart)

  #### reports-002: Navigate to purchase report
  - Navigate to Reports > Purchase by Vendor
  - **Assert**: page loads
  - Apply vendor filter
  - **Assert**: filtered data displayed

  #### reports-003: Navigate to inventory reports
  - Navigate to Reports > Inventory Summary
  - **Assert**: page loads
  - **Assert**: stock values displayed per warehouse

  #### reports-004: Navigate to stock aging report
  - Navigate to Reports > Stock Aging
  - **Assert**: page loads with aging buckets (0-30, 31-60, 61-90, 90+)

  #### reports-005: Export report to Excel
  - Navigate to any report page
  - Click "Export" button
  - Select Excel format
  - **Assert**: file download initiated
  - **Assert**: file has `.xlsx` extension

  #### reports-006: Export report to CSV
  - Navigate to any report page
  - Click "Export" button
  - Select CSV format
  - **Assert**: file download initiated

### E2E-011: Settings Tests
- **Priority**: P1
- **Description**: Test settings pages
- **Test File**: `apps/web/e2e/settings.spec.ts`
- **Test Cases**:

  #### settings-001: Update organization settings
  - Navigate to Settings > Organization
  - Update organization name
  - Click "Save"
  - **Assert**: success toast
  - **Assert**: updated name displayed in settings

  #### settings-002: Manage tax rates
  - Navigate to Settings > Tax Rates
  - **Assert**: seeded tax rates displayed
  - Click "Add Tax Rate"
  - Fill in: name, code, rate, type
  - Click "Save"
  - **Assert**: new tax rate in list

  #### settings-003: Edit tax rate
  - Click edit on existing tax rate
  - Change rate value
  - Save
  - **Assert**: updated rate displayed

  #### settings-004: Manage payment terms
  - Navigate to Settings > Payment Terms
  - **Assert**: seeded payment terms displayed
  - Create new payment term
  - **Assert**: new term in list

  #### settings-005: Configure e-Invoice settings
  - Navigate to Settings > E-Invoice
  - **Assert**: form loads with current settings
  - Toggle e-Invoice enabled
  - Fill in TIN and BRN
  - Click "Save"
  - **Assert**: settings saved

  #### settings-006: Manage warehouses
  - Navigate to Settings > Warehouses
  - **Assert**: seeded warehouses displayed
  - Create new warehouse
  - **Assert**: new warehouse in list

## Configuration

### playwright.config.ts

```typescript
// apps/web/playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Serial execution for shared state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'e2e-report' }],
    ['junit', { outputFile: 'e2e-results.xml' }],
    process.env.CI ? ['github'] : ['list'],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    // Auth setup - runs first
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Desktop Chrome tests
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
    },
    // Firefox (CI only)
    ...(process.env.CI ? [{
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
    }] : []),
    // WebKit (CI only)
    ...(process.env.CI ? [{
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
    }] : []),
  ],
  // Web server config
  webServer: [
    {
      command: 'cd ../api && npm run start:dev',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'npm run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
```

### Auth Setup

```typescript
// apps/web/e2e/setup/auth.setup.ts

import { test as setup, expect } from '@playwright/test';

const ADMIN_USER = {
  email: 'admin@test-ims.com',
  password: 'TestAdmin123!',
};

const STAFF_USER = {
  email: 'staff@test-ims.com',
  password: 'TestStaff123!',
};

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN_USER.email);
  await page.getByLabel('Password').fill(ADMIN_USER.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('/dashboard');
  await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
  await page.context().storageState({ path: 'e2e/.auth/admin.json' });
});

setup('authenticate as staff', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(STAFF_USER.email);
  await page.getByLabel('Password').fill(STAFF_USER.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: 'e2e/.auth/staff.json' });
});
```

### Test Data Seed Script

```typescript
// apps/web/e2e/helpers/seed.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seedTestData() {
  // Clean existing test data
  await cleanTestData();

  // Create organization
  const org = await prisma.organization.create({
    data: {
      id: 'test-org-001',
      name: 'Test Auto Parts Sdn Bhd',
      slug: 'test-auto-parts',
      industry: 'AUTO_PARTS',
      baseCurrency: 'MYR',
      timezone: 'Asia/Kuala_Lumpur',
      sstNumber: 'W10-1234-56789012',
      businessRegNo: '202401012345',
      email: 'admin@test-ims.com',
      phone: '+60312345678',
    },
  });

  // Create users
  const passwordHash = await bcrypt.hash('TestAdmin123!', 10);
  await prisma.user.create({
    data: {
      id: 'test-admin-001',
      email: 'admin@test-ims.com',
      passwordHash,
      name: 'Test Admin',
      role: 'ADMIN',
      organizationId: org.id,
    },
  });

  const staffHash = await bcrypt.hash('TestStaff123!', 10);
  await prisma.user.create({
    data: {
      id: 'test-staff-001',
      email: 'staff@test-ims.com',
      passwordHash: staffHash,
      name: 'Test Staff',
      role: 'STAFF',
      organizationId: org.id,
    },
  });

  // Create warehouses
  await prisma.warehouse.createMany({
    data: [
      { id: 'test-wh-001', organizationId: org.id, name: 'Main Warehouse', code: 'MAIN', isDefault: true },
      { id: 'test-wh-002', organizationId: org.id, name: 'Secondary Warehouse', code: 'SEC' },
    ],
  });

  // Create categories
  await prisma.category.createMany({
    data: [
      { id: 'test-cat-001', organizationId: org.id, name: 'Auto Parts' },
      { id: 'test-cat-002', organizationId: org.id, name: 'Hardware' },
      { id: 'test-cat-003', organizationId: org.id, name: 'Electrical' },
      { id: 'test-cat-004', organizationId: org.id, name: 'Plumbing' },
      { id: 'test-cat-005', organizationId: org.id, name: 'General' },
    ],
  });

  // Create tax rates
  await prisma.taxRate.createMany({
    data: [
      { id: 'test-tax-001', organizationId: org.id, name: 'SST 10%', code: 'ST10', rate: 10, type: 'SST', isDefault: true },
      { id: 'test-tax-002', organizationId: org.id, name: 'Service Tax 6%', code: 'ST6', rate: 6, type: 'SERVICE_TAX' },
      { id: 'test-tax-003', organizationId: org.id, name: 'Zero Rated', code: 'ZR', rate: 0, type: 'ZERO_RATED' },
      { id: 'test-tax-004', organizationId: org.id, name: 'Exempt', code: 'EX', rate: 0, type: 'EXEMPT' },
    ],
  });

  // Create payment terms
  await prisma.paymentTerm.createMany({
    data: [
      { id: 'test-pt-001', organizationId: org.id, name: 'Net 30', days: 30, isDefault: true },
      { id: 'test-pt-002', organizationId: org.id, name: 'Net 60', days: 60 },
      { id: 'test-pt-003', organizationId: org.id, name: 'COD', days: 0 },
    ],
  });

  // Create items with stock
  const items = [
    { id: 'test-item-001', sku: 'BP-001', name: 'Brake Pad Set (Front)', costPrice: 45.00, sellingPrice: 89.90, categoryId: 'test-cat-001' },
    { id: 'test-item-002', sku: 'OF-001', name: 'Oil Filter', costPrice: 12.00, sellingPrice: 24.90, categoryId: 'test-cat-001' },
    { id: 'test-item-003', sku: 'SP-001', name: 'Spark Plug (4-pack)', costPrice: 28.00, sellingPrice: 55.00, categoryId: 'test-cat-001' },
    { id: 'test-item-004', sku: 'BT-001', name: 'Battery 12V 55AH', costPrice: 180.00, sellingPrice: 320.00, categoryId: 'test-cat-003' },
    { id: 'test-item-005', sku: 'WB-001', name: 'Wiper Blade 20"', costPrice: 15.00, sellingPrice: 32.00, categoryId: 'test-cat-001' },
    { id: 'test-item-006', sku: 'BLT-001', name: 'Hex Bolt M10x50 (50pcs)', costPrice: 8.50, sellingPrice: 18.00, categoryId: 'test-cat-002' },
    { id: 'test-item-007', sku: 'NUT-001', name: 'Hex Nut M10 (100pcs)', costPrice: 5.00, sellingPrice: 12.00, categoryId: 'test-cat-002' },
    { id: 'test-item-008', sku: 'CB-001', name: 'Circuit Breaker 20A', costPrice: 22.00, sellingPrice: 45.00, categoryId: 'test-cat-003' },
    { id: 'test-item-009', sku: 'PF-001', name: 'PVC Pipe Fitting 1"', costPrice: 3.50, sellingPrice: 8.00, categoryId: 'test-cat-004' },
    { id: 'test-item-010', sku: 'TP-001', name: 'Masking Tape 2"', costPrice: 4.00, sellingPrice: 9.50, categoryId: 'test-cat-005' },
  ];

  for (const item of items) {
    await prisma.item.create({
      data: {
        ...item,
        organizationId: org.id,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        unit: 'pcs',
        taxRateId: 'test-tax-001',
        taxable: true,
        trackInventory: true,
        createdById: 'test-admin-001',
      },
    });

    // Create stock levels in both warehouses
    await prisma.stockLevel.create({
      data: { itemId: item.id, warehouseId: 'test-wh-001', stockOnHand: 100 },
    });
    await prisma.stockLevel.create({
      data: { itemId: item.id, warehouseId: 'test-wh-002', stockOnHand: 50 },
    });
  }

  // Create customers
  await prisma.contact.createMany({
    data: [
      { id: 'test-cust-001', organizationId: org.id, type: 'CUSTOMER', companyName: 'ABC Auto Workshop', displayName: 'ABC Auto Workshop', email: 'abc@test.com', phone: '+60312340001', paymentTermId: 'test-pt-001' },
      { id: 'test-cust-002', organizationId: org.id, type: 'CUSTOMER', companyName: 'XYZ Motor Parts', displayName: 'XYZ Motor Parts', email: 'xyz@test.com', phone: '+60312340002', paymentTermId: 'test-pt-001' },
      { id: 'test-cust-003', organizationId: org.id, type: 'CUSTOMER', companyName: 'LMN Hardware Store', displayName: 'LMN Hardware Store', email: 'lmn@test.com', phone: '+60312340003', paymentTermId: 'test-pt-002' },
    ],
  });

  // Create vendors
  await prisma.contact.createMany({
    data: [
      { id: 'test-vend-001', organizationId: org.id, type: 'VENDOR', companyName: 'Global Auto Parts Sdn Bhd', displayName: 'Global Auto Parts', email: 'global@test.com', phone: '+60312340011', paymentTermId: 'test-pt-001' },
      { id: 'test-vend-002', organizationId: org.id, type: 'VENDOR', companyName: 'KL Hardware Supply', displayName: 'KL Hardware Supply', email: 'klhw@test.com', phone: '+60312340012', paymentTermId: 'test-pt-002' },
      { id: 'test-vend-003', organizationId: org.id, type: 'VENDOR', companyName: 'PJ Electrical Wholesale', displayName: 'PJ Electrical', email: 'pj@test.com', phone: '+60312340013', paymentTermId: 'test-pt-001' },
    ],
  });

  console.log('Test data seeded successfully');
}

export async function cleanTestData() {
  // Delete all test data in reverse dependency order
  const testOrgId = 'test-org-001';

  await prisma.paymentAllocation.deleteMany({ where: { payment: { organizationId: testOrgId } } });
  await prisma.payment.deleteMany({ where: { organizationId: testOrgId } });
  await prisma.vendorPaymentAllocation.deleteMany({ where: { vendorPayment: { organizationId: testOrgId } } });
  await prisma.vendorPayment.deleteMany({ where: { organizationId: testOrgId } });
  await prisma.invoiceItem.deleteMany({ where: { invoice: { organizationId: testOrgId } } });
  await prisma.invoice.deleteMany({ where: { organizationId: testOrgId } });
  await prisma.salesOrderItem.deleteMany({ where: { salesOrder: { organizationId: testOrgId } } });
  await prisma.salesOrder.deleteMany({ where: { organizationId: testOrgId } });
  await prisma.purchaseReceiveItem.deleteMany({ where: { purchaseReceive: { organizationId: testOrgId } } });
  await prisma.purchaseReceive.deleteMany({ where: { organizationId: testOrgId } });
  await prisma.billItem.deleteMany({ where: { bill: { organizationId: testOrgId } } });
  await prisma.bill.deleteMany({ where: { organizationId: testOrgId } });
  await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { organizationId: testOrgId } } });
  await prisma.purchaseOrder.deleteMany({ where: { organizationId: testOrgId } });
  await prisma.stockAdjustmentItem.deleteMany({ where: { stockAdjustment: { organizationId: testOrgId } } });
  await prisma.stockAdjustment.deleteMany({ where: { organizationId: testOrgId } });
  await prisma.inventoryTransferItem.deleteMany({ where: { inventoryTransfer: { organizationId: testOrgId } } });
  await prisma.inventoryTransfer.deleteMany({ where: { organizationId: testOrgId } });
  await prisma.stockLevel.deleteMany({ where: { item: { organizationId: testOrgId } } });
  await prisma.item.deleteMany({ where: { organizationId: testOrgId } });
  await prisma.category.deleteMany({ where: { organizationId: testOrgId } });
  await prisma.contact.deleteMany({ where: { organizationId: testOrgId } });
  await prisma.taxRate.deleteMany({ where: { organizationId: testOrgId } });
  await prisma.paymentTerm.deleteMany({ where: { organizationId: testOrgId } });
  await prisma.warehouse.deleteMany({ where: { organizationId: testOrgId } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: ['test-admin-001', 'test-staff-001'] } } });
  await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
  await prisma.organization.deleteMany({ where: { id: testOrgId } });

  console.log('Test data cleaned successfully');
}
```

## CI Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/e2e-tests.yml

name: E2E Tests

on:
  push:
    branches: [master, main, develop]
  pull_request:
    branches: [master, main]

env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ims_test
  JWT_SECRET: test-jwt-secret-key-12345
  JWT_REFRESH_SECRET: test-jwt-refresh-secret-key-12345
  E2E_BASE_URL: http://localhost:3000

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: ims_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Generate Prisma client
        run: pnpm --filter api prisma generate

      - name: Run database migrations
        run: pnpm --filter api prisma migrate deploy

      - name: Seed test data
        run: pnpm --filter web ts-node e2e/helpers/seed.ts

      - name: Install Playwright browsers
        run: pnpm --filter web playwright install --with-deps chromium firefox webkit

      - name: Build applications
        run: pnpm build

      - name: Run E2E tests
        run: pnpm --filter web playwright test
        env:
          CI: true

      - name: Upload test report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-report
          path: apps/web/e2e-report/
          retention-days: 14

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-results
          path: apps/web/e2e-results.xml
          retention-days: 14
```

## Visual Regression

### Screenshot Comparison

```typescript
// apps/web/e2e/visual/screenshots.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('dashboard page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('dashboard.png', {
      maxDiffPixelRatio: 0.01,
      fullPage: true,
    });
  });

  test('items list page', async ({ page }) => {
    await page.goto('/items');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('items-list.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('sales order form', async ({ page }) => {
    await page.goto('/sales/orders/new');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('sales-order-form.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('invoice detail', async ({ page }) => {
    // Navigate to a known invoice
    await page.goto('/sales/invoices');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('invoices-list.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('settings page', async ({ page }) => {
    await page.goto('/settings/organization');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('settings-org.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('login page', async ({ page, context }) => {
    // Clear auth state for login page screenshot
    await context.clearCookies();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('login.png', {
      maxDiffPixelRatio: 0.01,
    });
  });
});
```

### Visual Regression Configuration

- Baseline screenshots stored in `apps/web/e2e/visual/screenshots.spec.ts-snapshots/`
- Updated with `npx playwright test --update-snapshots`
- Max pixel difference ratio: 1% (accounts for anti-aliasing differences)
- Full page screenshots for key pages
- Run visual regression only on Chromium (cross-browser rendering varies too much)

## File Structure

```
apps/web/e2e/
  setup/
    auth.setup.ts                  # Authentication setup (runs first)
  helpers/
    seed.ts                        # Test data seeding
    login.ts                       # Login utility
    api.ts                         # Direct API helpers
    assertions.ts                  # Custom assertions
    navigation.ts                  # Navigation helpers
    forms.ts                       # Ant Design form helpers
  auth.spec.ts                     # Authentication tests
  items.spec.ts                    # Items management tests
  sales-workflow.spec.ts           # Sales cycle tests
  purchase-workflow.spec.ts        # Purchase cycle tests
  inventory.spec.ts                # Inventory operations tests
  reports.spec.ts                  # Reports tests
  settings.spec.ts                 # Settings tests
  visual/
    screenshots.spec.ts            # Visual regression tests
    screenshots.spec.ts-snapshots/ # Baseline screenshots
  .auth/
    admin.json                     # Admin auth state (gitignored)
    staff.json                     # Staff auth state (gitignored)
apps/web/playwright.config.ts      # Playwright configuration
```

## Dependencies

```json
{
  "@playwright/test": "^1.42.0"
}
```

## Environment Variables

```env
# E2E Test Configuration
E2E_BASE_URL=http://localhost:3000
E2E_API_URL=http://localhost:3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ims_test
JWT_SECRET=test-jwt-secret-key-12345
JWT_REFRESH_SECRET=test-jwt-refresh-secret-key-12345
```
