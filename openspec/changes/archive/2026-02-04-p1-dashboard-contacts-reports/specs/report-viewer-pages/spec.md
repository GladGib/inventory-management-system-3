# Report Viewer Pages

## Overview
Frontend pages for viewing business reports with filtering, sorting, and pagination. Uses existing reports API endpoints.

## Requirements

### RV-001: Report Index Page
- **Priority**: P0
- **Description**: Update existing `/reports` page
- **Acceptance Criteria**:
  - Card-based layout for report categories
  - Categories: Sales, Inventory, Purchases
  - Each card links to specific report
  - Brief description of each report
  - Icon for visual recognition

### RV-002: Sales by Customer Report
- **Priority**: P0
- **Description**: Report at `/reports/sales-by-customer`
- **Acceptance Criteria**:
  - Date range picker (required)
  - Preset ranges: Last 7 days, 30 days, 90 days, This year
  - Table columns: Customer, Orders, Invoices, Total Sales, % of Total
  - Sortable columns
  - Click customer to view detail
  - Pagination
  - Summary row showing totals

### RV-003: Sales by Item Report
- **Priority**: P0
- **Description**: Report at `/reports/sales-by-item`
- **Acceptance Criteria**:
  - Date range picker (required)
  - Table columns: Item, SKU, Qty Sold, Total Sales, Avg Price
  - Sortable columns
  - Click item to view detail
  - Pagination
  - Summary row showing totals

### RV-004: Receivables Aging Report
- **Priority**: P0
- **Description**: Report at `/reports/receivables-aging`
- **Acceptance Criteria**:
  - As-of date selector (default: today)
  - Table columns: Customer, Current, 1-30 days, 31-60 days, 61-90 days, 90+ days, Total
  - Color coding for overdue buckets
  - Click customer to view detail
  - Summary row showing totals
  - Total outstanding prominently displayed

### RV-005: Inventory Summary Report
- **Priority**: P0
- **Description**: Report at `/reports/inventory-summary`
- **Acceptance Criteria**:
  - Warehouse filter (optional, default: all)
  - Table columns: Item, SKU, On Hand, Committed, Available, Reorder Level, Value
  - Low stock indicator
  - Sortable columns
  - Pagination
  - Summary showing total value

### RV-006: Inventory Valuation Report
- **Priority**: P0
- **Description**: Report at `/reports/inventory-valuation`
- **Acceptance Criteria**:
  - Warehouse filter (optional)
  - Table columns: Item, SKU, Qty, Cost Price, Total Value
  - Sortable columns
  - Pagination
  - Summary showing total inventory value

### RV-007: Payables Aging Report
- **Priority**: P0
- **Description**: Report at `/reports/payables-aging`
- **Acceptance Criteria**:
  - As-of date selector (default: today)
  - Table columns: Vendor, Current, 1-30 days, 31-60 days, 61-90 days, 90+ days, Total
  - Color coding for overdue buckets
  - Click vendor to view detail
  - Summary row showing totals

## Page Structure

```
app/(dashboard)/reports/
├── page.tsx                      # Report index (update)
├── sales-by-customer/page.tsx    # RV-002
├── sales-by-item/page.tsx        # RV-003
├── receivables-aging/page.tsx    # RV-004
├── inventory-summary/page.tsx    # RV-005
├── inventory-valuation/page.tsx  # RV-006
└── payables-aging/page.tsx       # RV-007
```

## Shared Components

```
components/reports/
├── ReportFilterBar.tsx      # Date range, filters
├── ReportTable.tsx          # Reusable table with sorting
├── ReportSummary.tsx        # Summary/totals row
├── DateRangePresets.tsx     # Quick date range selection
└── index.ts
```

## API Integration

Uses existing endpoints:
- `GET /reports/sales/by-customer?fromDate=X&toDate=Y`
- `GET /reports/sales/by-item?fromDate=X&toDate=Y`
- `GET /reports/sales/receivables-aging`
- `GET /reports/inventory/summary`
- `GET /reports/inventory/valuation?warehouseId=X`
- `GET /reports/purchases/payables-aging`

## Hooks

```typescript
// hooks/use-reports.ts
export function useSalesByCustomer(dateRange: DateRange);
export function useSalesByItem(dateRange: DateRange);
export function useReceivablesAging();
export function useInventorySummary();
export function useInventoryValuation(warehouseId?: string);
export function usePayablesAging();
```
