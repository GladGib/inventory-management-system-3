# Test Coverage (Backend Unit + Integration) Specification

## Purpose
Establish comprehensive automated test coverage for the NestJS backend API, targeting 80% coverage on business logic services and 100% coverage on critical financial calculations, using Jest 29, @nestjs/testing, and Supertest.

## Architecture

### Target Directories
- Unit tests: `apps/api/src/modules/<module>/<service>.service.spec.ts` (co-located with source)
- Integration tests: `apps/api/test/*.e2e-spec.ts`
- Test utilities: `apps/api/test/helpers/`
- Jest configuration: `apps/api/package.json` (unit), `apps/api/test/jest-e2e.json` (integration)

### Testing Stack
- **Jest 29.7.0** (already in devDependencies)
- **@nestjs/testing 10.3.0** (already in devDependencies)
- **supertest 6.3.4** (already in devDependencies)
- **ts-jest 29.1.1** (already in devDependencies)
- No new testing packages required

### Coverage Targets
| Category | Target |
|----------|--------|
| Service business logic (`*.service.ts`) | >= 80% line coverage |
| Financial calculations (invoice totals, tax, payments) | 100% line + branch coverage |
| Controllers | >= 60% (tested primarily through e2e) |
| DTOs / validation | >= 50% (covered by service + e2e tests) |
| Overall project | >= 70% |

---

## Requirements

### Requirement: Test utilities and helpers
The system SHALL provide shared test utilities in `apps/api/test/helpers/` to reduce boilerplate across all test files.

#### Scenario: Prisma mock factory (`prisma-mock.ts`)
- **WHEN** a unit test needs to mock the Prisma client
- **THEN** `createMockPrismaService()` SHALL return a deeply-mocked `PrismaService` object with:
  - All model accessors (`item`, `contact`, `salesOrder`, `invoice`, `purchaseOrder`, `bill`, `stockLevel`, `stockAdjustment`, `inventoryTransfer`, `batch`, `serialNumber`, `taxRate`, `warehouse`, `compositeItem`, `bomComponent`, `assembly`, `eInvoiceSettings`, `eInvoiceSubmission`, `itemReorderSettings`, `reorderAlert`, `demandForecast`, `paymentTerm`, `priceList`, `creditNote`, `vendorCredit`, `salesReturn`) as Jest mock objects
  - Each model accessor SHALL have mocked methods: `findMany`, `findFirst`, `findUnique`, `create`, `update`, `updateMany`, `delete`, `deleteMany`, `count`, `aggregate`, `groupBy`
  - `$transaction` SHALL be mocked to execute the callback with the mock client itself (for simple transaction testing) or accept an array of promises
  - `$queryRaw` and `$executeRaw` SHALL be mocked as `jest.fn()`

#### Scenario: Auth mock helper (`auth-mock.ts`)
- **WHEN** an integration test needs to authenticate requests
- **THEN** `generateTestToken(payload?)` SHALL return a valid JWT token string with:
  - Default payload: `{ userId: 'test-user-id', email: 'test@example.com', organizationId: 'test-org-id', role: 'ADMIN' }`
  - Configurable payload overrides via the optional `payload` parameter
  - Signed with the test JWT secret (loaded from `process.env.JWT_SECRET` or fallback `'test-jwt-secret'`)
  - Expiry: 1 hour
- **AND** `createAuthHeader(token?)` SHALL return `{ Authorization: 'Bearer <token>' }` for use with supertest `.set()`

