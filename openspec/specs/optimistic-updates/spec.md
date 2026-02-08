# Optimistic Updates (TanStack Query) Specification

## Purpose
Add optimistic update patterns to TanStack Query mutation hooks so that the UI reflects changes instantly without waiting for server responses, while providing automatic rollback on errors to maintain data integrity.

## Architecture

### Target Directory
- Helper hook: `apps/web/src/hooks/use-optimistic-mutation.ts`
- Modified hooks: `apps/web/src/hooks/use-items.ts`, `use-contacts.ts`, `use-sales.ts`, `use-purchases.ts`, `use-inventory.ts`

### Dependencies
- `@tanstack/react-query` (already installed, v5.x)
- `antd` message API (already installed)
- No new packages required

### Design Principles
- **Optimistic for status changes and simple CRUD**: Status transitions and single-entity create/update/delete operations provide instant feedback.
- **Server-authoritative for financial calculations**: Invoice totals, payment allocations, tax computations, and multi-step workflows remain server-authoritative. These mutations do NOT use optimistic updates.
- **Rollback on error**: Every optimistic update stores the previous cache state and restores it automatically if the server returns an error.
- **Invalidate on settle**: Regardless of success or failure, `onSettled` always invalidates the relevant queries to ensure eventual consistency with the server.

---

## Requirements

### Requirement: useOptimisticMutation helper hook
The system SHALL provide a `useOptimisticMutation` helper hook that wraps `useMutation` from TanStack Query with standard optimistic update patterns.

#### Scenario: Hook signature
- **WHEN** a developer imports `useOptimisticMutation`
- **THEN** the hook SHALL accept a configuration object with the following fields:
  - `mutationFn`: The async function to call on the server (required)
  - `queryKey`: The TanStack Query key to optimistically update (required)
  - `updater`: A function `(oldData: TData, variables: TVariables) => TData` that produces the optimistic cache state (required)
  - `invalidateKeys`: Array of additional query keys to invalidate on settle (optional, default `[]`)
  - `successMessage`: String or `false` to show/suppress the success toast (optional, default `undefined`)
  - `errorMessage`: String for the error toast fallback (optional, default `'Operation failed'`)

#### Scenario: Optimistic cache update on mutate
- **WHEN** the mutation is triggered via `mutate()` or `mutateAsync()`
- **THEN** the `onMutate` callback SHALL:
  1. Cancel any outgoing refetches for `queryKey` via `queryClient.cancelQueries({ queryKey })`
  2. Snapshot the current cache value via `queryClient.getQueryData(queryKey)`
  3. Call the `updater` function with the current cache and the mutation variables
  4. Set the new optimistic data via `queryClient.setQueryData(queryKey, optimisticData)`
  5. Return `{ previousData: snapshot }` as the mutation context
- **AND** if `successMessage` is a string, display `message.success(successMessage)` immediately

#### Scenario: Rollback on error
- **WHEN** the server returns an error (network failure, validation error, or any non-2xx response)
- **THEN** the `onError` callback SHALL:
  1. Restore the cache to the snapshot via `queryClient.setQueryData(queryKey, context.previousData)`
  2. Display `message.error(error.response?.data?.message || errorMessage)`
  3. If `successMessage` was shown, it SHALL be visually superseded by the error toast (antd message handles this naturally via sequential display)

#### Scenario: Invalidate on settle
- **WHEN** the mutation completes (success or error)
- **THEN** the `onSettled` callback SHALL:
  1. Invalidate `queryKey` via `queryClient.invalidateQueries({ queryKey })`
  2. Invalidate each key in `invalidateKeys` via `queryClient.invalidateQueries()`
  3. This ensures the cache is reconciled with the server state regardless of outcome

#### Scenario: TypeScript generics
- **WHEN** the hook is used
- **THEN** it SHALL be typed as `useOptimisticMutation<TData, TVariables, TError>` to provide full type safety on the updater function, mutation variables, and error handling

---

### Requirement: Optimistic updates for item status changes and CRUD
The system SHALL apply optimistic updates to item mutations in `apps/web/src/hooks/use-items.ts`.

#### Scenario: Optimistic item creation
- **WHEN** `useCreateItem` mutation is triggered
- **THEN** the items list cache SHALL optimistically append a new item with:
  - A temporary `id` (e.g., `'temp-' + Date.now()`)
  - All fields from the create DTO
  - `status: 'ACTIVE'`, `createdAt` and `updatedAt` set to current ISO timestamp
  - `stockLevels: []`, computed `totalStock: 0`, `availableStock: 0`
- **AND** the success message `'Item created successfully'` SHALL display immediately
- **AND** on server success, the cache SHALL be invalidated to replace the temp item with the real one

#### Scenario: Optimistic item update
- **WHEN** `useUpdateItem` mutation is triggered with `{ id, data }`
- **THEN** the items list cache SHALL optimistically merge the update DTO into the matching item
- **AND** the item detail cache (`itemKeys.detail(id)`) SHALL also be optimistically updated
- **AND** the success message `'Item updated successfully'` SHALL display immediately

