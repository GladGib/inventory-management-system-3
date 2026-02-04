# Dashboard Charts

## Overview
Interactive chart components for the dashboard showing sales trends, top items, and top customers. Uses existing backend APIs and displays real-time business analytics.

## Requirements

### DC-001: Sales Trend Chart
- **Priority**: P0
- **Description**: Line chart showing sales over time
- **Acceptance Criteria**:
  - Display monthly sales data as line chart
  - Default to last 12 months
  - Show sales amount on Y-axis, months on X-axis
  - Tooltip on hover showing exact values
  - Period selector: 6 months, 12 months, 24 months
  - Loading skeleton while fetching
  - Empty state if no data

### DC-002: Top Items Chart
- **Priority**: P0
- **Description**: Bar chart showing best-selling items
- **Acceptance Criteria**:
  - Horizontal bar chart showing top 10 items
  - Display item name and total quantity sold
  - Click item to navigate to item detail
  - Period selector matching sales trend
  - Loading skeleton while fetching
  - Empty state if no data

### DC-003: Top Customers Chart
- **Priority**: P0
- **Description**: Bar chart showing top customers by revenue
- **Acceptance Criteria**:
  - Horizontal bar chart showing top 10 customers
  - Display customer name and total sales amount
  - Click customer to navigate to customer detail
  - Period selector matching sales trend
  - Loading skeleton while fetching
  - Empty state if no data

### DC-004: Pending Actions Widget
- **Priority**: P0
- **Description**: Real pending actions from API (replace mock data)
- **Acceptance Criteria**:
  - Fetch from `/dashboard/alerts` API
  - Show priority-based color coding (high=red, medium=yellow)
  - Group by action type
  - Click to navigate to relevant page
  - Badge count in header showing total

### DC-005: Recent Activity Widget
- **Priority**: P0
- **Description**: Real activity feed from API (replace mock data)
- **Acceptance Criteria**:
  - Fetch from dashboard API or activity endpoint
  - Show timestamp, user, action description
  - Infinite scroll or "Load more" pagination
  - Filter by activity type
  - Link to related entity

## Components

```
components/dashboard/
├── SalesTrendChart.tsx      # DC-001
├── TopItemsChart.tsx        # DC-002
├── TopCustomersChart.tsx    # DC-003
├── PendingActionsCard.tsx   # DC-004
├── RecentActivityCard.tsx   # DC-005
├── ChartPeriodSelector.tsx  # Shared period picker
└── index.ts
```

## API Integration

Uses existing endpoints:
- `GET /dashboard` - Overview KPIs
- `GET /dashboard/sales-trend?months=12` - Sales trend data
- `GET /dashboard/top-items?limit=10` - Top selling items
- `GET /dashboard/top-customers?limit=10` - Top customers
- `GET /dashboard/alerts` - Pending actions

## Hooks

```typescript
// hooks/use-dashboard.ts
export function useDashboardOverview();
export function useSalesTrend(months: number);
export function useTopItems(limit: number);
export function useTopCustomers(limit: number);
export function useDashboardAlerts();
```