#### Scenario: Test data factories (`factory.ts`)
- **WHEN** a test needs sample data
- **THEN** the following factory functions SHALL be available, each returning complete entity objects with all required fields populated with realistic test data:
  - `createTestOrganization(overrides?)`: Returns a complete Organization object with defaults (name: 'Test Auto Parts Sdn Bhd', industry: 'AUTO_PARTS', baseCurrency: 'MYR', timezone: 'Asia/Kuala_Lumpur')
  - `createTestUser(overrides?)`: Returns a User object with defaults (email: 'user@test.com', role: 'ADMIN', organizationId: 'test-org-id')
  - `createTestItem(overrides?)`: Returns an Item object with defaults (sku: 'TEST-001', name: 'Test Brake Pad', type: 'INVENTORY', unit: 'pcs', costPrice: 25.00, sellingPrice: 45.00, trackInventory: true)
  - `createTestContact(overrides?)`: Returns a Contact object with defaults (type: 'CUSTOMER', companyName: 'Test Customer Sdn Bhd', displayName: 'Test Customer')
  - `createTestVendor(overrides?)`: Returns a Contact object with type 'VENDOR'
  - `createTestSalesOrder(overrides?)`: Returns a SalesOrder object with defaults (status: 'DRAFT', items: 1 line item)
  - `createTestInvoice(overrides?)`: Returns an Invoice object with defaults (status: 'DRAFT', subtotal, tax, total computed)
  - `createTestPurchaseOrder(overrides?)`: Returns a PurchaseOrder object with defaults (status: 'DRAFT')
  - `createTestBill(overrides?)`: Returns a Bill object with defaults
  - `createTestWarehouse(overrides?)`: Returns a Warehouse object with defaults (name: 'Main Warehouse', code: 'WH-MAIN')
  - `createTestTaxRate(overrides?)`: Returns a TaxRate object with defaults (name: 'SST 10%', code: 'SST-10', rate: 10, type: 'SST')
  - `createTestStockLevel(overrides?)`: Returns a StockLevel object with defaults (stockOnHand: 100, committedStock: 0)
  - `createTestBatch(overrides?)`: Returns a Batch object
  - `createTestSerialNumber(overrides?)`: Returns a SerialNumber object
  - `createTestPayment(overrides?)`: Returns a Payment object
- **AND** each factory SHALL use `cuid()`-like IDs (or sequential `'test-id-1'`, `'test-id-2'`) and `new Date().toISOString()` timestamps
- **AND** all Decimal fields SHALL be returned as numbers (since Prisma Decimal is serialized for test purposes)

---

### Requirement: Items service unit tests
The system SHALL provide unit tests in `apps/api/src/modules/items/items.service.spec.ts`.

#### Scenario: CRUD operations
- **Test: findAll returns paginated items with stock calculations**
  - Mock `prisma.item.findMany` to return 3 items with stockLevels
  - Mock `prisma.item.count` to return total count
  - Assert the service returns items with computed `totalStockOnHand` and `availableStock`
  - Assert pagination meta (total, page, limit) is correct

- **Test: findAll applies search filter across SKU, name, and partNumber**
  - Call `findAll` with `{ search: 'brake' }`
  - Assert `prisma.item.findMany` was called with `OR` clause containing `contains: 'brake'` for sku, name, partNumber

- **Test: findAll applies type, status, categoryId, and brand filters**
  - Call `findAll` with each filter individually
  - Assert the `where` clause includes the correct filter

- **Test: findOne returns item with full details**
  - Mock `prisma.item.findFirst` to return an item with category, taxRate, stockLevels
  - Assert the service returns the complete item

- **Test: findOne throws NotFoundException for missing item**
  - Mock `prisma.item.findFirst` to return null
  - Assert the service throws `NotFoundException`

- **Test: create creates item with all fields**
  - Mock `prisma.item.findFirst` (for duplicate SKU check) to return null
  - Mock `prisma.item.create` to return the created item
  - Assert the service calls create with correct data mapping

- **Test: create throws ConflictException for duplicate SKU**
  - Mock `prisma.item.findFirst` to return an existing item with the same SKU
  - Assert the service throws `ConflictException`

- **Test: update merges partial data correctly**
  - Mock `prisma.item.findFirst` to return existing item
  - Mock `prisma.item.update` to return updated item
  - Assert only provided fields are passed to update

- **Test: delete soft-deletes by setting status to INACTIVE**
  - Mock `prisma.item.findFirst` to return existing item
  - Assert `prisma.item.update` is called with `status: 'INACTIVE'`

---

