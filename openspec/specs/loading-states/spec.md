# Loading States (Skeleton Screens) Specification

## Purpose
Replace all Spin/spinner loading indicators across the application with Ant Design Skeleton components to provide meaningful content previews during data loading, reducing perceived load times and improving user experience.

## Architecture

### Target Directory
- Skeleton components: `apps/web/src/components/skeletons/`
- Integration: All pages and components that consume TanStack Query hooks with `isLoading` state

### Dependencies
- `antd` Skeleton, Skeleton.Button, Skeleton.Input, Skeleton.Avatar, Skeleton.Image (already installed)
- No new packages required

---

## Requirements

### Requirement: TableSkeleton component
The system SHALL provide a reusable `TableSkeleton` component that mimics a data table layout during loading.

#### Scenario: Default table skeleton
- **GIVEN** a page that displays tabular data (items list, sales orders, invoices, purchase orders, bills, contacts, inventory stock levels, transfers, adjustments)
- **WHEN** the TanStack Query hook returns `isLoading: true`
- **THEN** the component SHALL render a skeleton with:
  - 1 header row using `Skeleton.Button` elements styled as column headers (default 5 columns)
  - N data rows (default 5, configurable via `rows` prop) using alternating `Skeleton.Input` and `Skeleton.Button` widths
  - Each row SHALL have matching column count to the real table
  - The `active` prop SHALL be `true` to show shimmer animation

#### Scenario: Configurable columns
- **GIVEN** a table with a specific number of columns
- **WHEN** `TableSkeleton` is rendered with `columns` prop (number or array of `{ width: string }`)
- **THEN** the skeleton SHALL render the matching number of columns with proportional widths

#### Scenario: Action column skeleton
- **GIVEN** a table that includes an action column with buttons
- **WHEN** `TableSkeleton` is rendered with `showActions` prop set to `true`
- **THEN** the last column SHALL render small `Skeleton.Button` elements representing action buttons

### Requirement: FormSkeleton component
The system SHALL provide a reusable `FormSkeleton` component that mimics a form layout during loading.

#### Scenario: Default form skeleton
- **GIVEN** a page that displays a create/edit form (item form, contact form, sales order form, purchase order form, invoice form)
- **WHEN** form data is loading (e.g., editing an existing record where `useItem(id)` returns `isLoading: true`)
- **THEN** the component SHALL render:
  - N field groups (default 6, configurable via `fields` prop)
  - Each field group SHALL contain a `Skeleton.Input` (size `small`, style `width: 120px`) for the label and a `Skeleton.Input` (style `width: 100%`) for the input
  - Fields SHALL be arranged in a grid matching the form layout (configurable `columns` prop, default 2)

#### Scenario: Form with sections
- **WHEN** `FormSkeleton` is rendered with `sections` prop (array of `{ title: boolean; fields: number }`)
- **THEN** the skeleton SHALL render each section with an optional `Skeleton.Input` title bar and the specified number of field skeletons

#### Scenario: Form with line items
- **WHEN** `FormSkeleton` is rendered with `hasLineItems` prop set to `true`
- **THEN** the skeleton SHALL include a table-like skeleton area below the form fields representing the line items table (header + 3 rows)

### Requirement: DetailPageSkeleton component
The system SHALL provide a reusable `DetailPageSkeleton` component that mimics a detail/view page layout.

#### Scenario: Default detail page skeleton
- **GIVEN** a detail page (item detail, sales order detail, invoice detail, PO detail, bill detail, contact detail)
- **WHEN** `useItem(id)` or equivalent detail query returns `isLoading: true`
- **THEN** the component SHALL render:
  - A header section with `Skeleton.Input` for title (width 300px), `Skeleton.Button` elements for status badge and action buttons
  - A tab bar skeleton using `Skeleton.Button` elements (default 3 tabs)
  - A content area with mixed `Skeleton.Input` and `Skeleton` paragraph blocks

#### Scenario: Detail page with info grid
- **WHEN** `DetailPageSkeleton` is rendered with `infoGrid` prop (number of key-value pairs, default 8)
- **THEN** the content area SHALL include a 2-column grid of label-value skeleton pairs before the tab content

