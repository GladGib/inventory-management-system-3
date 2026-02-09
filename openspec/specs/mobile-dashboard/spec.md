# Mobile Dashboard Specification

> **Implementation Note (2026-02-10):** The actual implementation uses **React Native with Expo** instead of Flutter. The behavioral requirements below remain valid; Dart/Flutter code examples should be mapped to TypeScript/React Native equivalents.

## Purpose
Provide a mobile-optimized dashboard with KPI cards, quick action shortcuts, sales charts, and alert summaries. The dashboard reuses the existing backend API endpoints (`GET /dashboard`, `GET /dashboard/sales-trend`, `GET /dashboard/top-items`, `GET /dashboard/alerts`) and adapts the data presentation for a single-column mobile viewport.

## Requirements

### Requirement: Dashboard screen layout
The mobile dashboard SHALL be a vertically scrollable screen optimized for single-column mobile viewports.

#### Scenario: Screen structure
- **WHEN** the user navigates to the dashboard (root route `/`)
- **THEN** the screen SHALL display sections in this order from top to bottom:
  1. App bar with organization name, notification bell icon (with unread badge), and user avatar
  2. KPI cards section (horizontal scroll)
  3. Quick Actions grid (2x2)
  4. Sales trend chart (last 7 days)
  5. Top 5 items this week (horizontal bar chart)
  6. Alerts section (low stock, pending approvals, overdue invoices)

#### Scenario: Pull-to-refresh
- **WHEN** the user pulls down from the top of the dashboard
- **THEN** all dashboard data SHALL be refetched from the backend
- **AND** a refresh indicator SHALL be displayed during the fetch

#### Scenario: Skeleton loading states
- **WHEN** dashboard data is loading for the first time
- **THEN** each section SHALL display a skeleton placeholder matching the shape of the expected content:
  - KPI cards: 4 horizontal skeleton rectangles
  - Quick actions: 2x2 grid of skeleton squares
  - Charts: skeleton rectangle with chart-like pattern
  - Alerts: 3 skeleton list items

#### Scenario: Error state
- **WHEN** the dashboard API request fails
- **THEN** the screen SHALL display an error message with a "Retry" button
- **AND** previously cached data (if any) SHALL remain visible with a stale-data indicator

### Requirement: KPI cards section
The dashboard SHALL display key performance indicators as horizontally scrollable cards at the top.

#### Scenario: KPI card list
- **WHEN** dashboard data is loaded
- **THEN** the KPI section SHALL display the following cards in a horizontal `ListView`:
  1. **Today's Sales** - `sales.today` formatted as RM currency
  2. **Month Sales** - `sales.thisMonth` formatted as RM currency
  3. **Outstanding Receivables** - `receivables.total` formatted as RM currency
  4. **Outstanding Payables** - `payables.total` formatted as RM currency

#### Scenario: KPI card design
- **WHEN** a KPI card is rendered
- **THEN** it SHALL display:
  - Title text (e.g., "Today's Sales") in small uppercase
  - Value in large bold text with RM currency formatting
  - Change indicator: up/down arrow icon with percentage change compared to previous period
  - Change text colored green for positive, red for negative, gray for zero

#### Scenario: KPI card dimensions
- **WHEN** KPI cards are laid out
- **THEN** each card SHALL have a fixed width of approximately 160dp
- **AND** height of approximately 100dp
- **AND** horizontal spacing of 12dp between cards
- **AND** the list SHALL have 16dp horizontal padding

#### Scenario: KPI card tap
- **WHEN** the user taps a KPI card
- **THEN** the app SHALL navigate to the corresponding detail screen:
  - Today's Sales / Month Sales -> Sales list filtered by period
  - Outstanding Receivables -> Invoices list filtered by unpaid/overdue
  - Outstanding Payables -> Bills list filtered by unpaid/overdue

### Requirement: Quick Actions grid
The dashboard SHALL display a 2x2 grid of quick action buttons for common operations.

#### Scenario: Quick action buttons
- **WHEN** the quick actions grid is rendered
- **THEN** it SHALL display 4 buttons in a 2-column grid:
  1. **New Sale** - icon: shopping cart, navigates to `/sales/new`
  2. **Scan Barcode** - icon: barcode/QR scanner, navigates to `/scan`
  3. **Stock Adjust** - icon: package/inventory, navigates to `/inventory/adjust`
  4. **New PO** - icon: clipboard/purchase, navigates to `/purchases/new` (or shows "Coming soon" if not yet implemented)

