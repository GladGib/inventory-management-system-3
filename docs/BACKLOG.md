# IMS Development Backlog

Last updated: 2026-02-04 (P1 dashboard/contacts/reports complete)

This document tracks remaining, incomplete, and not-yet-implemented features based on the Implementation Plan and OpenSpec specifications.

---

## Legend

| Status | Description |
|--------|-------------|
| **Done** | Fully implemented (backend + frontend) |
| **Partial** | Backend exists, frontend incomplete or placeholder |
| **Backend Only** | API implemented, no frontend |
| **Spec Only** | Specification exists, not implemented |
| **Not Started** | Planned but no specification or implementation |

---

## Phase 1: Foundation - COMPLETE

| Feature | Status | Notes |
|---------|--------|-------|
| NestJS scaffolding | Done | Modular architecture |
| PostgreSQL + Prisma | Done | Schema with migrations |
| JWT Authentication | Done | Login, refresh tokens |
| RBAC Authorization | Done | Role-based access |
| Swagger/OpenAPI | Done | Auto-generated docs |
| Error handling & logging | Done | Global filters |
| Next.js 14 App Router | Done | SSR enabled |
| Ant Design theming | Done | Custom theme |
| TanStack Query | Done | Data fetching |
| Auth flow (frontend) | Done | Login, logout, protected routes |
| Layout components | Done | Sidebar, header, breadcrumbs |

---

## Phase 2: Core Modules - IN PROGRESS

### Items Module

| Feature | Status | Spec | Notes |
|---------|--------|------|-------|
| Item CRUD | Done | items-management | List, detail, create, edit |
| Categories | Done | categories | Full CRUD with hierarchy |
| Item search & filters | Done | items-management | SKU, name, type, status |
| Low stock indicator | Done | stock-tracking | Warning icon on list |
| Item images upload | **Spec Only** | file-uploads | Backend routes exist, UI not implemented |
| Item groups/variants | **Spec Only** | item-groups | Placeholder page only |
| Part number cross-reference | Not Started | - | Industry-specific feature |
| Vehicle compatibility | Not Started | - | Industry-specific feature |

### Inventory Module

| Feature | Status | Spec | Notes |
|---------|--------|------|-------|
| Stock levels view | Done | stock-tracking | List with warehouse filter |
| Stock by item | Done | stock-tracking | Per-warehouse breakdown |
| Warehouses CRUD | Done | warehouses | Full management |
| Inventory adjustments | Done | inventory-adjustments | List, create, detail pages |
| Inventory transfers | Done | inventory-transfers | List, create, detail pages with workflow |
| Stock valuation | Done | stock-tracking | Cost price calculation |
| Low stock alerts | Done | stock-tracking | Dashboard integration |

### Contacts Module

| Feature | Status | Spec | Notes |
|---------|--------|------|-------|
| Customers CRUD | Done | customers | List, search, filter |
| Vendors CRUD | Done | vendors | List, search, filter |
| Contact detail page | Done | customers/vendors | Full profile with transactions |
| Address book | **Spec Only** | customers | Multiple addresses per contact |
| Payment terms | **Spec Only** | customers/vendors | Link to PaymentTerm records |
| Customer balance tracking | Done | customers | Balance summary card |
| Vendor balance tracking | Done | vendors | Balance summary card |
| Price lists | Not Started | - | Customer-specific pricing |

---

## Phase 3: Transactions - PARTIAL

### Sales Module

| Feature | Status | Spec | Notes |
|---------|--------|------|-------|
| Sales orders list | Done | sales-orders | Filter, search, pagination |
| Sales order create/edit | Done | sales-orders | Full form with line items |
| Sales order detail | Done | sales-orders | Detail page with actions |
| Order status workflow | Done | sales-orders | Confirm, ship, deliver, cancel |
| Stock commitment | Done | sales-orders | Committed stock on confirm |
| Invoices list | Done | invoices | Filter, search, pagination |
| Invoice create/edit | Done | invoices | Full form with line items |
| Invoice detail | Done | invoices | Detail page with actions |
| Invoice from order | Done | sales-orders | API action works |
| Sales payments list | Done | sales-payments | List view |
| Payment recording | Done | sales-payments | Form with invoice allocation |
| Payment allocation | Done | sales-payments | Apply to invoices |
| Sales returns | **Spec Only** | sales-returns | Placeholder page only |
| Credit notes | **Spec Only** | sales-returns | Not implemented |
| Sales order PDF | **Spec Only** | sales-orders | Backend needs PDF generation |
| Invoice PDF | **Spec Only** | invoices | Backend needs PDF generation |