### Requirement: Inventory service unit tests
The system SHALL provide unit tests in `apps/api/src/modules/inventory/inventory.service.spec.ts`.

#### Scenario: Stock level queries
- **Test: getStockLevels returns computed available stock and stock value**
  - Mock `prisma.stockLevel.findMany` to return stock levels with items
  - Assert `availableStock = stockOnHand - committedStock`
  - Assert `stockValue = stockOnHand * costPrice`
  - Assert `isLowStock` flag is computed correctly against `reorderLevel`

- **Test: getStockLevels filters by warehouseId when provided**
  - Call with `warehouseId` parameter
  - Assert the `where` clause includes `warehouseId`

#### Scenario: Adjustment calculations
- **Test: createAdjustment increases stock on positive quantity**
  - Mock item and stockLevel lookups
  - Assert `stockLevel.update` is called with `stockOnHand` incremented by adjustment quantity
  - Assert adjustment record is created with correct type and quantity

- **Test: createAdjustment decreases stock on negative quantity**
  - Assert `stockOnHand` is decremented
  - Assert it does NOT go below 0 if business rule enforces it (or throws BadRequestException)

- **Test: createAdjustment throws NotFoundException for missing item**
  - Mock `prisma.item.findFirst` returning null
  - Assert NotFoundException is thrown

- **Test: createAdjustment creates stock level if none exists**
  - Mock `prisma.stockLevel.findFirst` returning null
  - Assert `prisma.stockLevel.create` is called before applying the adjustment

#### Scenario: Transfer workflow
- **Test: createTransfer creates transfer with DRAFT status**
  - Assert the transfer is created with `status: 'DRAFT'` and correct source/destination warehouse IDs
  - Assert transfer items are created

- **Test: issueTransfer transitions status from DRAFT to IN_TRANSIT**
  - Mock transfer with `status: 'DRAFT'`
  - Assert status is updated to `'IN_TRANSIT'`
  - Assert source warehouse stock is decremented for each transfer item

- **Test: issueTransfer throws BadRequestException if status is not DRAFT**
  - Mock transfer with `status: 'RECEIVED'`
  - Assert BadRequestException is thrown

- **Test: receiveTransfer transitions status from IN_TRANSIT to RECEIVED**
  - Mock transfer with `status: 'IN_TRANSIT'`
  - Assert status is updated to `'RECEIVED'`
  - Assert destination warehouse stock is incremented for each transfer item

- **Test: cancelTransfer restores source warehouse stock if transfer was IN_TRANSIT**
  - Mock transfer with `status: 'IN_TRANSIT'`
  - Assert source warehouse stock is restored
  - Assert status is updated to `'CANCELLED'`

---

### Requirement: Sales orders service unit tests
The system SHALL provide unit tests in `apps/api/src/modules/sales/sales.service.spec.ts` (or the corresponding sales order service file).

#### Scenario: Order workflow
- **Test: createSalesOrder generates sequential order number**
  - Mock last order with `orderNumber: 'SO-000005'`
  - Assert new order gets `orderNumber: 'SO-000006'`

- **Test: createSalesOrder calculates line item totals correctly**
  - Provide items with quantity, unitPrice, discountPercent
  - Assert `lineTotal = quantity * unitPrice`
  - Assert `discountAmount = lineTotal * discountPercent / 100`
  - Assert `amount = lineTotal - discountAmount + taxAmount`

- **Test: createSalesOrder applies order-level percentage discount**
  - Provide `discountType: 'PERCENTAGE'`, `discountValue: 10`
  - Assert `orderDiscountAmount = subtotal * 10 / 100`

- **Test: createSalesOrder applies order-level fixed discount**
  - Provide `discountType: 'FIXED'`, `discountValue: 50`
  - Assert `orderDiscountAmount = 50`

- **Test: createSalesOrder validates customer exists and belongs to organization**
  - Mock `prisma.contact.findFirst` returning null
  - Assert NotFoundException with message 'Customer not found'

