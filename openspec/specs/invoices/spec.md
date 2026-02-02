# Invoices

## Overview
Invoice management for billing customers and tracking payments.

## Requirements

### INV-001: Create Invoice
- **Priority**: P0
- **Description**: Create invoice from sales order or standalone
- **Acceptance Criteria**:
  - Auto-generate invoice number (INV-XXXXXX)
  - Link to sales order (optional)
  - Add line items with pricing
  - Calculate taxes per Malaysian SST rules
  - Set payment terms and due date
  - Support partial invoicing from orders

### INV-002: Invoice Statuses
- **Priority**: P0
- **Description**: Track invoice lifecycle
- **Acceptance Criteria**:
  - DRAFT: Editable, not sent
  - SENT: Sent to customer
  - VIEWED: Customer viewed (portal)
  - PARTIALLY_PAID: Partial payment received
  - PAID: Fully paid
  - OVERDUE: Past due date, unpaid
  - VOID: Cancelled invoice

### INV-003: Payment Recording
- **Priority**: P0
- **Description**: Record payments against invoices
- **Acceptance Criteria**:
  - Record full or partial payment
  - Multiple payment methods
  - Auto-calculate balance
  - Update payment status
  - Link to payment record

### INV-004: Invoice PDF Generation
- **Priority**: P0
- **Description**: Generate professional invoice PDF
- **Acceptance Criteria**:
  - Company logo and details
  - Customer billing address
  - Line items with tax breakdown
  - Payment instructions
  - SST registration number
  - e-Invoice QR code (when submitted)
  - Bilingual support

### INV-005: Invoice List & Filters
- **Priority**: P0
- **Description**: View and manage invoices
- **Acceptance Criteria**:
  - Filter by status, date, customer
  - Search by invoice number
  - Sort by date, amount, due date
  - Aging summary (current, 30, 60, 90+ days)
  - Export to Excel/CSV

### INV-006: Credit Notes
- **Priority**: P1
- **Description**: Issue credit notes for returns/adjustments
- **Acceptance Criteria**:
  - Link to original invoice
  - Specify items and quantities
  - Apply to future invoices or refund
  - Track credit note balance

## API Endpoints

```
POST   /api/sales/invoices           - Create invoice
GET    /api/sales/invoices           - List invoices
GET    /api/sales/invoices/:id       - Get invoice details
PUT    /api/sales/invoices/:id       - Update draft invoice
DELETE /api/sales/invoices/:id       - Delete draft invoice
PUT    /api/sales/invoices/:id/send  - Mark as sent
PUT    /api/sales/invoices/:id/void  - Void invoice
GET    /api/sales/invoices/:id/pdf   - Generate PDF
POST   /api/sales/invoices/:id/payment - Record payment
GET    /api/sales/invoices/aging     - Aging report
POST   /api/sales/credit-notes       - Create credit note
GET    /api/sales/credit-notes       - List credit notes
```

## Database Schema

```prisma
model Invoice {
  id              String         @id @default(cuid())
  invoiceNumber   String         @unique
  salesOrderId    String?
  salesOrder      SalesOrder?    @relation(fields: [salesOrderId], references: [id])
  customerId      String
  customer        Contact        @relation(fields: [customerId], references: [id])
  invoiceDate     DateTime
  dueDate         DateTime
  status          InvoiceDocStatus @default(DRAFT)
  billingAddress  Json?
  subtotal        Decimal
  discountAmount  Decimal        @default(0)
  taxAmount       Decimal
  total           Decimal
  amountPaid      Decimal        @default(0)
  balance         Decimal
  notes           String?
  termsConditions String?
  paymentTerms    Int?           // Days
  items           InvoiceItem[]
  payments        PaymentReceived[]
  eInvoiceId      String?        // MyInvois reference
  eInvoiceStatus  EInvoiceStatus?
  eInvoiceQRCode  String?
  organizationId  String
  createdById     String
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

model InvoiceItem {
  id              String   @id @default(cuid())
  invoiceId       String
  invoice         Invoice  @relation(fields: [invoiceId], references: [id])
  itemId          String
  item            Item     @relation(fields: [itemId], references: [id])
  description     String?
  quantity        Decimal
  unitPrice       Decimal
  discountPercent Decimal  @default(0)
  discountAmount  Decimal  @default(0)
  taxRateId       String?
  taxRate         TaxRate? @relation(fields: [taxRateId], references: [id])
  taxAmount       Decimal  @default(0)
  total           Decimal
}

model CreditNote {
  id              String         @id @default(cuid())
  creditNoteNumber String        @unique
  invoiceId       String?
  invoice         Invoice?       @relation(fields: [invoiceId], references: [id])
  customerId      String
  customer        Contact        @relation(fields: [customerId], references: [id])
  creditNoteDate  DateTime
  reason          String
  subtotal        Decimal
  taxAmount       Decimal
  total           Decimal
  amountUsed      Decimal        @default(0)
  balance         Decimal
  status          CreditNoteStatus @default(OPEN)
  items           CreditNoteItem[]
  organizationId  String
  createdById     String
  createdAt       DateTime       @default(now())
}

enum InvoiceDocStatus {
  DRAFT
  SENT
  VIEWED
  PARTIALLY_PAID
  PAID
  OVERDUE
  VOID
}

enum EInvoiceStatus {
  PENDING
  SUBMITTED
  VALIDATED
  REJECTED
}

enum CreditNoteStatus {
  OPEN
  CLOSED
}
```