#### Scenario: Quick action button design
- **WHEN** a quick action button is rendered
- **THEN** it SHALL display:
  - A circular or rounded-square icon container with a light background tint of the primary color
  - An SVG or icon below/inside the container
  - A label text below the icon
  - Tap ripple effect on press

#### Scenario: Quick action button sizing
- **WHEN** the grid is laid out
- **THEN** each button cell SHALL be square, occupying half the screen width minus padding
- **AND** the grid SHALL have 12dp spacing between cells and 16dp horizontal padding

### Requirement: Sales trend chart
The dashboard SHALL display a line chart showing the sales trend for the last 7 days.

#### Scenario: Chart data source
- **WHEN** the chart section loads
- **THEN** the app SHALL call `GET /dashboard/sales-trend?months=1` (or adapt the backend endpoint to support daily granularity)
- **AND** extract the last 7 days of data

#### Scenario: Chart rendering
- **WHEN** chart data is available
- **THEN** the app SHALL render a line chart using the `fl_chart` package
- **AND** the X-axis SHALL show day labels (e.g., "Mon", "Tue", or "1 Feb", "2 Feb")
- **AND** the Y-axis SHALL show sale amounts in abbreviated RM format (e.g., "RM 1.2k")
- **AND** the line SHALL be the primary color `#1890ff` with a gradient fill below

#### Scenario: Chart section header
- **WHEN** the chart section is rendered
- **THEN** it SHALL have a section header "Sales Trend" with a subtitle "Last 7 days"
- **AND** the header SHALL be left-aligned

#### Scenario: Chart interactivity
- **WHEN** the user touches a data point on the chart
- **THEN** a tooltip SHALL appear showing the exact date and amount (e.g., "5 Feb 2026: RM 3,450.00")

#### Scenario: Empty chart state
- **WHEN** there is no sales data for the past 7 days
- **THEN** the chart area SHALL display a flat line at zero with a message "No sales data for this period"

### Requirement: Top items chart
The dashboard SHALL display a horizontal bar chart of the top 5 selling items this week.

#### Scenario: Top items data source
- **WHEN** the top items section loads
- **THEN** the app SHALL call `GET /dashboard/top-items?limit=5`

#### Scenario: Horizontal bar chart rendering
- **WHEN** top items data is available
- **THEN** the app SHALL render a horizontal bar chart using `fl_chart`
- **AND** each bar SHALL represent one item with its total sales amount
- **AND** bars SHALL be ordered from highest to lowest (top to bottom)
- **AND** each bar SHALL show the item name (truncated if necessary) and the sales amount

#### Scenario: Bar colors
- **WHEN** the bars are rendered
- **THEN** the first bar SHALL use the primary color `#1890ff`
- **AND** subsequent bars SHALL use progressively lighter tints

#### Scenario: Top items tap
- **WHEN** the user taps a bar in the chart
- **THEN** the app SHALL navigate to the item detail screen (`/items/:id`)

#### Scenario: Empty top items
- **WHEN** there are no sales data to determine top items
- **THEN** the section SHALL display an empty state: "No sales data this week"

### Requirement: Alerts section
The dashboard SHALL display a summary of actionable alerts requiring user attention.

#### Scenario: Alert categories
- **WHEN** alert data is loaded from `GET /dashboard/alerts`
- **THEN** the section SHALL display:
  1. **Low Stock Alerts** - count and list of items below reorder level
  2. **Pending Approvals** - count of items awaiting approval
  3. **Overdue Invoices** - count and total amount of overdue invoices

#### Scenario: Alert list item design
- **WHEN** an alert category is rendered
- **THEN** it SHALL display:
  - An icon (warning triangle for low stock, clock for pending, exclamation for overdue)
  - Alert category title
  - Count badge (e.g., "5 items")
  - Right chevron indicating tappable

#### Scenario: Alert icon colors
- **WHEN** alert items are rendered
- **THEN** icons SHALL use semantic colors:
  - Low stock: Warning color `#faad14`
  - Pending approvals: Info color `#1890ff`
  - Overdue invoices: Error color `#ff4d4f`