- **Test: createSalesOrder validates all item IDs exist**
  - Mock one item as not found
  - Assert NotFoundException with message containing the item ID

- **Test: confirmOrder transitions DRAFT to CONFIRMED**
  - Mock order with `status: 'DRAFT'`
  - Assert update to `status: 'CONFIRMED'`

- **Test: confirmOrder commits stock for each line item**
  - Assert `stockLevel.update` increments `committedStock` by line item quantity

- **Test: confirmOrder throws BadRequestException for non-DRAFT orders**
  - Mock order with `status: 'CONFIRMED'`
  - Assert BadRequestException

- **Test: shipOrder transitions CONFIRMED to SHIPPED**
  - Assert update to `status: 'SHIPPED'`
  - Assert `stockOnHand` is decremented and `committedStock` is decremented

- **Test: createInvoiceFromOrder generates invoice with matching line items**
  - Assert invoice is created with customer, items, and totals from the order

---

### Requirement: Sales invoices service unit tests
The system SHALL provide unit tests for invoice calculations.

#### Scenario: Financial calculations (100% coverage required)
- **Test: invoice subtotal calculation**
  - Given items: [{qty: 2, rate: 100}, {qty: 3, rate: 50.50}]
  - Assert `subtotal = (2 * 100) + (3 * 50.50) = 351.50`

- **Test: invoice line-level discount (percentage)**
  - Given item: {qty: 10, rate: 100, discountType: 'PERCENTAGE', discountValue: 15}
  - Assert `lineTotal = 1000`, `discount = 150`, `taxableAmount = 850`

- **Test: invoice line-level discount (fixed)**
  - Given item: {qty: 1, rate: 500, discountType: 'FIXED', discountValue: 50}
  - Assert `lineTotal = 500`, `discount = 50`, `taxableAmount = 450`

- **Test: invoice tax calculation with SST 10%**
  - Given taxableAmount = 850, taxRate = 10%
  - Assert `taxAmount = 85.00`

- **Test: invoice total = subtotal - orderDiscount + tax**
  - Assert `total = subtotal - discountAmount + totalTax`

- **Test: invoice with zero-rated items produces zero tax**
  - Given item with tax rate type 'ZERO_RATED'
  - Assert `taxAmount = 0` for that line

- **Test: invoice with tax-exempt items produces zero tax**
  - Given item with `taxable: false`
  - Assert `taxAmount = 0`

#### Scenario: Payment allocation
- **Test: recordPayment updates invoice balance**
  - Given invoice with `total: 1000`, `amountPaid: 0`
  - Record payment of 400
  - Assert `amountPaid = 400`, `balance = 600`, `status` remains 'SENT' or 'PARTIALLY_PAID'

- **Test: full payment marks invoice as PAID**
  - Given invoice with `total: 1000`, `amountPaid: 600`
  - Record payment of 400
  - Assert `amountPaid = 1000`, `balance = 0`, `status = 'PAID'`

- **Test: overpayment is handled correctly**
  - Given invoice with `total: 500`
  - Attempt payment of 600
  - Assert either error is thrown or overpayment is recorded as credit (depending on business rule)

---

### Requirement: Sales payments service unit tests
The system SHALL provide unit tests for payment recording and allocation.

#### Scenario: Multi-invoice payment allocation
- **Test: payment allocated across multiple invoices**
  - Given payment of 1000 with allocations: [{invoiceId: 'inv-1', amount: 600}, {invoiceId: 'inv-2', amount: 400}]
  - Assert each invoice's `amountPaid` is incremented by the allocation amount
  - Assert each invoice's balance is recalculated

- **Test: payment allocation exceeding invoice balance throws error**
  - Given invoice with balance 300
  - Attempt allocation of 400
  - Assert BadRequestException

---

### Requirement: Purchases orders service unit tests
The system SHALL provide unit tests in `apps/api/src/modules/purchases/purchases.service.spec.ts`.

#### Scenario: PO workflow
- **Test: createPurchaseOrder generates PO number sequentially**
  - Mock last PO with `orderNumber: 'PO-000010'`
  - Assert new PO gets `orderNumber: 'PO-000011'`

