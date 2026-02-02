# Purchase Receives (Goods Receipt)

## Overview
Record receipt of goods from vendors and update inventory.

## Requirements

### RCV-001: Create Purchase Receive
- **Priority**: P0
- **Description**: Record goods received from vendor
- **Acceptance Criteria**:
  - Auto-generate receive number (RCV-XXXXXX)
  - Link to purchase order
  - Enter received quantities per item
  - Set receive date
  - Select destination warehouse
  - Handle partial receives
  - Update PO receive status

### RCV-002: Stock Update
- **Priority**: P0
- **Description**: Update inventory on receive
- **Acceptance Criteria**:
  - Increase stockOnHand at destination warehouse
  - Create stock level if not exists
  - Record cost price from PO
  - Support batch/serial numbers

### RCV-003: Quality Check
- **Priority**: P1
- **Description**: Record quality inspection results
- **Acceptance Criteria**:
  - Mark items as accepted/rejected
  - Record rejection reason
  - Specify rejected quantities
  - Track vendor quality metrics

### RCV-004: Receive List
- **Priority**: P0
- **Description**: View and manage receives
- **Acceptance Criteria**:
  - Filter by date, vendor, PO
  - Search by receive number
  - View receives per PO
  - Export receive report

### RCV-005: Convert to Bill
- **Priority**: P0
- **Description**: Create vendor bill from receive
- **Acceptance Criteria**:
  - Bill for received items only
  - Match quantities with receive
  - Copy pricing from PO

## API Endpoints

```
POST   /api/purchases/receives           - Create receive
GET    /api/purchases/receives           - List receives
GET    /api/purchases/receives/:id       - Get receive details
PUT    /api/purchases/receives/:id       - Update receive
DELETE /api/purchases/receives/:id       - Delete receive
POST   /api/purchases/receives/:id/bill  - Create bill from receive
```

## Database Schema

```prisma
model PurchaseReceive {
  id              String               @id @default(cuid())
  receiveNumber   String               @unique
  purchaseOrderId String
  purchaseOrder   PurchaseOrder        @relation(fields: [purchaseOrderId], references: [id])
  vendorId        String
  vendor          Contact              @relation(fields: [vendorId], references: [id])
  receiveDate     DateTime
  warehouseId     String
  warehouse       Warehouse            @relation(fields: [warehouseId], references: [id])
  status          ReceiveDocStatus     @default(RECEIVED)
  notes           String?
  items           PurchaseReceiveItem[]
  bills           Bill[]
  organizationId  String
  createdById     String
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt
}

model PurchaseReceiveItem {
  id                String           @id @default(cuid())
  purchaseReceiveId String
  purchaseReceive   PurchaseReceive  @relation(fields: [purchaseReceiveId], references: [id])
  purchaseOrderItemId String?
  itemId            String
  item              Item             @relation(fields: [itemId], references: [id])
  orderedQty        Decimal
  receivedQty       Decimal
  acceptedQty       Decimal
  rejectedQty       Decimal          @default(0)
  rejectionReason   String?
  unitCost          Decimal
  batchNumber       String?
  serialNumbers     String[]
}

enum ReceiveDocStatus {
  RECEIVED
  QUALITY_CHECK
  PARTIALLY_ACCEPTED
  ACCEPTED
}
```