### Purchase Module

| Feature | Status | Spec | Notes |
|---------|--------|------|-------|
| Purchase orders list | Done | purchase-orders | Filter, search, pagination |
| PO create/edit | Done | purchase-orders | Full form with line items |
| PO detail | Done | purchase-orders | Detail page with actions |
| PO status workflow | Done | purchase-orders | Issue, receive, cancel |
| Purchase receives list | Done | purchase-receives | List view |
| Receive goods | **Backend Only** | purchase-receives | No frontend form |
| Bills list | Done | bills | Filter, search, pagination |
| Bill create/edit | Done | bills | Full form with line items |
| Bill detail | Done | bills | Detail page with actions |
| Bill from PO | Done | purchase-orders | API action works |
| Vendor payments list | Done | purchase-payments | List view |
| Vendor payment recording | Done | purchase-payments | Form with bill allocation |
| Vendor credits | **Spec Only** | - | Not implemented |
| Purchase order PDF | Not Started | - | PDF generation needed |
| Bill PDF | Not Started | - | PDF generation needed |

---

## Phase 4: Malaysian Compliance - SPEC ONLY

### SST Tax System

| Feature | Status | Spec | Notes |
|---------|--------|------|-------|
| Tax rates configuration | **Backend Only** | sst-tax | API exists |
| Tax rates UI | Not Started | sst-tax | Settings page needed |
| Tax calculation engine | **Partial** | sst-tax | Basic calculation exists |
| SST registration settings | Not Started | sst-tax | Organization settings |
| Tax reports | Not Started | sst-tax | SST-03 report format |

### MyInvois e-Invoice

| Feature | Status | Spec | Notes |
|---------|--------|------|-------|
| MyInvois settings | **Spec Only** | einvoice | API endpoint structure exists |
| e-Invoice generation | **Spec Only** | einvoice | UBL 2.1 XML format |
| e-Invoice submission | **Spec Only** | einvoice | MyInvois API integration |
| Validation handling | **Spec Only** | einvoice | Response parsing |
| QR code generation | **Spec Only** | einvoice | Post-validation |
| e-Invoice cancellation | **Spec Only** | einvoice | 72-hour window |
| Credit/Debit notes | **Spec Only** | einvoice | Adjustment documents |
| Compliance dashboard | **Spec Only** | einvoice | Submission tracking |

### Localization

| Feature | Status | Spec | Notes |
|---------|--------|------|-------|
| BM translations | Not Started | localization | i18n setup needed |
| Document templates BM | Not Started | localization | Invoice, SO, PO templates |
| Malaysian date format | **Partial** | localization | DD/MM/YYYY used |
| Malaysian number format | **Partial** | localization | Comma separators |

---

## Phase 5: Reports & Analytics - IN PROGRESS

### Dashboard

| Feature | Status | Spec | Notes |
|---------|--------|------|-------|
| KPI widgets | Done | dashboard-analytics | Month/YTD sales, receivables, payables |
| Sales charts | Done | dashboard-analytics | Sales trend, top items, top customers |
| Inventory widgets | Done | dashboard-analytics | Low stock count, pending orders |
| Pending actions | Done | dashboard-analytics | Real API alerts |
| Recent activity | Done | dashboard-analytics | Recent invoices and orders |
| Cash flow overview | Done | dashboard-analytics | Net position, receivables/payables |
| Customizable layout | Not Started | dashboard-analytics | Drag-and-drop widgets |

### Reports

| Feature | Status | Spec | Notes |
|---------|--------|------|-------|
| Reports navigation | Done | - | Card-based layout with categories |
| Sales by Customer | Done | sales-reports | Full viewer with date filters |
| Sales by Item | Done | sales-reports | Full viewer with date filters |
| Receivables Aging | Done | sales-reports | AR aging buckets |
| Inventory Summary | Done | inventory-reports | Full viewer with stock levels |
| Inventory Valuation | Done | inventory-reports | Value calculation by item |
| Stock Aging | Not Started | inventory-reports | Slow-moving items |
| Purchase by Vendor | **Backend Only** | - | No frontend view |
| Payables Aging | Done | - | AP aging buckets |
| Export to Excel | Not Started | - | xlsx generation |
| Export to PDF | Not Started | - | PDF generation |

---

## Phase 6: Advanced Features - NOT STARTED

### Advanced Inventory

| Feature | Status | Spec | Notes |
|---------|--------|------|-------|
| Batch tracking | **Spec Only** | batch-tracking | Manufacture/expiry dates |
| Serial number tracking | **Spec Only** | serial-tracking | Individual unit tracking |
| Composite items (BOM) | **Spec Only** | composite-items | Bill of materials |
| Reorder automation | **Spec Only** | reorder-automation | Auto-generate POs |
| Bin/location management | Not Started | - | Within warehouse |

