# Bills (Vendor Bills)

## Overview
Manage vendor bills and track accounts payable.

## Requirements

### BIL-001: Create Bill
- **Priority**: P0
- **Description**: Record vendor bill for goods/services
- **Acceptance Criteria**:
  - Auto-generate bill number (BILL-XXXXXX)
  - Link to PO and/or receive (optional)
  - Enter vendor bill number/reference
  - Add line items with amounts
  - Calculate taxes
  - Set due date based on payment terms

### BIL-002: Bill Statuses
- **Priority**: P0
- **Description**: Track bill payment status
- **Acceptance Criteria**:
  - DRAFT: Editable bill
  - OPEN: Awaiting payment
  - PARTIALLY_PAID: Partial payment made
  - PAID: Fully paid
  - OVERDUE: Past due date
  - VOID: Cancelled bill

### BIL-003: Bill Matching
- **Priority**: P0
- **Description**: Match bills to POs and receives
- **Acceptance Criteria**:
  - 2-way match (PO to Bill)
  - 3-way match (PO to Receive to Bill)
  - Highlight discrepancies
  - Track matched quantities

### BIL-004: Bill List & Aging
- **Priority**: P0
- **Description**: View and manage bills
- **Acceptance Criteria**:
  - Filter by status, vendor, date
  - Search by bill number
  - Aging summary (current, 30, 60, 90+)
  - Export payables report

### BIL-005: Payment Recording
- **Priority**: P0
- **Description**: Record payment against bills
- **Acceptance Criteria**:
  - Full or partial payment
  - Multiple payment methods
  - Update payment status
  - Link to payment record

### BIL-006: Vendor Credits
- **Priority**: P1
- **Description**: Record vendor credit notes
- **Acceptance Criteria**:
  - For returns or adjustments
  - Apply to future bills
  - Track credit balance

## API Endpoints

```
POST   /api/purchases/bills           - Create bill
GET    /api/purchases/bills           - List bills
GET    /api/purchases/bills/:id       - Get bill details
PUT    /api/purchases/bills/:id       - Update bill
DELETE /api/purchases/bills/:id       - Delete draft bill
PUT    /api/purchases/bills/:id/void  - Void bill
POST   /api/purchases/bills/:id/payment - Record payment
GET    /api/purchases/bills/aging     - Aging report
POST   /api/purchases/vendor-credits  - Create vendor credit
GET    /api/purchases/vendor-credits  - List vendor credits
```

## Database Schema

```prisma
model Bill {
  id                String            @id @default(cuid())
  billNumber        String            @unique
  vendorBillNumber  String?           // Vendor's reference
  purchaseOrderId   String?
  purchaseOrder     PurchaseOrder?    @relation(fields: [purchaseOrderId], references: [id])
  purchaseReceiveId String?
  purchaseReceive   PurchaseReceive?  @relation(fields: [purchaseReceiveId], references: [id])
  vendorId          String
  vendor            Contact           @relation(fields: [vendorId], references: [id])
  billDate          DateTime
  dueDate           DateTime
  status            BillDocStatus     @default(DRAFT)
  subtotal          Decimal
  discountAmount    Decimal           @default(0)
  taxAmount         Decimal
  total             Decimal
  amountPaid        Decimal           @default(0)
  balance           Decimal
  notes             String?
  items             BillItem[]
  payments          PaymentMade[]
  organizationId    String
  createdById       String
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
}

model BillItem {
  id              String   @id @default(cuid())
  billId          String
  bill            Bill     @relation(fields: [billId], references: [id])
  itemId          String?
  item            Item?    @relation(fields: [itemId], references: [id])
  description     String
  accountId       String?  // For expense categorization
  quantity        Decimal
  unitPrice       Decimal
  taxRateId       String?
  taxAmount       Decimal  @default(0)
  total           Decimal
}

model VendorCredit {
  id              String             @id @default(cuid())
  creditNumber    String             @unique
  billId          String?
  bill            Bill?              @relation(fields: [billId], references: [id])
  vendorId        String
  vendor          Contact            @relation(fields: [vendorId], references: [id])
  creditDate      DateTime
  reason          String
  subtotal        Decimal
  taxAmount       Decimal
  total           Decimal
  amountUsed      Decimal            @default(0)
  balance         Decimal
  status          VendorCreditStatus @default(OPEN)
  items           VendorCreditItem[]
  organizationId  String
  createdById     String
  createdAt       DateTime           @default(now())
}

enum BillDocStatus {
  DRAFT
  OPEN
  PARTIALLY_PAID
  PAID
  OVERDUE
  VOID
}

enum VendorCreditStatus {
  OPEN
  CLOSED
}
```
