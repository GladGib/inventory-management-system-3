## 1. Shared Components Setup

- [x] 1.1 Create `VendorSelect` component in `src/components/purchases/VendorSelect.tsx`
- [x] 1.2 Create `PurchaseLineItemsTable` component mirroring `LineItemsTable` from sales
- [x] 1.3 Create `PurchaseOrderSummary` component mirroring `OrderSummary` from sales
- [x] 1.4 Create `WarehouseSelect` component in `src/components/inventory/WarehouseSelect.tsx`
- [x] 1.5 Create index exports for purchases and inventory components

## 2. Purchase Order Forms

- [x] 2.1 Create purchase order create form at `/purchases/orders/new/page.tsx`
- [x] 2.2 Create purchase order detail page at `/purchases/orders/[id]/page.tsx`
- [x] 2.3 Create purchase order edit form at `/purchases/orders/[id]/edit/page.tsx`
- [x] 2.4 Add missing mutation hooks to `use-purchases.ts` (createPurchaseOrder, updatePurchaseOrder)
- [x] 2.5 Implement workflow actions on detail page (Issue, Cancel)

## 3. Bill Forms

- [x] 3.1 Create bill create form at `/purchases/bills/new/page.tsx`
- [x] 3.2 Create bill detail page at `/purchases/bills/[id]/page.tsx`
- [x] 3.3 Create bill edit form at `/purchases/bills/[id]/edit/page.tsx`
- [x] 3.4 Add missing mutation hooks to `use-purchases.ts` (createBill, updateBill)
- [x] 3.5 Implement workflow actions on detail page (Approve, Void, Record Payment link)

## 4. Vendor Payment Forms

- [x] 4.1 Create vendor payment form at `/purchases/payments/new/page.tsx`
- [x] 4.2 Create vendor payment detail page at `/purchases/payments/[id]/page.tsx`
- [x] 4.3 Create `BillAllocationTable` component for payment allocation UI
- [x] 4.4 Add missing mutation hooks to `use-purchases.ts` (createVendorPayment)
- [x] 4.5 Implement auto-allocate functionality

## 5. Inventory Adjustments UI

- [x] 5.1 Replace placeholder with list view at `/inventory/adjustments/page.tsx`
- [x] 5.2 Create adjustment create form at `/inventory/adjustments/new/page.tsx`
- [x] 5.3 Create adjustment detail page at `/inventory/adjustments/[id]/page.tsx`
- [x] 5.4 Create `AdjustmentItemsTable` component with reason code selection
- [x] 5.5 Add inventory adjustment hooks to `use-inventory.ts` (useAdjustments, useCreateAdjustment)
- [x] 5.6 Add stock level display for selected warehouse/item combinations

## 6. Inventory Transfers UI

- [x] 6.1 Replace placeholder with list view at `/inventory/transfers/page.tsx`
- [x] 6.2 Create transfer create form at `/inventory/transfers/new/page.tsx`
- [x] 6.3 Create transfer detail page at `/inventory/transfers/[id]/page.tsx`
- [x] 6.4 Create `TransferItemsTable` component
- [x] 6.5 Add inventory transfer hooks to `use-inventory.ts` (useTransfers, useCreateTransfer)
- [x] 6.6 Implement workflow actions on detail page (Issue, Receive, Cancel)

## 7. Integration & Polish

- [x] 7.1 Update navigation links in list pages to point to new form routes
- [x] 7.2 Add breadcrumb navigation to all new pages
- [x] 7.3 Test form validation across all forms
- [x] 7.4 Verify API integration for all CRUD operations
- [x] 7.5 Run TypeScript build to check for type errors