### Portals

| Feature | Status | Spec | Notes |
|---------|--------|------|-------|
| Customer portal | Not Started | - | Self-service orders/invoices |
| Vendor portal | Not Started | - | PO acknowledgment |

### Integrations

| Feature | Status | Spec | Notes |
|---------|--------|------|-------|
| Payment gateway (FPX) | Not Started | - | Online payments |
| Payment gateway (DuitNow) | Not Started | - | QR payments |
| Accounting export | Not Started | - | Journal entries |
| Email notifications | Not Started | - | SMTP/transactional |

---

## Phase 7: Mobile App - NOT STARTED

| Feature | Status | Notes |
|---------|--------|-------|
| Flutter project setup | Not Started | apps/mobile scaffold |
| Authentication | Not Started | JWT token handling |
| Dashboard | Not Started | Mobile-optimized KPIs |
| Item lookup | Not Started | Search + barcode scan |
| Barcode scanning | Not Started | Camera integration |
| Stock adjustments | Not Started | Quick adjust |
| Quick sale/invoice | Not Started | Simplified flow |
| Push notifications | Not Started | Firebase/APNs |

---

## Priority Backlog (Recommended Order)

### High Priority (P0) - Core Functionality Gaps

1. ~~**Sales order create/edit form**~~ - ✓ Done (2026-02-03)
2. ~~**Invoice create/edit form**~~ - ✓ Done (2026-02-03)
3. ~~**Purchase order create/edit form**~~ - ✓ Done (2026-02-04)
4. ~~**Bill create/edit form**~~ - ✓ Done (2026-02-04)
5. ~~**Sales payment form**~~ - ✓ Done (2026-02-03)
6. ~~**Vendor payment form**~~ - ✓ Done (2026-02-04)
7. ~~**Inventory adjustments UI**~~ - ✓ Done (2026-02-04)
8. ~~**Inventory transfers UI**~~ - ✓ Done (2026-02-04)
9. ~~**Document detail pages (Sales)**~~ - ✓ Done: SO, Invoice, Payment detail views (2026-02-03)

### Medium Priority (P1) - Business Features

10. **PDF generation** - Sales order, Invoice, PO, Bill PDFs
11. ~~**Dashboard charts**~~ - ✓ Done (2026-02-04)
12. **Item images upload** - File upload UI
13. ~~**Report viewers**~~ - ✓ Done (2026-02-04)
14. **Email notifications** - Transaction confirmations
15. ~~**Contact detail pages**~~ - ✓ Done (2026-02-04)
16. **Sales returns & credit notes** - Return workflow

### Lower Priority (P2) - Compliance & Advanced

17. **SST configuration UI** - Tax settings page
18. **MyInvois integration** - e-Invoice submission
19. **Batch tracking** - Lot number management
20. **Serial tracking** - Individual unit tracking
21. **Item groups/variants** - Product variants
22. **Localization (BM)** - Translation files
23. **Reorder automation** - Auto PO generation

### Future (P3) - Enhancement

24. **Customer/Vendor portals**
25. **Payment gateway integration**
26. **Mobile app**
27. **Customizable dashboard**
28. **Advanced reporting**

---

## Technical Debt

| Item | Description | Priority |
|------|-------------|----------|
| Form validation | Consistent validation across all forms | Medium |
| Error boundaries | React error boundaries for graceful failures | Medium |
| Loading states | Skeleton screens instead of spinners | Low |
| Optimistic updates | TanStack Query mutations | Low |
| Test coverage | Unit and integration tests | Medium |
| API error messages | Consistent error response format | Medium |
| Type safety | Shared types between frontend/backend | Medium |

---

## Metrics

| Category | Specs | Done | Partial | Not Started |
|----------|-------|------|---------|-------------|
| Phase 1 (Foundation) | 11 | 11 | 0 | 0 |
| Phase 2 (Core) | 18 | 15 | 0 | 3 |
| Phase 3 (Transactions) | 24 | 19 | 0 | 5 |
| Phase 4 (Compliance) | 16 | 0 | 3 | 13 |
| Phase 5 (Reports) | 14 | 12 | 0 | 2 |
| Phase 6 (Advanced) | 9 | 0 | 0 | 9 |
| Phase 7 (Mobile) | 8 | 0 | 0 | 8 |
| **Total** | **100** | **57** | **3** | **40** |

**Overall Progress: ~57% Complete**