#### Scenario: Optimistic item deletion
- **WHEN** `useDeleteItem` mutation is triggered with an item `id`
- **THEN** the items list cache SHALL optimistically remove the item with the matching `id`
- **AND** the success message `'Item deleted successfully'` SHALL display immediately

---

### Requirement: Optimistic updates for contact CRUD
The system SHALL apply optimistic updates to contact mutations in `apps/web/src/hooks/use-contacts.ts`.

#### Scenario: Optimistic contact creation
- **WHEN** `useCreateContact` mutation is triggered
- **THEN** the contacts list cache SHALL optimistically append the new contact with a temporary `id`
- **AND** the customer list or vendor list cache SHALL also be optimistically updated based on the contact `type`

#### Scenario: Optimistic contact update
- **WHEN** `useUpdateContact` mutation is triggered with `{ id, data }`
- **THEN** the contacts list cache and detail cache SHALL optimistically merge the updated fields

#### Scenario: Optimistic contact deletion
- **WHEN** `useDeleteContact` mutation is triggered
- **THEN** the contacts list, customer list, and vendor list caches SHALL optimistically remove the matching contact

---

### Requirement: Optimistic updates for sales order status changes
The system SHALL apply optimistic updates to sales order status mutations in `apps/web/src/hooks/use-sales.ts`.

#### Scenario: Optimistic sales order confirmation
- **WHEN** `useConfirmSalesOrder` mutation is triggered with order `id`
- **THEN** the orders list cache SHALL optimistically update the matching order's `status` from `'DRAFT'` to `'CONFIRMED'`
- **AND** the order detail cache SHALL also be optimistically updated
- **AND** the success message `'Sales order confirmed'` SHALL display immediately

#### Scenario: Optimistic sales order shipment
- **WHEN** `useShipSalesOrder` mutation is triggered with order `id`
- **THEN** the orders list cache SHALL optimistically update `status` to `'SHIPPED'`
- **AND** the order detail cache SHALL also be optimistically updated

#### Scenario: Optimistic sales order cancellation
- **WHEN** `useCancelSalesOrder` mutation is triggered with order `id`
- **THEN** the orders list cache SHALL optimistically update `status` to `'CANCELLED'`
- **AND** the order detail cache SHALL also be optimistically updated

#### Scenario: Optimistic invoice void
- **WHEN** `useVoidInvoice` mutation is triggered with invoice `id`
- **THEN** the invoices list cache SHALL optimistically update `status` to `'VOID'`
- **AND** the invoice detail cache SHALL also be optimistically updated

#### Scenario: Optimistic invoice send
- **WHEN** `useSendInvoice` mutation is triggered with invoice `id`
- **THEN** the invoices list cache SHALL optimistically update `status` to `'SENT'`

---

### Requirement: Optimistic updates for purchase order status changes
The system SHALL apply optimistic updates to purchase order status mutations in `apps/web/src/hooks/use-purchases.ts`.

#### Scenario: Optimistic PO issue
- **WHEN** `useIssuePurchaseOrder` mutation is triggered with PO `id`
- **THEN** the orders list cache SHALL optimistically update `status` to `'ISSUED'`
- **AND** the order detail cache SHALL also be optimistically updated
- **AND** the success message `'Purchase order issued'` SHALL display immediately

#### Scenario: Optimistic PO cancellation
- **WHEN** `useCancelPurchaseOrder` mutation is triggered with PO `id`
- **THEN** the orders list cache SHALL optimistically update `status` to `'CANCELLED'`

#### Scenario: Optimistic bill approval
- **WHEN** `useApproveBill` mutation is triggered with bill `id`
- **THEN** the bills list cache SHALL optimistically update `status` to `'APPROVED'`

#### Scenario: Optimistic bill void
- **WHEN** `useVoidBill` mutation is triggered with bill `id`
- **THEN** the bills list cache SHALL optimistically update `status` to `'VOID'`

---

### Requirement: Optimistic updates for inventory transfer status changes
The system SHALL apply optimistic updates to transfer status mutations in `apps/web/src/hooks/use-inventory.ts`.

#### Scenario: Optimistic transfer issue
- **WHEN** `useIssueTransfer` mutation is triggered with transfer `id`
- **THEN** the transfers list cache SHALL optimistically update `status` to `'IN_TRANSIT'`
- **AND** the transfer detail cache SHALL also be optimistically updated
- **AND** stock level queries SHALL be invalidated (NOT optimistically updated, since stock math is server-authoritative)

#### Scenario: Optimistic transfer receive
- **WHEN** `useReceiveTransfer` mutation is triggered with transfer `id`
- **THEN** the transfers list cache SHALL optimistically update `status` to `'RECEIVED'`
- **AND** stock level queries SHALL be invalidated on settle

#### Scenario: Optimistic transfer cancellation
- **WHEN** `useCancelTransfer` mutation is triggered with transfer `id`
- **THEN** the transfers list cache SHALL optimistically update `status` to `'CANCELLED'`
- **AND** stock level queries SHALL be invalidated on settle

---

### Requirement: Optimistic updates for stock adjustment creation
The system SHALL apply optimistic updates to adjustment creation in `apps/web/src/hooks/use-inventory.ts`.