- **Test: createPurchaseOrder calculates totals correctly**
  - Same calculation logic as sales orders

- **Test: issuePO transitions DRAFT to ISSUED**
  - Assert status update

- **Test: receiveGoods creates receive record and updates stock**
  - Given PO with 2 items, receive all
  - Assert stockLevel for each item is incremented by received quantity
  - Assert PO receivedQty is updated per item

- **Test: receiveGoods with partial receive updates PO status to PARTIALLY_RECEIVED**
  - Receive 5 of 10 items
  - Assert PO status is 'PARTIALLY_RECEIVED'

- **Test: createBillFromPO generates bill with correct line items**
  - Assert bill line items match PO line items with correct pricing

---

### Requirement: Tax service unit tests
The system SHALL provide unit tests in `apps/api/src/modules/tax/tax.service.spec.ts`.

#### Scenario: SST calculation (100% coverage)
- **Test: SST 10% on standard goods**
  - Assert `calculateTax(1000, 'SST-10')` returns `{ taxAmount: 100, total: 1100 }`

- **Test: SST 8% service tax**
  - Assert `calculateTax(500, 'ST-8')` returns `{ taxAmount: 40, total: 540 }`

- **Test: zero-rated item**
  - Assert `calculateTax(1000, 'ZERO')` returns `{ taxAmount: 0, total: 1000 }`

- **Test: exempt item**
  - Assert `calculateTax(1000, 'EXEMPT')` returns `{ taxAmount: 0, total: 1000 }`

- **Test: tax breakdown for multiple line items with different tax rates**
  - Given: [{amount: 500, taxRateId: 'SST-10'}, {amount: 300, taxRateId: 'ST-8'}, {amount: 200, taxRateId: 'EXEMPT'}]
  - Assert breakdown: [{taxRateId: 'SST-10', taxableAmount: 500, taxAmount: 50}, {taxRateId: 'ST-8', taxableAmount: 300, taxAmount: 24}, {taxRateId: 'EXEMPT', taxableAmount: 200, taxAmount: 0}]
  - Assert `totalTax = 74`

- **Test: tax rate CRUD operations**
  - Create: Assert created with correct fields
  - Create duplicate code: Assert ConflictException
  - Update: Assert partial update
  - Setting isDefault unsets other defaults

---

### Requirement: E-Invoice service unit tests
The system SHALL provide unit tests in `apps/api/src/modules/einvoice/einvoice.service.spec.ts`.

#### Scenario: UBL XML generation
- **Test: generateUBLDocument produces valid XML structure**
  - Given a test invoice with items, tax, customer
  - Assert the output contains required UBL elements: `<Invoice>`, `<AccountingSupplierParty>`, `<AccountingCustomerParty>`, `<InvoiceLine>`, `<TaxTotal>`, `<LegalMonetaryTotal>`
  - Assert TIN, BRN, MSIC code are included in the supplier party

- **Test: generateUBLDocument formats amounts to 2 decimal places**
  - Assert monetary amounts in XML are formatted as strings with exactly 2 decimal places

- **Test: generateUBLDocument includes correct tax category codes**
  - Assert SST maps to the correct MyInvois classification code

#### Scenario: Submission mock
- **Test: submitInvoice calls MyInvois API with correct payload**
  - Mock the HTTP client
  - Assert the POST request is made to the correct sandbox URL
  - Assert the request includes the UBL document and authentication token

- **Test: submitInvoice stores submission result in database**
  - Assert `eInvoiceSubmission.create` is called with status and response data

#### Scenario: Cancellation window validation
- **Test: cancelInvoice within 72-hour window succeeds**
  - Mock submission created 24 hours ago
  - Assert cancellation proceeds

- **Test: cancelInvoice after 72-hour window throws BadRequestException**
  - Mock submission created 100 hours ago
  - Assert BadRequestException with message about cancellation window

---

### Requirement: Composite items service unit tests
The system SHALL provide unit tests in `apps/api/src/modules/composite/composite.service.spec.ts`.

