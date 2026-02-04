# Stock Aging Report

## Overview
Report showing inventory age analysis to identify slow-moving and obsolete stock.

## Requirements

### SA-001: Stock Aging Report Page
- **Priority**: P1
- **Description**: Report viewer for stock aging analysis
- **Acceptance Criteria**:
  - Warehouse filter (all or specific)
  - Category filter
  - Age bucket configuration
  - Summary statistics
  - Detailed item table
  - Aging distribution chart

### SA-002: Age Bucket Calculation
- **Priority**: P1
- **Description**: Calculate stock age by purchase/receive date
- **Acceptance Criteria**:
  - Default buckets: 0-30, 31-60, 61-90, 91-180, 180+ days
  - Age based on last receipt date
  - FIFO-based aging for batch items
  - Customizable bucket ranges

### SA-003: Slow-Moving Identification
- **Priority**: P1
- **Description**: Flag slow-moving inventory
- **Acceptance Criteria**:
  - Define slow-moving threshold (e.g., no sales in 90 days)
  - Highlight slow movers in report
  - Calculate days since last sale
  - Show turnover rate

### SA-004: Valuation by Age
- **Priority**: P1
- **Description**: Show inventory value by age bucket
- **Acceptance Criteria**:
  - Value at cost price
  - Value breakdown by bucket
  - Percentage of total value
  - Potential write-off amount

### SA-005: Export Functionality
- **Priority**: P1
- **Description**: Export aging report
- **Acceptance Criteria**:
  - Export to Excel with all columns
  - Export to PDF summary
  - Include charts in PDF

## API Endpoint

```
GET /api/reports/inventory/stock-aging
  Query params:
    - warehouseId?: string
    - categoryId?: string
    - asOfDate?: string (default: today)
    - buckets?: string (e.g., "30,60,90,180")
    - format?: 'json' | 'xlsx' | 'pdf'
```

## Response Schema

```typescript
interface StockAgingReport {
  summary: {
    totalItems: number;
    totalQuantity: number;
    totalValue: number;
    avgAge: number;
    slowMovingCount: number;
    slowMovingValue: number;
  };
  buckets: AgeBucket[];
  items: StockAgingItem[];
  asOfDate: string;
}

interface AgeBucket {
  label: string;     // "0-30 days"
  minDays: number;
  maxDays: number;
  itemCount: number;
  quantity: number;
  value: number;
  percentOfValue: number;
}

interface StockAgingItem {
  itemId: string;
  sku: string;
  itemName: string;
  category: string;
  warehouse: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  lastReceiveDate: string;
  lastSaleDate: string | null;
  ageDays: number;
  ageBucket: string;
  daysSinceLastSale: number | null;
  isSlowMoving: boolean;
  turnoverRate: number;
}
```

## UI Components

### StockAgingReportPage
```tsx
// /reports/inventory/stock-aging

const StockAgingReportPage = () => {
  return (
    <PageContainer title="Stock Aging Report">
      <ReportFilters>
        <WarehouseSelect allowAll />
        <CategorySelect allowAll />
        <DatePicker label="As of Date" />
        <ExportDropdown onExport={handleExport} />
      </ReportFilters>

      <SummaryCards>
        <Statistic title="Total Items" value={summary.totalItems} />
        <Statistic title="Total Value" value={summary.totalValue} prefix="RM" />
        <Statistic title="Avg Age" value={summary.avgAge} suffix="days" />
        <Statistic
          title="Slow Moving"
          value={summary.slowMovingCount}
          valueStyle={{ color: '#cf1322' }}
        />
      </SummaryCards>

      <Row gutter={16}>
        <Col span={12}>
          <AgingDistributionChart buckets={report.buckets} />
        </Col>
        <Col span={12}>
          <AgingValueChart buckets={report.buckets} />
        </Col>
      </Row>

      <StockAgingTable items={report.items} />
    </PageContainer>
  );
};
```

### AgingDistributionChart Component
```tsx
// Stacked bar chart showing quantity/value by bucket
// Colors: Green (fresh) -> Red (aged)
const BUCKET_COLORS = {
  '0-30': '#52c41a',   // Green
  '31-60': '#73d13d',  // Light green
  '61-90': '#fadb14',  // Yellow
  '91-180': '#fa8c16', // Orange
  '180+': '#f5222d',   // Red
};
```

### StockAgingTable Component
```tsx
// Columns:
// - Item (SKU, Name)
// - Category
// - Warehouse
// - Qty
// - Unit Cost
// - Total Value
// - Age (days) with color coding
// - Last Received
// - Last Sold
// - Days Since Sale
// - Turnover Rate
// - Slow Moving (badge)

// Features:
// - Sort by any column
// - Filter slow moving only
// - Expandable row with movement history
// - Click to item detail
```

### AgeBucketLegend Component
```tsx
// Shows bucket color legend
// Allows clicking bucket to filter table
```

## Slow-Moving Criteria

```typescript
const SLOW_MOVING_THRESHOLD_DAYS = 90; // Configurable

function isSlowMoving(item: StockAgingItem): boolean {
  if (!item.lastSaleDate) {
    // Never sold - check receive date
    return item.ageDays > SLOW_MOVING_THRESHOLD_DAYS;
  }
  return item.daysSinceLastSale > SLOW_MOVING_THRESHOLD_DAYS;
}
```

## Turnover Rate Calculation

```typescript
// Annual turnover rate
function calculateTurnoverRate(
  quantitySold: number,
  averageStock: number,
  days: number
): number {
  if (averageStock === 0) return 0;
  const annualizedSales = (quantitySold / days) * 365;
  return annualizedSales / averageStock;
}
```

## Navigation

```
Reports
├── Sales
├── Purchases
└── Inventory
    ├── Inventory Summary
    ├── Inventory Valuation
    └── Stock Aging         <-- Add this
```
