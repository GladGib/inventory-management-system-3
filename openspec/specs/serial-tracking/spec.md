# Serial Number Tracking

## Overview
Track individual items by unique serial numbers for warranty and traceability.

## Requirements

### SN-001: Enable Serial Tracking
- **Priority**: P1
- **Description**: Configure items for serial tracking
- **Acceptance Criteria**:
  - Toggle serial tracking per item
  - Require serial on stock in
  - Serial format validation (regex)
  - Serial number prefix option

### SN-002: Serial Registration
- **Priority**: P1
- **Description**: Record serial numbers on receipt
- **Acceptance Criteria**:
  - Enter serials on purchase receive
  - Bulk serial entry (list/range)
  - Validate uniqueness
  - Scan barcode entry
  - One serial = one unit

### SN-003: Serial Selection on Sale
- **Priority**: P1
- **Description**: Assign serials when selling
- **Acceptance Criteria**:
  - Select specific serials
  - Auto-assign available serials
  - Record customer linkage
  - Block duplicate assignment
  - Serial validation

### SN-004: Serial Traceability
- **Priority**: P1
- **Description**: Full serial lifecycle tracking
- **Acceptance Criteria**:
  - Purchase source (vendor)
  - Sale destination (customer)
  - Transfer history
  - Return/warranty tracking
  - Current status/location

### SN-005: Serial Search
- **Priority**: P1
- **Description**: Find items by serial
- **Acceptance Criteria**:
  - Global serial search
  - Serial lookup API
  - Full history on lookup
  - Customer-facing lookup option

### SN-006: Warranty Management
- **Priority**: P2
- **Description**: Track warranty by serial
- **Acceptance Criteria**:
  - Warranty period per item
  - Start date (sale date)
  - Expiry calculation
  - Warranty claim recording
  - Active warranty report

## API Endpoints

```
GET  /api/items/:id/serials              - List serials for item
POST /api/items/:id/serials              - Register serials
GET  /api/serials/:id                    - Get serial details
PUT  /api/serials/:id                    - Update serial
GET  /api/serials/:id/history            - Serial history
GET  /api/serials/search                 - Search by serial number
GET  /api/serials/available              - Available serials for item
GET  /api/reports/serials/warranty       - Warranty report
POST /api/serials/:id/warranty-claim     - Register warranty claim
```

## Database Schema

```prisma
model SerialNumber {
  id              String         @id @default(cuid())
  serialNumber    String
  itemId          String
  item            Item           @relation(fields: [itemId], references: [id])
  warehouseId     String?
  warehouse       Warehouse?     @relation(fields: [warehouseId], references: [id])
  status          SerialStatus   @default(IN_STOCK)

  // Purchase info
  purchaseReceiveId String?
  purchaseReceive PurchaseReceive? @relation(fields: [purchaseReceiveId], references: [id])
  supplierId      String?
  purchaseDate    DateTime?
  purchaseCost    Decimal?

  // Sale info
  salesOrderItemId String?
  salesOrderItem  SalesOrderItem? @relation(fields: [salesOrderItemId], references: [id])
  customerId      String?
  customer        Contact?       @relation(fields: [customerId], references: [id])
  saleDate        DateTime?

  // Warranty
  warrantyMonths  Int?
  warrantyStartDate DateTime?
  warrantyEndDate DateTime?

  notes           String?
  organizationId  String
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  // Unique per organization
  @@unique([serialNumber, organizationId])

  // Relations
  history         SerialHistory[]
  warrantyClaims  WarrantyClaim[]
}

model SerialHistory {
  id              String   @id @default(cuid())
  serialNumberId  String
  serialNumber    SerialNumber @relation(fields: [serialNumberId], references: [id])
  action          SerialAction
  fromStatus      SerialStatus?
  toStatus        SerialStatus
  fromWarehouseId String?
  toWarehouseId   String?
  referenceType   String?  // PURCHASE, SALE, TRANSFER, ADJUSTMENT
  referenceId     String?
  notes           String?
  createdById     String
  createdAt       DateTime @default(now())
}

model WarrantyClaim {
  id              String   @id @default(cuid())
  claimNumber     String   @unique
  serialNumberId  String
  serialNumber    SerialNumber @relation(fields: [serialNumberId], references: [id])
  customerId      String
  customer        Contact  @relation(fields: [customerId], references: [id])
  claimDate       DateTime
  issueDescription String
  status          ClaimStatus @default(PENDING)
  resolution      String?
  resolvedDate    DateTime?
  replacementSerialId String?
  organizationId  String
  createdById     String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum SerialStatus {
  IN_STOCK
  SOLD
  RETURNED
  DEFECTIVE
  IN_REPAIR
  SCRAPPED
  IN_TRANSIT
}

enum SerialAction {
  RECEIVED
  SOLD
  RETURNED
  TRANSFERRED
  ADJUSTED
  REPAIRED
  SCRAPPED
}

enum ClaimStatus {
  PENDING
  APPROVED
  REJECTED
  IN_PROGRESS
  RESOLVED
}
```
