# Contact Detail Pages

## Overview
Detail pages for customers and vendors showing full profile information, transaction history, account balance, and related documents.

## Requirements

### CD-001: Customer Detail Page
- **Priority**: P0
- **Description**: Full customer profile at `/contacts/customers/[id]`
- **Acceptance Criteria**:
  - Header: Company name, contact person, email, phone
  - Balance summary card: Total receivable, overdue amount
  - Contact information section: Address, tax number, payment terms
  - Action buttons: Edit, New Invoice, New Sales Order
  - Breadcrumb navigation
  - 404 handling for invalid ID

### CD-002: Vendor Detail Page
- **Priority**: P0
- **Description**: Full vendor profile at `/contacts/vendors/[id]`
- **Acceptance Criteria**:
  - Header: Company name, contact person, email, phone
  - Balance summary card: Total payable, overdue amount
  - Contact information section: Address, tax number, payment terms
  - Action buttons: Edit, New Bill, New Purchase Order
  - Breadcrumb navigation
  - 404 handling for invalid ID

### CD-003: Transaction History Tab
- **Priority**: P0
- **Description**: List of all transactions with contact
- **Acceptance Criteria**:
  - For customers: Sales orders, invoices, payments received
  - For vendors: Purchase orders, bills, payments made
  - Date range filter
  - Status filter
  - Sortable columns
  - Pagination
  - Click row to navigate to transaction detail

### CD-004: Account Balance Card
- **Priority**: P0
- **Description**: Summary of outstanding balance
- **Acceptance Criteria**:
  - Total balance (receivable/payable)
  - Current (not due)
  - Overdue buckets: 1-30 days, 31-60 days, 61-90 days, 90+ days
  - Visual progress bar or chart
  - Link to aging report

### CD-005: Quick Actions
- **Priority**: P1
- **Description**: Common actions from detail page
- **Acceptance Criteria**:
  - Create new transaction (SO, Invoice, PO, Bill)
  - Record payment
  - Send statement (future)
  - Export transactions (future)

## Page Structure

```
app/(dashboard)/contacts/
├── customers/
│   └── [id]/
│       └── page.tsx        # Customer detail
└── vendors/
    └── [id]/
        └── page.tsx        # Vendor detail
```

## Components

```
components/contacts/
├── ContactHeader.tsx       # Shared header component
├── BalanceSummaryCard.tsx  # Account balance display
├── TransactionHistory.tsx  # Transaction list with filters
└── index.ts
```

## API Integration

Uses existing endpoints:
- `GET /contacts/:id` - Contact details with balance
- Customer transactions: `/sales/orders?customerId=X`, `/invoices?customerId=X`, `/sales/payments?customerId=X`
- Vendor transactions: `/purchases/orders?vendorId=X`, `/bills?vendorId=X`, `/purchases/payments?vendorId=X`

## Hooks

```typescript
// Add to hooks/use-contacts.ts
export function useContact(id: string);
export function useCustomerTransactions(customerId: string, filters);
export function useVendorTransactions(vendorId: string, filters);
```
