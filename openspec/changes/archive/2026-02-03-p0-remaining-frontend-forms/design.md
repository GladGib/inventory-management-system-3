## Context

The IMS has a working Sales module frontend with complete create/edit/detail pages for Sales Orders, Invoices, and Payments. The Purchase and Inventory modules have backend APIs but lack frontend forms. Users currently cannot:
- Create or edit Purchase Orders through the UI
- Create or edit vendor Bills
- Record vendor payments
- Create inventory adjustments (placeholder page only)
- Create inventory transfers (placeholder page only)

All backend APIs are implemented and functional. The frontend patterns established in the Sales module should be mirrored for consistency.

**Existing Patterns:**
- Sales forms use Ant Design Form with 2-column layout (16/8 split)
- Reusable components: `CustomerSelect`, `LineItemsTable`, `ItemSelect`, `OrderSummary`
- TanStack Query hooks for data fetching and mutations
- Form state managed with `useState` for line items, `Form.useWatch` for reactive calculations

## Goals / Non-Goals

**Goals:**
- Implement all P0 frontend forms for Purchase and Inventory modules
- Follow existing Sales module patterns for consistency
- Provide complete CRUD operations from the UI
- Support all workflow actions (issue, cancel, receive, etc.)

**Non-Goals:**
- PDF generation (P1 item, separate change)
- Receive goods form (separate workflow)
- Vendor credits (P1 item)
- Backend API changes (APIs already exist)
- Mobile responsiveness optimizations (current desktop-first approach)

## Decisions

### Decision 1: Mirror Sales Module Component Architecture
**Choice:** Create parallel component structure under `src/components/purchases/`
**Rationale:** Maintains codebase consistency, reduces learning curve for developers
**Alternatives:**
- Generic shared components → Rejected: Would require significant refactoring of existing sales components
- Inline components per page → Rejected: Leads to duplication and harder maintenance

### Decision 2: Reuse Item Selection Component
**Choice:** Use existing `ItemSelect` component from sales module for line items
**Rationale:** Item selection logic is identical; no need to duplicate
**Alternatives:**
- Create new PurchaseItemSelect → Rejected: Unnecessary duplication

### Decision 3: Create VendorSelect Component
**Choice:** New component `VendorSelect` mirroring `CustomerSelect`
**Rationale:** Vendors have different API endpoint and may have different display requirements
**Alternatives:**
- Generic ContactSelect with type prop → Acceptable but less explicit

### Decision 4: Warehouse Selection for Inventory Operations
**Choice:** Required warehouse selection for adjustments and transfers
**Rationale:** Specs require warehouse context for all inventory operations
**Alternatives:**
- Default to first warehouse → Rejected: Could cause data errors

### Decision 5: Form Validation Strategy
**Choice:** Ant Design Form validation with custom validators for line items
**Rationale:** Consistent with existing sales forms; handles complex validation scenarios
**Alternatives:**
- Zod/Yup schemas → Would require additional dependencies

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| API response format differences | Forms may break if purchase APIs differ from sales | Review API contracts before implementation |
| Missing mutation hooks | Some hooks may not exist in `use-purchases.ts` | Create hooks as needed following existing patterns |
| Line item state complexity | Transfers have source/destination warehouse per item | Use simpler single-warehouse-per-transfer model as per spec |
| Form re-renders on large item lists | Performance degradation | Use `useMemo` for calculations, consider virtualization if > 50 items |

## File Structure

```
apps/web/src/
├── app/(dashboard)/
│   ├── purchases/
│   │   ├── orders/
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx        # Detail view
│   │   │   │   └── edit/page.tsx   # Edit form
│   │   │   └── new/page.tsx        # Create form
│   │   ├── bills/
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx        # Detail view
│   │   │   │   └── edit/page.tsx   # Edit form
│   │   │   └── new/page.tsx        # Create form
│   │   └── payments/
│   │       ├── [id]/page.tsx       # Detail view
│   │       └── new/page.tsx        # Create form
│   └── inventory/
│       ├── adjustments/
│       │   ├── page.tsx            # List view (replace placeholder)
│       │   ├── [id]/page.tsx       # Detail view
│       │   └── new/page.tsx        # Create form
│       └── transfers/
│           ├── page.tsx            # List view (replace placeholder)
│           ├── [id]/page.tsx       # Detail view
│           └── new/page.tsx        # Create form
├── components/
│   └── purchases/
│       ├── index.ts
│       ├── VendorSelect.tsx
│       ├── PurchaseLineItemsTable.tsx
│       └── PurchaseOrderSummary.tsx
└── hooks/
    └── use-purchases.ts            # Add missing mutations
```