#### Scenario: BOM cost rollup
- **Test: BOM cost is sum of component costs with wastage**
  - Given composite item with components: [{costPrice: 100, qty: 2, wastage: 5%}, {costPrice: 50, qty: 3, wastage: 0%}]
  - Assert BOM cost = `(100 * 2 * 1.05) + (50 * 3 * 1.00) = 210 + 150 = 360`

- **Test: BOM cost with zero wastage equals raw component total**
  - Assert no wastage adjustment

#### Scenario: Assembly stock check
- **Test: assembleItem checks all component stock is sufficient**
  - Given BOM requires: [{itemId: 'A', qty: 5}, {itemId: 'B', qty: 10}]
  - Mock stock: A=20, B=8
  - Assert BadRequestException for insufficient stock of item B

- **Test: assembleItem deducts component stock and increments composite stock**
  - Given sufficient stock for all components
  - Assert each component's `stockOnHand` is decremented by `qty * assemblyQty`
  - Assert composite item's `stockOnHand` is incremented by `assemblyQty`

#### Scenario: Disassembly
- **Test: disassemble deducts composite stock and increments component stock**
  - Given composite item with stock 10, disassemble 3
  - Assert composite `stockOnHand` decremented by 3
  - Assert each component `stockOnHand` incremented by `componentQty * 3`

- **Test: disassemble with insufficient composite stock throws error**
  - Assert BadRequestException

- **Test: self-referencing component is rejected**
  - Given composite where `itemId == componentItemId`
  - Assert BadRequestException

---

### Requirement: Reorder service unit tests
The system SHALL provide unit tests in `apps/api/src/modules/reorder/reorder.service.spec.ts`.

#### Scenario: Reorder point triggers
- **Test: checkReorderPoints identifies items below reorder level**
  - Given items with stock below reorder point
  - Assert alerts are generated for those items

- **Test: checkReorderPoints skips items at or above reorder level**
  - Given items with stock equal to reorder point
  - Assert no alerts generated

- **Test: checkReorderPoints respects warehouse-specific settings**
  - Given item with different reorder points per warehouse
  - Assert alerts are warehouse-specific

#### Scenario: Demand forecast calculation
- **Test: calculateDemandForecast uses historical sales data**
  - Mock sales order items for last 12 months
  - Assert forecast is based on average monthly demand

- **Test: calculateDemandForecast handles zero history gracefully**
  - Mock no sales history
  - Assert forecast returns 0 or uses fallback

---

### Requirement: Integration tests (E2E)
The system SHALL provide HTTP-level integration tests in `apps/api/test/`.

#### Scenario: Authentication e2e (`auth.e2e-spec.ts`)
- **Test: POST /api/v1/auth/register creates user and returns tokens**
  - Assert 201 status, response contains `accessToken`, `refreshToken`, `user`
  - Assert user can be fetched with the returned token

- **Test: POST /api/v1/auth/login with valid credentials returns tokens**
  - Assert 200 status with tokens

- **Test: POST /api/v1/auth/login with invalid password returns 401**
  - Assert 401 Unauthorized

- **Test: POST /api/v1/auth/refresh with valid refresh token returns new access token**
  - Assert 200 status with new `accessToken`

- **Test: Protected route without token returns 401**
  - GET /api/v1/items without Authorization header
  - Assert 401

- **Test: Protected route with expired token returns 401**
  - Generate token with 0 second expiry
  - Assert 401

#### Scenario: Items e2e (`items.e2e-spec.ts`)
- **Test: Full CRUD lifecycle**
  - POST /api/v1/items -> Assert 201, item created
  - GET /api/v1/items/:id -> Assert 200, item returned
  - PUT /api/v1/items/:id -> Assert 200, item updated
  - GET /api/v1/items?search=keyword -> Assert item appears in results
  - DELETE /api/v1/items/:id -> Assert 200, item soft-deleted
  - GET /api/v1/items/:id -> Assert item has status INACTIVE

