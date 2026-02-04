## Context

The IMS has a working dashboard with KPI widgets but lacks visual analytics. Backend APIs exist for:
- Dashboard: `/dashboard`, `/dashboard/sales-trend`, `/dashboard/top-items`, `/dashboard/top-customers`, `/dashboard/alerts`
- Reports: `/reports/sales/*`, `/reports/inventory/*`, `/reports/purchases/*`
- Contacts: `/contacts/:id` with balance information

The frontend currently displays static mock data. This design covers adding chart components, report viewer pages, and contact detail pages.

## Goals / Non-Goals

**Goals:**
- Add interactive charts to the dashboard using existing APIs
- Create report viewer pages with filtering and pagination
- Add customer/vendor detail pages with transaction history
- Replace all static mock data with real API calls
- Maintain consistent UI patterns with existing pages

**Non-Goals:**
- PDF/Excel export from reports (separate P1 item)
- Real-time dashboard updates (WebSocket)
- Custom dashboard layout/drag-drop (P2 item per backlog)
- New backend APIs (all required APIs exist)

## Decisions

### D1: Charting Library - Ant Design Charts
**Decision**: Use `@ant-design/charts` for all chart components

**Rationale**:
- Consistent with existing Ant Design component library
- Built on G2Plot with good TypeScript support
- Simpler API than raw D3 or ECharts
- Responsive by default

**Alternatives Considered**:
- Recharts: More React-idiomatic but less visual polish
- ECharts: More powerful but heavier, overkill for our needs
- Chart.js: Good but requires more wrapper code

### D2: Dashboard Component Structure
**Decision**: Create dedicated chart components in `components/dashboard/` folder

**Rationale**:
- Separation of concerns (chart logic vs page layout)
- Reusable components for potential report pages
- Easier testing and maintenance

**Structure**:
```
components/dashboard/
├── SalesTrendChart.tsx
├── TopItemsChart.tsx
├── TopCustomersChart.tsx
├── PendingActionsCard.tsx
├── RecentActivityCard.tsx
└── index.ts
```

### D3: Report Pages Pattern
**Decision**: Create individual report pages under `/reports/[report-type]` with shared components

**Rationale**:
- Clear URL structure matching report types
- Shared filter bar and table components
- Each report can have custom columns

**Structure**:
```
app/(dashboard)/reports/
├── page.tsx                    # Report index (existing)
├── sales-by-customer/page.tsx
├── sales-by-item/page.tsx
├── inventory-summary/page.tsx
├── inventory-valuation/page.tsx
├── receivables-aging/page.tsx
└── payables-aging/page.tsx
```

### D4: Contact Detail Pages
**Decision**: Add detail pages at `/contacts/customers/[id]` and `/contacts/vendors/[id]`

**Rationale**:
- Consistent with existing URL patterns (items, warehouses have `[id]` pages)
- Shared contact detail component with type-specific sections

**Structure**:
- Header: Contact info, balance summary, action buttons
- Tabs: Overview, Transactions, Addresses, Notes
- Transaction history with filtering

### D5: Data Fetching Hooks
**Decision**: Create new hooks in existing hook files

**Rationale**:
- `use-dashboard.ts`: New file for dashboard-specific queries
- Add to `use-contacts.ts`: Contact detail and transaction hooks
- Add to existing `use-reports.ts` or create if not exists

## Risks / Trade-offs

### R1: Chart Library Bundle Size
**Risk**: @ant-design/charts may increase bundle size significantly
**Mitigation**: Use dynamic imports (`next/dynamic`) for chart components to enable code splitting

### R2: API Response Latency
**Risk**: Multiple dashboard API calls on page load may feel slow
**Mitigation**: Use TanStack Query's parallel queries and show skeleton loaders

### R3: Date Range Picker UX
**Risk**: Users may not understand default date ranges for reports
**Mitigation**: Show clear defaults (last 30 days) and preset options (7d, 30d, 90d, YTD)

## Migration Plan

1. Install `@ant-design/charts` dependency
2. Create dashboard chart components
3. Update dashboard page to use real APIs
4. Create report viewer pages one by one
5. Add contact detail pages
6. Update navigation links

No database migrations needed. No breaking changes to existing pages.
