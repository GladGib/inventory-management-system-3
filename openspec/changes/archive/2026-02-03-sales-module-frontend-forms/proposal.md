## Why

The Sales module backend APIs are fully implemented (sales orders, invoices, payments) but the frontend only has list pages. Users cannot create, edit, or view details of sales transactions from the UI, making the system unusable for actual business operations. This blocks the core sales workflow.

## What Changes

- Add Sales Order create/edit form with customer selection, line items, discounts, and tax calculation
- Add Sales Order detail page with full order information and status action buttons (confirm, ship, deliver, cancel)
- Add Invoice create/edit form with line items and payment terms
- Add Invoice detail page with payment status and action buttons (send, void, record payment)
- Add Payment recording form with multi-invoice allocation support
- Connect all forms to existing backend APIs via TanStack Query hooks

## Capabilities

### New Capabilities
- `sales-order-form`: Create and edit sales orders with customer selection, line item management, discount application, and tax calculation
- `sales-order-detail`: View sales order details with status workflow actions and conversion to invoice
- `invoice-form`: Create and edit invoices with line items, due dates, and terms
- `invoice-detail`: View invoice details with payment progress and status actions
- `payment-form`: Record customer payments with allocation to multiple invoices

### Modified Capabilities
- `sales-orders`: Add frontend form validation rules and UI state management requirements
- `invoices`: Add frontend form validation rules and payment tracking UI requirements
- `sales-payments`: Add multi-invoice allocation UI requirements

## Impact

- **Frontend**: New pages in `apps/web/src/app/(dashboard)/sales/`
  - `orders/new/page.tsx` - Create sales order
  - `orders/[id]/page.tsx` - Sales order detail
  - `orders/[id]/edit/page.tsx` - Edit sales order
  - `invoices/new/page.tsx` - Create invoice
  - `invoices/[id]/page.tsx` - Invoice detail
  - `invoices/[id]/edit/page.tsx` - Edit invoice
  - `payments/new/page.tsx` - Record payment
  - `payments/[id]/page.tsx` - Payment detail
- **Hooks**: Extend `apps/web/src/hooks/use-sales.ts` with create/update mutations
- **Libs**: Extend `apps/web/src/lib/sales.ts` with form DTOs
- **Dependencies**: May need to add form libraries (Ant Design Form is already available)
