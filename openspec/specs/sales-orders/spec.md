# Sales Orders

## Overview
Sales order management for tracking customer orders from creation through fulfillment.

## Requirements

### SO-001: Create Sales Order
- **Priority**: P0
- **Description**: Create new sales order with customer, items, quantities, and pricing
- **Acceptance Criteria**:
  - Auto-generate order number (SO-XXXXXX)
  - Select customer from contacts
  - Add multiple line items with item, quantity, unit price
  - Apply line-level and order-level discounts
  - Calculate taxes based on tax rates
  - Set expected ship date
  - Save as DRAFT or CONFIRMED status
  - Validate stock availability on confirmation

### SO-002: Sales Order Statuses
- **Priority**: P0
- **Description**: Manage sales order lifecycle through statuses
- **Acceptance Criteria**:
  - DRAFT: Initial state, editable
  - CONFIRMED: Approved, commits stock
  - PACKED: Items picked and packed
  - SHIPPED: Items dispatched
  - DELIVERED: Customer received
  - CLOSED: Order complete
  - CANCELLED: Order cancelled

### SO-003: Stock Commitment
- **Priority**: P0
- **Description**: Reserve inventory when order is confirmed
- **Acceptance Criteria**:
  - Increase committedStock on confirmation
  - Decrease stockOnHand on shipment
  - Release commitment on cancellation
  - Show available vs committed stock

### SO-004: Sales Order List
- **Priority**: P0
- **Description**: View and filter sales orders
- **Acceptance Criteria**:
  - Filter by status, date range, customer
  - Search by order number
  - Sort by date, total, customer
  - Pagination support
  - Bulk status updates

### SO-005: Convert to Invoice
- **Priority**: P0
- **Description**: Generate invoice from sales order
- **Acceptance Criteria**:
  - Create invoice for full or partial order
  - Track invoice status on order
  - Support multiple invoices per order
  - Copy line items to invoice

### SO-006: Sales Order PDF
- **Priority**: P1
- **Description**: Generate printable sales order document
- **Acceptance Criteria**:
  - Company header with logo
  - Customer billing/shipping address
  - Line items with totals
  - Terms and conditions
  - Bilingual support (EN/BM)

## API Endpoints

```
POST   /api/sales/orders          - Create order
GET    /api/sales/orders          - List orders
GET    /api/sales/orders/:id      - Get order details
PUT    /api/sales/orders/:id      - Update order
DELETE /api/sales/orders/:id      - Delete draft order
PUT    /api/sales/orders/:id/confirm   - Confirm order
PUT    /api/sales/orders/:id/ship      - Mark shipped
PUT    /api/sales/orders/:id/deliver   - Mark delivered
PUT    /api/sales/orders/:id/cancel    - Cancel order
POST   /api/sales/orders/:id/invoice   - Create invoice from order
GET    /api/sales/orders/:id/pdf       - Generate PDF
```

## Database Schema

```prisma
model SalesOrder {
  id                String           @id @default(cuid())
  orderNumber       String           @unique
  customerId        String
  customer          Contact          @relation(fields: [customerId], references: [id])
  orderDate         DateTime
  expectedShipDate  DateTime?
  shippedDate       DateTime?
  deliveredDate     DateTime?
  status            SalesOrderStatus @default(DRAFT)
  invoiceStatus     InvoiceStatus    @default(NOT_INVOICED)
  paymentStatus     PaymentStatus    @default(UNPAID)
  shippingAddress   Json?
  billingAddress    Json?
  subtotal          Decimal
  discountType      DiscountType?
  discountValue     Decimal          @default(0)
  discountAmount    Decimal          @default(0)
  taxAmount         Decimal          @default(0)
  shippingCharges   Decimal          @default(0)
  total             Decimal
  notes             String?
  termsConditions   String?
  salesPersonId     String?
  warehouseId       String?
  items             SalesOrderItem[]
  invoices          Invoice[]
  organizationId    String
  createdById       String
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
}

model SalesOrderItem {
  id              String      @id @default(cuid())
  salesOrderId    String
  salesOrder      SalesOrder  @relation(fields: [salesOrderId], references: [id])
  itemId          String
  item            Item        @relation(fields: [itemId], references: [id])
  description     String?
  quantity        Decimal
  unitPrice       Decimal
  discountPercent Decimal     @default(0)
  discountAmount  Decimal     @default(0)
  taxRateId       String?
  taxAmount       Decimal     @default(0)
  total           Decimal
  shippedQty      Decimal     @default(0)
  invoicedQty     Decimal     @default(0)
}

enum SalesOrderStatus {
  DRAFT
  CONFIRMED
  PACKED
  SHIPPED
  DELIVERED
  CLOSED
  CANCELLED
}

enum InvoiceStatus {
  NOT_INVOICED
  PARTIALLY_INVOICED
  INVOICED
}

enum PaymentStatus {
  UNPAID
  PARTIALLY_PAID
  PAID
}
```
