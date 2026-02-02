# Sales Payments (Payments Received)

## Overview
Track and manage payments received from customers against invoices.

## Requirements

### PAY-001: Record Payment
- **Priority**: P0
- **Description**: Record payment received from customer
- **Acceptance Criteria**:
  - Auto-generate payment number (PAY-XXXXXX)
  - Select customer and invoice(s)
  - Enter payment amount
  - Select payment method (Cash, Bank Transfer, FPX, etc.)
  - Record payment date
  - Apply to single or multiple invoices
  - Handle overpayment as credit

### PAY-002: Payment Methods
- **Priority**: P0
- **Description**: Support Malaysian payment methods
- **Acceptance Criteria**:
  - Cash
  - Bank Transfer
  - Cheque
  - FPX (online banking)
  - DuitNow
  - Credit/Debit Card
  - Touch 'n Go eWallet
  - GrabPay
  - Custom methods

### PAY-003: Payment Allocation
- **Priority**: P0
- **Description**: Apply payment to invoices
- **Acceptance Criteria**:
  - Auto-allocate to oldest invoice first
  - Manual allocation to specific invoices
  - Partial payment support
  - Track allocated vs unallocated amounts
  - Update invoice payment status

### PAY-004: Payment List
- **Priority**: P0
- **Description**: View and manage payments
- **Acceptance Criteria**:
  - Filter by date, customer, method
  - Search by payment number
  - View payment history per customer
  - Export payment report

### PAY-005: Refunds
- **Priority**: P1
- **Description**: Process customer refunds
- **Acceptance Criteria**:
  - Link to original payment
  - Specify refund reason
  - Track refund method
  - Update related records

## API Endpoints

```
POST   /api/sales/payments           - Record payment
GET    /api/sales/payments           - List payments
GET    /api/sales/payments/:id       - Get payment details
PUT    /api/sales/payments/:id       - Update payment
DELETE /api/sales/payments/:id       - Delete payment
GET    /api/sales/payments/customer/:id - Customer payment history
POST   /api/sales/refunds            - Process refund
GET    /api/sales/refunds            - List refunds
```

## Database Schema

```prisma
model PaymentReceived {
  id              String         @id @default(cuid())
  paymentNumber   String         @unique
  customerId      String
  customer        Contact        @relation(fields: [customerId], references: [id])
  paymentDate     DateTime
  amount          Decimal
  paymentMethod   PaymentMethod
  referenceNumber String?        // Cheque no, transaction ref
  bankAccountId   String?
  notes           String?
  allocations     PaymentAllocation[]
  unallocatedAmount Decimal      @default(0)
  organizationId  String
  createdById     String
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

model PaymentAllocation {
  id              String          @id @default(cuid())
  paymentId       String
  payment         PaymentReceived @relation(fields: [paymentId], references: [id])
  invoiceId       String
  invoice         Invoice         @relation(fields: [invoiceId], references: [id])
  amount          Decimal
  allocatedAt     DateTime        @default(now())
}

model Refund {
  id              String         @id @default(cuid())
  refundNumber    String         @unique
  paymentId       String?
  payment         PaymentReceived? @relation(fields: [paymentId], references: [id])
  customerId      String
  customer        Contact        @relation(fields: [customerId], references: [id])
  refundDate      DateTime
  amount          Decimal
  refundMethod    PaymentMethod
  reason          String
  referenceNumber String?
  organizationId  String
  createdById     String
  createdAt       DateTime       @default(now())
}

enum PaymentMethod {
  CASH
  BANK_TRANSFER
  CHEQUE
  FPX
  DUITNOW
  CREDIT_CARD
  DEBIT_CARD
  TNG_EWALLET
  GRABPAY
  OTHER
}
```