- **Test: Duplicate SKU returns 409**
  - Create item with SKU 'TEST-001'
  - Create another item with SKU 'TEST-001'
  - Assert 409 Conflict

#### Scenario: Sales workflow e2e (`sales-workflow.e2e-spec.ts`)
- **Test: Quote to order to invoice to payment full flow**
  - Create customer contact
  - Create item
  - Create sales order (DRAFT)
  - Confirm sales order -> Assert CONFIRMED
  - Create invoice from order -> Assert invoice created with matching items
  - Record payment for full amount -> Assert invoice status PAID
  - Assert stock levels updated (committed on confirm, deducted on ship)

- **Test: Sales order cancellation releases committed stock**
  - Create and confirm sales order
  - Cancel order
  - Assert committed stock is restored

#### Scenario: Purchase workflow e2e (`purchase-workflow.e2e-spec.ts`)
- **Test: PO to receive to bill to payment full flow**
  - Create vendor contact
  - Create items
  - Create purchase order (DRAFT)
  - Issue PO -> Assert ISSUED
  - Receive goods -> Assert stock levels increased
  - Create bill from PO -> Assert bill matches PO
  - Record vendor payment -> Assert bill status PAID

- **Test: Partial receive updates PO status**
  - Create PO with 10 items
  - Receive 5 -> Assert PARTIALLY_RECEIVED
  - Receive remaining 5 -> Assert RECEIVED

#### Scenario: Inventory e2e (`inventory.e2e-spec.ts`)
- **Test: Stock adjustment increases stock**
  - Create item
  - Create adjustment (INCREASE, qty: 50)
  - Assert stock level increased by 50

- **Test: Stock adjustment decreases stock**
  - Create adjustment (DECREASE, qty: 20)
  - Assert stock level decreased by 20

- **Test: Inventory transfer full workflow**
  - Create 2 warehouses
  - Create item with stock in warehouse A
  - Create transfer from A to B
  - Issue transfer -> Assert warehouse A stock decreased
  - Receive transfer -> Assert warehouse B stock increased

- **Test: Transfer cancellation restores stock**
  - Issue transfer
  - Cancel -> Assert warehouse A stock restored

---

### Requirement: Jest configuration updates
The system SHALL update Jest configuration to enforce coverage thresholds.

#### Scenario: Unit test configuration (`apps/api/package.json` jest section)
- **WHEN** `npm run test:cov` is executed
- **THEN** Jest SHALL enforce the following coverage thresholds:
  ```json
  {
    "coverageThreshold": {
      "global": {
        "branches": 60,
        "functions": 70,
        "lines": 70,
        "statements": 70
      },
      "src/modules/sales/sales.service.ts": {
        "branches": 90,
        "functions": 100,
        "lines": 95,
        "statements": 95
      },
      "src/modules/tax/tax.service.ts": {
        "branches": 100,
        "functions": 100,
        "lines": 100,
        "statements": 100
      }
    }
  }
  ```

#### Scenario: E2E test configuration (`apps/api/test/jest-e2e.json`)
- **WHEN** `npm run test:e2e` is executed
- **THEN** Jest SHALL:
  - Use `testRegex: '.e2e-spec.ts$'`
  - Set `rootDir` to `'.'`
  - Set `testTimeout` to 30000 (30 seconds, to allow for database setup)
  - Use `ts-jest` transform
  - Set `moduleNameMapper` to resolve `@/` path aliases to `<rootDir>/../src/`

#### Scenario: Coverage exclusions
- **WHEN** coverage is collected
- **THEN** the following SHALL be excluded from coverage metrics:
  - `src/main.ts`
  - `src/**/*.module.ts`
  - `src/**/*.dto.ts`
  - `src/**/*.entity.ts`
  - `src/prisma/prisma.service.ts`
  - `test/**/*`

---

## File Manifest

### New Files