#### Scenario: Detail page with line items
- **WHEN** `DetailPageSkeleton` is rendered with `hasLineItems` prop set to `true`
- **THEN** the content area SHALL include a `TableSkeleton` with 5 columns and 4 rows after the info grid

### Requirement: CardSkeleton component
The system SHALL provide a reusable `CardSkeleton` component that mimics stat/KPI cards.

#### Scenario: Default KPI card skeleton
- **GIVEN** the dashboard page where `useDashboardOverview()` returns `isLoading: true`
- **WHEN** `CardSkeleton` is rendered
- **THEN** it SHALL render an Ant Design `Card` containing:
  - `Skeleton.Input` (size `small`, width `60%`) for the card title/label
  - `Skeleton.Input` (size `large`, width `80%`) for the primary value
  - `Skeleton.Input` (size `small`, width `40%`) for the subtitle/trend indicator

#### Scenario: Grid of card skeletons
- **WHEN** `CardSkeleton` is rendered with `count` prop (default 4)
- **THEN** it SHALL render N card skeletons in a responsive grid (`Row`/`Col` with `xs={24} sm={12} lg={6}`)

### Requirement: ListSkeleton component
The system SHALL provide a reusable `ListSkeleton` component that mimics list items.

#### Scenario: Default list skeleton
- **GIVEN** a page rendering list items (alerts list, activity feed, low stock items)
- **WHEN** the data is loading
- **THEN** the component SHALL render N items (default 5, configurable via `count` prop) each with:
  - Optional `Skeleton.Avatar` (controlled by `showAvatar` prop)
  - `Skeleton` component with `title` and `paragraph={{ rows: 1 }}` for the item content
  - The `active` prop SHALL be `true`

#### Scenario: List skeleton with actions
- **WHEN** `ListSkeleton` is rendered with `showActions` prop set to `true`
- **THEN** each list item SHALL include a `Skeleton.Button` on the right side representing an action

### Requirement: ChartSkeleton component
The system SHALL provide a reusable `ChartSkeleton` component that mimics chart/graph areas.

#### Scenario: Default chart skeleton
- **GIVEN** the dashboard page where `useSalesTrend()` or `useTopItems()` returns `isLoading: true`
- **WHEN** `ChartSkeleton` is rendered
- **THEN** it SHALL render:
  - A `Skeleton.Input` (size `small`, width `200px`) for the chart title
  - A rectangular area (default `height: 300px`, configurable) containing a `Skeleton` with `paragraph={{ rows: 8 }}` styled to fill the area
  - The `active` prop SHALL be `true`

#### Scenario: Configurable chart height
- **WHEN** `ChartSkeleton` is rendered with `height` prop
- **THEN** the skeleton content area SHALL use the specified height

### Requirement: PageSkeleton wrapper
The system SHALL provide a `PageSkeleton` component that auto-selects the appropriate skeleton type based on the page layout.

#### Scenario: Auto-selection by layout type
- **WHEN** `PageSkeleton` is rendered with `layout` prop
- **THEN** it SHALL render the corresponding skeleton:
  - `layout="table"` renders `TableSkeleton`
  - `layout="form"` renders `FormSkeleton`
  - `layout="detail"` renders `DetailPageSkeleton`
  - `layout="dashboard"` renders a composition of `CardSkeleton` (count 4) + `ChartSkeleton` (2 side by side) + `ListSkeleton`
  - `layout="list"` renders `ListSkeleton`

#### Scenario: Pass-through props
- **WHEN** additional props are passed to `PageSkeleton`
- **THEN** those props SHALL be forwarded to the underlying skeleton component

### Requirement: Apply skeletons to all pages consuming TanStack Query hooks
The system SHALL replace all existing `Spin` / spinner loading indicators with the appropriate skeleton components.

#### Scenario: Items list page
- **GIVEN** the items list page at `apps/web/src/app/(dashboard)/items/page.tsx`
- **WHEN** `useItems()` returns `isLoading: true`
- **THEN** the page SHALL render `TableSkeleton` with columns matching the items table (SKU, Name, Type, Stock, Price, Status, Actions)

