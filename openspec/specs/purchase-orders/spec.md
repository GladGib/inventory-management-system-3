# Purchase Orders

## Overview
Purchase order management for ordering goods from vendors.

## Requirements

### PO-001: Create Purchase Order
- **Priority**: P0
- **Description**: Create purchase order to vendor
- **Acceptance Criteria**:
  - Auto-generate PO number (PO-XXXXXX)
  - Select vendor from contacts
  - Add line items with quantities and prices
  - Set expected delivery date
  - Specify delivery warehouse
  - Save as DRAFT or ISSUED status
  - Support vendor reference number

### PO-002: Purchase Order Statuses
- **Priority**: P0
- **Description**: Track PO lifecycle
- **Acceptance Criteria**:
  - DRAFT: Initial state, editable
  - ISSUED: Sent to vendor
  - PARTIALLY_RECEIVED: Some items received
  - RECEIVED: All items received
  - CLOSED: PO complete
  - CANCELLED: PO cancelled

### PO-003: PO List & Filters
- **Priority**: P0
- **Description**: View and manage purchase orders
- **Acceptance Criteria**:
  - Filter by status, vendor, date
  - Search by PO number
  - Sort by date, total
  - Track receiving status
  - Export to Excel

### PO-004: Convert to Receive
- **Priority**: P0
- **Description**: Create purchase receive from PO
- **Acceptance Criteria**:
  - Receive full or partial order
  - Track received quantities per item
  - Update PO status automatically
  - Multiple receives per PO

### PO-005: Convert to Bill
- **Priority**: P0
- **Description**: Create vendor bill from PO
- **Acceptance Criteria**:
  - Bill for received items
  - Match bill to receive
  - Support partial billing
  - Track bill status on PO

### PO-006: PO PDF Generation
- **Priority**: P1
- **Description**: Generate printable PO document
- **Acceptance Criteria**:
  - Company header
  - Vendor details
  - Line items with totals
  - Delivery instructions
  - Terms and conditions

## API Endpoints

```
POST   /api/purchases/orders           - Create PO
GET    /api/purchases/orders           - List POs
GET    /api/purchases/orders/:id       - Get PO details
PUT    /api/purchases/orders/:id       - Update PO
DELETE /api/purchases/orders/:id       - Delete draft PO
PUT    /api/purchases/orders/:id/issue - Issue PO
PUT    /api/purchases/orders/:id/cancel - Cancel PO
GET    /api/purchases/orders/:id/pdf   - Generate PDF
POST   /api/purchases/orders/:id/receive - Create receive
```

## Database Schema

```prisma
model PurchaseOrder {
  id                String              @id @default(cuid())
  orderNumber       String              @unique
  vendorId          String
  vendor            Contact             @relation(fields: [vendorId], references: [id])
  orderDate         DateTime
  expectedDate      DateTime?
  status            PurchaseOrderStatus @default(DRAFT)
  receiveStatus     ReceiveStatus       @default(NOT_RECEIVED)
  billStatus        BillStatus          @default(NOT_BILLED)
  deliveryAddress   Json?
  warehouseId       String?
  warehouse         Warehouse?          @relation(fields: [warehouseId], references: [id])
  subtotal          Decimal
  discountAmount    Decimal             @default(0)
  taxAmount         Decimal             @default(0)
  shippingCharges   Decimal             @default(0)
  total             Decimal
  notes             String?
  referenceNumber   String?             // Vendor quote ref
  items             PurchaseOrderItem[]
  receives          PurchaseReceive[]
  bills             Bill[]
  organizationId    String
  createdById       String
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
}

model PurchaseOrderItem {
  id              String         @id @default(cuid())
  purchaseOrderId String
  purchaseOrder   PurchaseOrder  @relation(fields: [purchaseOrderId], references: [id])
  itemId          String
  item            Item           @relation(fields: [itemId], references: [id])
  description     String?
  quantity        Decimal
  unitPrice       Decimal
  discountPercent Decimal        @default(0)
  discountAmount  Decimal        @default(0)
  taxRateId       String?
  taxAmount       Decimal        @default(0)
  total           Decimal
  receivedQty     Decimal        @default(0)
  billedQty       Decimal        @default(0)
}

enum PurchaseOrderStatus {
  DRAFT
  ISSUED
  PARTIALLY_RECEIVED
  RECEIVED
  CLOSED
  CANCELLED
}

enum ReceiveStatus {
  NOT_RECEIVED
  PARTIALLY_RECEIVED
  RECEIVED
}

enum BillStatus {
  NOT_BILLED
  PARTIALLY_BILLED
  BILLED
}
```
