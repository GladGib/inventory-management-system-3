# Purchase Payments (Payments Made)

## Overview
Track and manage payments made to vendors against bills.

## Requirements

### VPY-001: Record Payment
- **Priority**: P0
- **Description**: Record payment made to vendor
- **Acceptance Criteria**:
  - Auto-generate payment number (VPY-XXXXXX)
  - Select vendor and bill(s)
  - Enter payment amount
  - Select payment method
  - Record payment date
  - Apply to single or multiple bills
  - Handle prepayments (advance)

### VPY-002: Payment Methods
- **Priority**: P0
- **Description**: Support various payment methods
- **Acceptance Criteria**:
  - Cash
  - Bank Transfer
  - Cheque (with cheque number)
  - Online Banking
  - Credit Card
  - Custom methods

### VPY-003: Payment Allocation
- **Priority**: P0
- **Description**: Apply payment to bills
- **Acceptance Criteria**:
  - Auto-allocate to oldest bill first
  - Manual allocation to specific bills
  - Partial payment support
  - Track unallocated prepayments
  - Update bill payment status

### VPY-004: Payment List
- **Priority**: P0
- **Description**: View and manage payments made
- **Acceptance Criteria**:
  - Filter by date, vendor, method
  - Search by payment number
  - View payment history per vendor
  - Export payment report
  - Bank reconciliation view

### VPY-005: Cheque Management
- **Priority**: P1
- **Description**: Track cheque payments
- **Acceptance Criteria**:
  - Record cheque number
  - Track cheque status (issued, cleared, bounced)
  - Cheque printing support
  - Post-dated cheques

## API Endpoints

```
POST   /api/purchases/payments           - Record payment
GET    /api/purchases/payments           - List payments
GET    /api/purchases/payments/:id       - Get payment details
PUT    /api/purchases/payments/:id       - Update payment
DELETE /api/purchases/payments/:id       - Delete payment
GET    /api/purchases/payments/vendor/:id - Vendor payment history
```

## Database Schema

```prisma
model PaymentMade {
  id              String                @id @default(cuid())
  paymentNumber   String                @unique
  vendorId        String
  vendor          Contact               @relation(fields: [vendorId], references: [id])
  paymentDate     DateTime
  amount          Decimal
  paymentMethod   PaymentMethod
  referenceNumber String?               // Cheque no, transaction ref
  bankAccountId   String?
  chequeStatus    ChequeStatus?
  notes           String?
  allocations     VendorPaymentAllocation[]
  unallocatedAmount Decimal             @default(0)
  isAdvancePayment Boolean              @default(false)
  organizationId  String
  createdById     String
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt
}

model VendorPaymentAllocation {
  id              String       @id @default(cuid())
  paymentId       String
  payment         PaymentMade  @relation(fields: [paymentId], references: [id])
  billId          String
  bill            Bill         @relation(fields: [billId], references: [id])
  amount          Decimal
  allocatedAt     DateTime     @default(now())
}

enum ChequeStatus {
  ISSUED
  CLEARED
  BOUNCED
  CANCELLED
  VOIDED
}
```