#### Scenario: Optimistic adjustment creation
- **WHEN** `useCreateAdjustment` mutation is triggered
- **THEN** the adjustments list cache SHALL optimistically append the new adjustment with a temporary `id` and `status: 'COMPLETED'`
- **AND** the success message `'Adjustment created successfully'` SHALL display immediately
- **AND** stock level queries SHALL be invalidated on settle (NOT optimistically updated)

---

### Requirement: Optimistic updates for sales return status changes
The system SHALL apply optimistic updates to sales return workflow mutations in `apps/web/src/hooks/use-sales.ts`.

#### Scenario: Optimistic sales return approval
- **WHEN** `useApproveSalesReturn` mutation is triggered with return `id`
- **THEN** the returns list cache SHALL optimistically update `status` to `'APPROVED'`

#### Scenario: Optimistic sales return receive
- **WHEN** `useReceiveSalesReturn` mutation is triggered with return `id`
- **THEN** the returns list cache SHALL optimistically update `status` to `'RECEIVED'`

#### Scenario: Optimistic sales return rejection
- **WHEN** `useRejectSalesReturn` mutation is triggered with return `id`
- **THEN** the returns list cache SHALL optimistically update `status` to `'REJECTED'`

---

### Requirement: Excluded mutations (server-authoritative only)
The system SHALL NOT apply optimistic updates to the following mutations, which remain server-authoritative due to financial calculation complexity or multi-step dependencies.

#### Scenario: Financial calculations excluded
- **GIVEN** the following mutation hooks:
  - `useCreateInvoice` (involves tax calculation, subtotal, discount computation)
  - `useCreateInvoiceFromOrder` (complex order-to-invoice mapping)
  - `useCreatePayment` (payment allocation across invoices, balance recalculation)
  - `useCreateVendorPayment` (multi-bill allocation)
  - `useApplyCreditNote` (credit-to-invoice application, balance adjustments)
  - `useApplyVendorCredit` (credit-to-bill application)
  - `useProcessSalesReturn` (triggers credit note generation)
  - `useCreateReceive` (goods receipt updates stock, creates receive lines)
  - `useCreateBillFromOrder` (PO-to-bill mapping with line items)
- **WHEN** these mutations are triggered
- **THEN** the UI SHALL show a loading state (button disabled with spinner) until the server responds
- **AND** success/error toasts SHALL only appear after the server response

---

## File Manifest

| File Path | Purpose |
|-----------|---------|
| `apps/web/src/hooks/use-optimistic-mutation.ts` | Reusable helper hook wrapping useMutation with optimistic patterns |

### Modified Files

| File Path | Change Description |
|-----------|-------------------|
| `apps/web/src/hooks/use-items.ts` | Add optimistic updates to useCreateItem, useUpdateItem, useDeleteItem |
| `apps/web/src/hooks/use-contacts.ts` | Add optimistic updates to useCreateContact, useUpdateContact, useDeleteContact |
| `apps/web/src/hooks/use-sales.ts` | Add optimistic updates to useConfirmSalesOrder, useShipSalesOrder, useCancelSalesOrder, useVoidInvoice, useSendInvoice, useApproveSalesReturn, useReceiveSalesReturn, useRejectSalesReturn |
| `apps/web/src/hooks/use-purchases.ts` | Add optimistic updates to useIssuePurchaseOrder, useCancelPurchaseOrder, useApproveBill, useVoidBill |
| `apps/web/src/hooks/use-inventory.ts` | Add optimistic updates to useIssueTransfer, useReceiveTransfer, useCancelTransfer, useCreateAdjustment |

---

## Implementation Notes

1. **Cache key patterns**: The existing query key factories (`itemKeys`, `salesKeys`, `purchaseKeys`, `inventoryKeys`, `contactKeys`) use tuple-based keys. The optimistic updater must handle both list queries (which contain paginated response wrappers) and detail queries (which contain single entities).

2. **Paginated response handling**: List caches use `PaginatedResponse<T>` with structure `{ data: T[], meta: { total, page, limit, hasMore } }` or flat arrays. The updater SHALL check for both shapes and update accordingly.

3. **List cache updater for status changes**: For status transition mutations (confirm, ship, void, etc.), the updater SHALL iterate the `data` array in the paginated response and update the matching item's `status` field. Example:
   ```typescript
   updater: (old, id) => ({
     ...old,
     data: old.data.map(order =>
       order.id === id ? { ...order, status: 'CONFIRMED' } : order
     ),
   })
   ```

4. **Detail cache updater**: For mutations that change a single entity, both the list cache AND the detail cache should be updated. The helper hook supports updating multiple query keys via `invalidateKeys`, but for detail caches the updater can be applied separately.

5. **Toast behavior**: Optimistic success toasts appear immediately. If rollback occurs, the error toast appears ~200-2000ms later, superseding the success message naturally. Ant Design `message` API handles this by showing messages in sequence.

6. **Category create/delete**: Category mutations in the items module (if exposed via a separate hook) SHALL also receive optimistic updates for simple tree manipulation. However, if categories are nested, only the flat list SHALL be optimistically updated; tree recomputation remains server-authoritative.