| File Path | Purpose |
|-----------|---------|
| `apps/api/test/helpers/prisma-mock.ts` | Prisma client mock factory with all model accessors |
| `apps/api/test/helpers/auth-mock.ts` | JWT token generator and auth header helper for tests |
| `apps/api/test/helpers/factory.ts` | Test data factories for all entities |
| `apps/api/test/helpers/index.ts` | Barrel export for test helpers |
| `apps/api/test/jest-e2e.json` | Jest configuration for E2E tests |
| `apps/api/src/modules/items/items.service.spec.ts` | Unit tests for ItemsService |
| `apps/api/src/modules/inventory/inventory.service.spec.ts` | Unit tests for InventoryService |
| `apps/api/src/modules/sales/sales.service.spec.ts` | Unit tests for SalesService (orders, invoices, payments) |
| `apps/api/src/modules/purchases/purchases.service.spec.ts` | Unit tests for PurchasesService |
| `apps/api/src/modules/tax/tax.service.spec.ts` | Unit tests for TaxService |
| `apps/api/src/modules/einvoice/einvoice.service.spec.ts` | Unit tests for EInvoiceService |
| `apps/api/src/modules/composite/composite.service.spec.ts` | Unit tests for CompositeService |
| `apps/api/src/modules/reorder/reorder.service.spec.ts` | Unit tests for ReorderService |
| `apps/api/test/auth.e2e-spec.ts` | E2E tests for authentication flow |
| `apps/api/test/items.e2e-spec.ts` | E2E tests for item CRUD lifecycle |
| `apps/api/test/sales-workflow.e2e-spec.ts` | E2E tests for quote-to-payment sales flow |
| `apps/api/test/purchase-workflow.e2e-spec.ts` | E2E tests for PO-to-payment purchase flow |
| `apps/api/test/inventory.e2e-spec.ts` | E2E tests for adjustment and transfer workflows |

### Modified Files

| File Path | Change Description |
|-----------|-------------------|
| `apps/api/package.json` | Add `coverageThreshold`, update `collectCoverageFrom` to exclude non-business files, add `coveragePathIgnorePatterns` |

---

## Implementation Notes

1. **NestJS Testing Module**: Unit tests SHALL use `Test.createTestingModule()` from `@nestjs/testing` to create an isolated testing module with the service under test and the mocked `PrismaService`. Example:
   ```typescript
   const module = await Test.createTestingModule({
     providers: [
       ItemsService,
       { provide: PrismaService, useValue: createMockPrismaService() },
     ],
   }).compile();
   service = module.get<ItemsService>(ItemsService);
   ```

2. **E2E Test Database**: Integration tests SHALL use a separate test database (controlled by `DATABASE_URL` in `.env.test`). Before the test suite runs, the database SHALL be reset via `prisma migrate reset --force --skip-seed`. Alternatively, if a test database is not available, use Prisma's in-memory SQLite (requires provider override) or Docker compose for a test Postgres instance.

3. **Decimal precision**: Prisma returns `Decimal` objects for `Decimal` fields. In tests, use `Number()` or `.toNumber()` to convert before assertions, and use `expect.closeTo()` or `toBeCloseTo()` for floating-point comparisons where appropriate.

4. **Transaction testing**: For services that use `prisma.$transaction()`, the mock SHALL execute the callback synchronously with the mock client. For tests that verify transaction atomicity (rollback on error), the mock SHALL be configured to throw after partial execution and verify that no partial state persists.

5. **Test isolation**: Each test file SHALL use `beforeEach` to reset all mock function calls via `jest.clearAllMocks()`. Shared test state between tests is prohibited. Each test SHALL set up its own mock data via factory functions.

6. **E2E test ordering**: Integration tests that depend on sequential state (e.g., create order then confirm it) SHALL use `describe` blocks with sequential test execution within the block. Tests across different `describe` blocks SHALL be independent.

7. **Supertest usage**: E2E tests SHALL create the NestJS app via `Test.createTestingModule()` and use `app.getHttpServer()` with supertest. Example:
   ```typescript
   const response = await request(app.getHttpServer())
     .post('/api/v1/items')
     .set(createAuthHeader())
     .send(createTestItem())
     .expect(201);
   ```