#### Scenario: Item detail page
- **GIVEN** the item detail page at `apps/web/src/app/(dashboard)/items/[id]/page.tsx`
- **WHEN** `useItem(id)` returns `isLoading: true`
- **THEN** the page SHALL render `DetailPageSkeleton` with `infoGrid={10}` and `hasLineItems={false}`

#### Scenario: Sales orders list page
- **GIVEN** the sales orders list page
- **WHEN** `useSalesOrders()` returns `isLoading: true`
- **THEN** the page SHALL render `TableSkeleton` with columns matching (Order #, Customer, Date, Status, Total, Actions)

#### Scenario: Sales order detail page
- **GIVEN** the sales order detail page
- **WHEN** `useSalesOrder(id)` returns `isLoading: true`
- **THEN** the page SHALL render `DetailPageSkeleton` with `hasLineItems={true}` and `infoGrid={8}`

#### Scenario: Invoices list page
- **WHEN** `useInvoices()` returns `isLoading: true`
- **THEN** the page SHALL render `TableSkeleton` with columns matching (Invoice #, Customer, Date, Due Date, Status, Balance, Total, Actions)

#### Scenario: Invoice detail page
- **WHEN** `useInvoice(id)` returns `isLoading: true`
- **THEN** the page SHALL render `DetailPageSkeleton` with `hasLineItems={true}`

#### Scenario: Purchase orders list page
- **WHEN** `usePurchaseOrders()` returns `isLoading: true`
- **THEN** the page SHALL render `TableSkeleton` with columns matching (PO #, Vendor, Date, Status, Total, Actions)

#### Scenario: Purchase order detail page
- **WHEN** `usePurchaseOrder(id)` returns `isLoading: true`
- **THEN** the page SHALL render `DetailPageSkeleton` with `hasLineItems={true}`

#### Scenario: Bills list page
- **WHEN** `useBills()` returns `isLoading: true`
- **THEN** the page SHALL render `TableSkeleton` with matching columns

#### Scenario: Contacts list page
- **WHEN** `useContacts()` returns `isLoading: true`
- **THEN** the page SHALL render `TableSkeleton` with columns matching (Name, Type, Email, Phone, Balance, Status, Actions)

#### Scenario: Contact detail page
- **WHEN** `useContact(id)` returns `isLoading: true`
- **THEN** the page SHALL render `DetailPageSkeleton` with `infoGrid={12}` and tabs skeleton (3 tabs)

#### Scenario: Inventory stock levels page
- **WHEN** `useStockLevels()` returns `isLoading: true`
- **THEN** the page SHALL render `TableSkeleton` with columns matching (SKU, Item, Warehouse, On Hand, Committed, Available)

#### Scenario: Inventory transfers list
- **WHEN** `useTransfers()` returns `isLoading: true`
- **THEN** the page SHALL render `TableSkeleton` with matching columns

#### Scenario: Inventory adjustments list
- **WHEN** `useAdjustments()` returns `isLoading: true`
- **THEN** the page SHALL render `TableSkeleton` with matching columns

#### Scenario: Dashboard page
- **GIVEN** the dashboard page
- **WHEN** any combination of `useDashboardOverview()`, `useSalesTrend()`, `useTopItems()`, `useTopCustomers()`, or `useDashboardAlerts()` returns `isLoading: true`
- **THEN** each widget SHALL independently show its own skeleton:
  - Overview KPI cards: `CardSkeleton` with `count={4}`
  - Sales trend chart: `ChartSkeleton` with `height={350}`
  - Top items chart: `ChartSkeleton` with `height={300}`
  - Top customers chart: `ChartSkeleton` with `height={300}`
  - Alerts panel: `ListSkeleton` with `count={5}`
- **AND** widgets that have already loaded SHALL display their real data while others show skeletons

#### Scenario: Reports page
- **WHEN** report data is loading
- **THEN** the reports page SHALL render a combination of `ChartSkeleton` and `TableSkeleton` matching the report layout

### Requirement: Skeleton animation consistency
The system SHALL maintain consistent skeleton animation behavior across all components.

#### Scenario: Active animation
- **WHEN** any skeleton component is rendered
- **THEN** the `active` prop SHALL be set to `true` on all Ant Design Skeleton sub-components to show the shimmer/pulse animation

#### Scenario: No layout shift on load completion
- **WHEN** data finishes loading and the skeleton is replaced with real content
- **THEN** the skeleton dimensions SHALL closely match the real content dimensions to prevent visible layout shift
- **AND** skeleton row heights SHALL match the real table row height (approximately 54px for standard Ant Design table rows)

---

## File Manifest

| File Path | Purpose |
|-----------|---------|
| `apps/web/src/components/skeletons/TableSkeleton.tsx` | Reusable table skeleton component |
| `apps/web/src/components/skeletons/FormSkeleton.tsx` | Reusable form skeleton component |
| `apps/web/src/components/skeletons/DetailPageSkeleton.tsx` | Reusable detail page skeleton component |
| `apps/web/src/components/skeletons/CardSkeleton.tsx` | Reusable KPI/stat card skeleton component |
| `apps/web/src/components/skeletons/ListSkeleton.tsx` | Reusable list skeleton component |
| `apps/web/src/components/skeletons/ChartSkeleton.tsx` | Reusable chart area skeleton component |
| `apps/web/src/components/skeletons/PageSkeleton.tsx` | Wrapper that auto-selects skeleton by layout type |
| `apps/web/src/components/skeletons/index.ts` | Barrel export for all skeleton components |

### Modified Files

| File Path | Change Description |
|-----------|-------------------|
| `apps/web/src/app/(dashboard)/items/page.tsx` | Replace Spin with TableSkeleton |
| `apps/web/src/app/(dashboard)/items/[id]/page.tsx` | Replace Spin with DetailPageSkeleton |
| `apps/web/src/app/(dashboard)/sales/orders/page.tsx` | Replace Spin with TableSkeleton |
| `apps/web/src/app/(dashboard)/sales/orders/[id]/page.tsx` | Replace Spin with DetailPageSkeleton |
| `apps/web/src/app/(dashboard)/sales/invoices/page.tsx` | Replace Spin with TableSkeleton |
| `apps/web/src/app/(dashboard)/sales/invoices/[id]/page.tsx` | Replace Spin with DetailPageSkeleton |
| `apps/web/src/app/(dashboard)/purchases/orders/page.tsx` | Replace Spin with TableSkeleton |
| `apps/web/src/app/(dashboard)/purchases/orders/[id]/page.tsx` | Replace Spin with DetailPageSkeleton |
| `apps/web/src/app/(dashboard)/purchases/bills/page.tsx` | Replace Spin with TableSkeleton |
| `apps/web/src/app/(dashboard)/contacts/page.tsx` | Replace Spin with TableSkeleton |
| `apps/web/src/app/(dashboard)/contacts/[id]/page.tsx` | Replace Spin with DetailPageSkeleton |
| `apps/web/src/app/(dashboard)/inventory/page.tsx` | Replace Spin with TableSkeleton |
| `apps/web/src/app/(dashboard)/inventory/transfers/page.tsx` | Replace Spin with TableSkeleton |
| `apps/web/src/app/(dashboard)/inventory/adjustments/page.tsx` | Replace Spin with TableSkeleton |
| `apps/web/src/app/(dashboard)/dashboard/page.tsx` | Replace Spin in each widget with individual skeletons |
| `apps/web/src/app/(dashboard)/reports/*/page.tsx` | Replace Spin with appropriate skeletons |
| `apps/web/src/components/dashboard/*.tsx` | Replace Spin in dashboard widget components |

---

## Implementation Notes

1. **Ant Design Skeleton API**: Use `Skeleton`, `Skeleton.Button`, `Skeleton.Input`, `Skeleton.Avatar`, and `Skeleton.Image` from `antd`. All support `active`, `size`, and `shape` props.
2. **No new dependencies**: All skeleton components come from the existing `antd` package.
3. **TypeScript**: All skeleton components SHALL be typed with explicit prop interfaces exported alongside the component.
4. **Responsive**: Skeleton layouts SHALL use Ant Design `Row`/`Col` grid to remain responsive at all breakpoints.
5. **Per-widget independence**: On the dashboard, each widget manages its own loading state independently from other widgets, allowing partial rendering of real data alongside skeletons.
