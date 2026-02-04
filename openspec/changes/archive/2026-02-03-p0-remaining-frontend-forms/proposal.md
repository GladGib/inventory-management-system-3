## Why

The IMS currently has backend APIs for Purchase Orders, Bills, Vendor Payments, Inventory Adjustments, and Inventory Transfers, but the frontend only has list views with placeholder or missing create/edit forms. Users cannot create or manage these critical business transactions through the UI, blocking core procurement and inventory management workflows.

## What Changes

- **Purchase Order Forms**: Add create and edit pages for purchase orders with vendor selection, line items, and expected delivery dates
- **Bill Forms**: Add create and edit pages for vendor bills with line item entry and PO linking
- **Vendor Payment Form**: Add payment recording form with bill allocation similar to sales payments
- **Inventory Adjustments UI**: Replace placeholder with functional list + create form for stock adjustments (damage, expiry, corrections)
- **Inventory Transfers UI**: Replace placeholder with functional list + create form for inter-warehouse transfers
- **Detail Pages**: Add detail view pages for PO, Bill, and Vendor Payment (following existing sales module patterns)

## Capabilities

### New Capabilities
- `purchase-order-forms`: Create and edit forms for purchase orders with vendor selection, line items, and workflow actions
- `bill-forms`: Create and edit forms for vendor bills with line items and PO reference
- `vendor-payment-forms`: Payment recording form with bill allocation and payment method selection
- `inventory-adjustments-ui`: List view with filters, create adjustment form, and adjustment detail view
- `inventory-transfers-ui`: List view with filters, create transfer form, and transfer detail view

### Modified Capabilities
- `purchase-orders`: Frontend pages for detail view and form routes
- `bills`: Frontend pages for detail view and form routes
- `purchase-payments`: Frontend pages for detail view and form routes
- `inventory-adjustments`: Frontend pages replacing placeholder
- `inventory-transfers`: Frontend pages replacing placeholder

## Impact

- **Frontend Routes**: New pages under `/purchases/orders/[id]`, `/purchases/orders/new`, `/purchases/bills/[id]`, `/purchases/bills/new`, `/purchases/payments/[id]`, `/purchases/payments/new`
- **Components**: New form components in `src/components/purchases/` following sales module patterns
- **Hooks**: New TanStack Query mutations for create/update operations (if not already present)
- **Existing Pages**: Replace placeholder content in `/inventory/adjustments` and `/inventory/transfers`
- **No Backend Changes**: All APIs already exist - this is frontend-only implementation