#### Scenario: Low stock alert tap
- **WHEN** the user taps the Low Stock Alerts row
- **THEN** the app SHALL navigate to the items list pre-filtered by stock status "low"

#### Scenario: Overdue invoices alert tap
- **WHEN** the user taps the Overdue Invoices row
- **THEN** the app SHALL navigate to the invoices list filtered by status "OVERDUE"

#### Scenario: Pending approvals tap
- **WHEN** the user taps the Pending Approvals row
- **THEN** the app SHALL navigate to the relevant approvals list (sales orders or POs)

#### Scenario: No alerts
- **WHEN** all alert counts are zero
- **THEN** the section SHALL display a success message: "All clear! No alerts." with a green checkmark icon

### Requirement: Dashboard data caching
The dashboard SHALL cache the most recent data locally for a fast initial render.

#### Scenario: First load caching
- **WHEN** dashboard data is successfully fetched
- **THEN** the app SHALL cache the response in a Hive box `dashboard_cache`

#### Scenario: Cached data on launch
- **WHEN** the dashboard screen mounts
- **THEN** the app SHALL immediately render from the Hive cache (if available)
- **AND** simultaneously fetch fresh data from the API
- **AND** update the UI when fresh data arrives

#### Scenario: Cache staleness indicator
- **WHEN** the displayed data is from cache and the API fetch is still in progress
- **THEN** the app SHALL show a subtle "Updating..." indicator in the app bar

## API Endpoints Used

```
GET  /dashboard                  - Dashboard overview (KPIs, summary data)
GET  /dashboard/sales-trend      - Sales trend chart data
GET  /dashboard/top-items        - Top selling items
GET  /dashboard/top-customers    - Top customers (reserved for future use)
GET  /dashboard/alerts           - Low stock alerts, pending actions, overdue items
```

## Data Models

```dart
// features/dashboard/domain/models/dashboard_data.dart

@freezed
class DashboardOverview with _$DashboardOverview {
  const factory DashboardOverview({
    required SalesKPI sales,
    required PurchasesKPI purchases,
    required ReceivablesKPI receivables,
    required PayablesKPI payables,
    required InventoryKPI inventory,
    required OrdersKPI orders,
  }) = _DashboardOverview;
}

@freezed
class SalesKPI with _$SalesKPI {
  const factory SalesKPI({
    required double today,
    required double thisMonth,
    required double previousMonth,
    required double changePercent,
  }) = _SalesKPI;
}

@freezed
class DashboardAlert with _$DashboardAlert {
  const factory DashboardAlert({
    required String id,
    required String type,        // 'LOW_STOCK', 'OVERDUE_INVOICE', 'PENDING_APPROVAL'
    required String title,
    required String description,
    required String priority,    // 'HIGH', 'MEDIUM', 'LOW'
    required String actionUrl,
    required DateTime createdAt,
  }) = _DashboardAlert;
}

@freezed
class SalesTrendPoint with _$SalesTrendPoint {
  const factory SalesTrendPoint({
    required DateTime date,
    required double amount,
  }) = _SalesTrendPoint;
}

@freezed
class TopItem with _$TopItem {
  const factory TopItem({
    required String itemId,
    required String itemName,
    required String sku,
    required double totalSales,
    required int quantitySold,
  }) = _TopItem;
}
```

## Widget Specifications

### KPI Card Widget
- Width: 160dp fixed
- Height: 100dp
- Background: White with elevation 1
- Border radius: 6dp
- Padding: 12dp
- Title: 10sp, uppercase, gray-500
- Value: 20sp, bold, gray-900
- Change: 12sp, colored (green/red/gray), with arrow icon

### Quick Action Button Widget
- Size: fills half of available width minus padding
- Aspect ratio: ~1.0 (square)
- Icon size: 28dp
- Icon container: 48x48dp with 8dp border radius, tinted background
- Label: 12sp, gray-700, centered below icon
- Background: white with elevation 0.5

### Section Header Widget
- Title: 16sp, semibold, gray-900
- Subtitle: 12sp, regular, gray-500
- Bottom margin: 12dp
