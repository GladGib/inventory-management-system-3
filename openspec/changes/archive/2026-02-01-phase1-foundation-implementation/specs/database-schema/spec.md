## ADDED Requirements

### Requirement: Organization entity
The system SHALL store organization data with multi-tenant support.

#### Scenario: Organization creation
- **WHEN** a new organization is created
- **THEN** it SHALL have: id (CUID), name, slug (unique), industry, baseCurrency, timezone, sstNumber, businessRegNo, tin, email, phone, website, address (JSON), settings (JSON), status, timestamps

#### Scenario: Organization defaults
- **WHEN** a new organization is created without optional fields
- **THEN** baseCurrency SHALL default to 'MYR', timezone SHALL default to 'Asia/Kuala_Lumpur', status SHALL default to 'ACTIVE'

### Requirement: User entity
The system SHALL store user accounts linked to organizations.

#### Scenario: User creation
- **WHEN** a new user is created
- **THEN** it SHALL have: id (CUID), email (unique), passwordHash, name, role (enum), organizationId (FK), preferences (JSON), status, timestamps

#### Scenario: User organization relationship
- **WHEN** a user is created
- **THEN** it SHALL be linked to exactly one organization via organizationId

### Requirement: Refresh token entity
The system SHALL store refresh tokens for authentication.

#### Scenario: Refresh token creation
- **WHEN** a refresh token is issued
- **THEN** it SHALL have: id (CUID), token (unique), userId (FK), expiresAt, revokedAt, createdAt

#### Scenario: Token revocation
- **WHEN** a refresh token is revoked
- **THEN** revokedAt SHALL be set to the current timestamp

### Requirement: Item entity
The system SHALL store inventory items with Malaysian auto parts industry support.

#### Scenario: Item fields
- **WHEN** an item is created
- **THEN** it SHALL support: id, sku (unique per org), name, nameMalay, description, type (enum), unit, brand, category, partNumber, crossReferences (array), vehicleModels (array), costPrice, sellingPrice, reorderLevel, reorderQty, taxable, taxRateId, trackInventory, trackBatches, trackSerials, images (array), status, organizationId, timestamps

#### Scenario: Item types
- **WHEN** setting item type
- **THEN** the system SHALL accept: INVENTORY, SERVICE, NON_INVENTORY

### Requirement: Warehouse entity
The system SHALL store warehouse/location data.

#### Scenario: Warehouse creation
- **WHEN** a warehouse is created
- **THEN** it SHALL have: id, name, code (unique per org), address, isDefault, status, organizationId, timestamps

#### Scenario: Default warehouse
- **WHEN** an organization is created
- **THEN** a default warehouse named "Main Warehouse" SHALL be created automatically

### Requirement: Stock level entity
The system SHALL track stock quantities per item per warehouse.

#### Scenario: Stock level structure
- **WHEN** stock is tracked
- **THEN** StockLevel SHALL have: id, itemId (FK), warehouseId (FK), stockOnHand, committedStock, reorderLevel, timestamps
- **AND** unique constraint on (itemId, warehouseId)

### Requirement: Contact entity
The system SHALL store customer and vendor contacts.

#### Scenario: Contact fields
- **WHEN** a contact is created
- **THEN** it SHALL have: id, type (CUSTOMER/VENDOR/BOTH), companyName, displayName, email, phone, mobile, billingAddress, shippingAddress, taxNumber, creditLimit, paymentTermId, priceListId, status, organizationId, timestamps

### Requirement: Sales order entity
The system SHALL store sales orders with Malaysian-specific fields.

#### Scenario: Sales order structure
- **WHEN** a sales order is created
- **THEN** it SHALL have: id, orderNumber (unique per org), customerId (FK), orderDate, expectedShipDate, status (enum), subtotal, discountAmount, taxAmount, total, notes, termsConditions, salesPersonId, warehouseId, organizationId, timestamps

#### Scenario: Sales order statuses
- **WHEN** tracking sales order status
- **THEN** the system SHALL support: DRAFT, CONFIRMED, PACKED, SHIPPED, DELIVERED, CANCELLED

### Requirement: Invoice entity
The system SHALL store invoices with e-Invoice support.

#### Scenario: Invoice fields
- **WHEN** an invoice is created
- **THEN** it SHALL have: id, invoiceNumber (unique per org), salesOrderId (FK), customerId (FK), invoiceDate, dueDate, status, paymentStatus, subtotal, discountAmount, taxAmount, total, amountPaid, balance, eInvoiceId, eInvoiceStatus, organizationId, timestamps

### Requirement: Purchase order entity
The system SHALL store purchase orders.

#### Scenario: Purchase order structure
- **WHEN** a purchase order is created
- **THEN** it SHALL have: id, orderNumber (unique per org), vendorId (FK), orderDate, expectedDate, status (enum), subtotal, discountAmount, taxAmount, total, referenceNumber, organizationId, timestamps

### Requirement: Bill entity
The system SHALL store vendor bills.

#### Scenario: Bill fields
- **WHEN** a bill is created
- **THEN** it SHALL have: id, billNumber (unique per org), purchaseOrderId (FK), vendorId (FK), billDate, dueDate, status, paymentStatus, subtotal, discountAmount, taxAmount, total, amountPaid, balance, organizationId, timestamps

### Requirement: Tax rate entity
The system SHALL store tax rates for Malaysian SST compliance.

#### Scenario: Tax rate fields
- **WHEN** a tax rate is created
- **THEN** it SHALL have: id, name, rate (Decimal), type (SST/SERVICE_TAX/EXEMPT/ZERO_RATED), description, isDefault, status, organizationId, timestamps

#### Scenario: Default tax rates
- **WHEN** an organization is created
- **THEN** default tax rates SHALL be created: SST (10%), Service Tax (6%), Zero Rated (0%), Exempt (0%)

### Requirement: Payment term entity
The system SHALL store payment terms.

#### Scenario: Payment term fields
- **WHEN** a payment term is created
- **THEN** it SHALL have: id, name, days, isDefault, organizationId, timestamps

#### Scenario: Default payment terms
- **WHEN** an organization is created
- **THEN** default payment terms SHALL be created: Net 7, Net 14, Net 30, Net 60 days

### Requirement: Batch tracking entity
The system SHALL support batch/lot tracking for items.

#### Scenario: Batch fields
- **WHEN** a batch is created
- **THEN** it SHALL have: id, itemId (FK), batchNumber, manufactureDate, expiryDate, quantity, warehouseId (FK), organizationId, timestamps

### Requirement: Serial number entity
The system SHALL support serial number tracking for items.

#### Scenario: Serial number fields
- **WHEN** a serial number is created
- **THEN** it SHALL have: id, itemId (FK), serialNumber (unique per org), status (IN_STOCK/SOLD/RETURNED), warehouseId (FK), soldToContactId (FK), organizationId, timestamps
