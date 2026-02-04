## Context

The Sales module backend is fully implemented with REST APIs for sales orders, invoices, and payments. The frontend currently only has list pages (`orders/page.tsx`, `invoices/page.tsx`, `payments/page.tsx`) with no create, edit, or detail views.

Existing patterns:
- TanStack Query hooks exist in `use-sales.ts` with mutations for create/update operations
- Service layer exists in `lib/sales.ts` with DTOs and API calls
- Form pages follow Ant Design Form patterns (see `items/new/page.tsx`)
- List pages use Card + Table layout with action dropdowns

## Goals / Non-Goals

**Goals:**
- Enable users to create/edit sales orders with line items, customer selection, discounts
- Enable viewing sales order details with status workflow actions
- Enable users to create invoices (standalone and from orders)
- Enable viewing invoice details with payment tracking
- Enable recording customer payments with multi-invoice allocation
- Maintain consistent UX patterns with existing pages (items, customers, vendors)
- Support Malaysian currency (RM) formatting throughout

**Non-Goals:**
- PDF generation/printing (existing/separate feature)
- e-Invoice submission UI (separate compliance module)
- Sales returns and credit notes (future backlog item)
- Bulk operations on orders/invoices
- Customer/item search with barcode scanning

## Decisions

### 1. Form Layout Structure
**Decision:** Two-column layout (16/8 ratio) with primary form on left, summary/totals sidebar on right.

**Why:** Matches existing `items/new/page.tsx` pattern. Keeps line items prominent while showing running totals in a fixed sidebar position. Alternative (single column) was rejected as it pushes totals below the fold for long orders.

### 2. Line Items Component
**Decision:** Create a reusable `<LineItemsTable>` component with inline editing using Ant Design's editable Table.

**Why:** Line items are shared between sales orders and invoices. Inline editing is more efficient than modal-based row editing for data-entry-heavy workflows. Alternative (Form.List with multiple inputs) creates too much visual noise.

**Implementation:**
- Item selection via searchable Select with debounced API call
- Auto-fill unit price from item's selling price
- Real-time row total calculation
- Add/remove row actions
- Tax rate selection per line

### 3. Tax Calculation
**Decision:** Calculate taxes on the frontend with backend validation.

**Why:** Provides immediate feedback to users. Backend validates final totals on submission. Tax rates are fetched once and cached. Alternative (server-side calculation on every change) adds latency and complexity.

### 4. Customer Selection
**Decision:** Use Select with search and "Create Customer" quick-add option.

**Why:** Most orders are for existing customers. Quick-add allows creating new customers without leaving the form. Uses `useCustomers` hook from existing contacts module.

### 5. Status Workflow Actions
**Decision:** Action buttons in page header based on current status, with confirmation modals.

**Why:** Status transitions need confirmation to prevent accidental changes. Buttons appear/disappear based on valid transitions:
- DRAFT: Edit, Confirm, Cancel
- CONFIRMED: Ship, Create Invoice, Cancel
- SHIPPED: Deliver, Create Invoice
- DELIVERED: Close, Create Invoice

### 6. Payment Allocation UI
**Decision:** Show unpaid invoices table with amount input per row; total must match payment amount.

**Why:** Payment allocation is critical for accurate receivables tracking. Table format allows splitting a payment across multiple invoices easily. Validation ensures allocations sum to payment amount.

### 7. File Organization
**Decision:** Create pages directly in route folders per Next.js App Router convention.

**Structure:**
```
apps/web/src/app/(dashboard)/sales/
├── orders/
│   ├── new/page.tsx          # Create form
│   ├── [id]/page.tsx         # Detail view
│   └── [id]/edit/page.tsx    # Edit form
├── invoices/
│   ├── new/page.tsx
│   ├── [id]/page.tsx
│   └── [id]/edit/page.tsx
└── payments/
    ├── new/page.tsx
    └── [id]/page.tsx
```

## Risks / Trade-offs

**[Large form state complexity]** → Use Ant Design Form's built-in state management; avoid separate React state for form fields. Form.useWatch for computed fields.

**[Line items performance with many rows]** → Virtualize table only if users report issues (unlikely for typical 10-50 line orders). Keep it simple initially.

**[Stale customer/item data]** → Use short staleTime (30s) for customer/item selects; show loading states during refetch.

**[Optimistic UI conflicts]** → Don't use optimistic updates for status changes; wait for server confirmation to ensure data integrity.

**[Tax rate changes after order creation]** → Store tax rate snapshot on line items at creation time (backend handles this). Frontend displays stored rates.

## Open Questions

- None blocking implementation. Tax rate management UI is a separate backlog item.
