# Purchase by Vendor Report

## Overview
Frontend report viewer showing purchases grouped by vendor for a date range.

## Requirements

### PVR-001: Report Page
- **Priority**: P1
- **Description**: Report viewer page for purchases by vendor
- **Acceptance Criteria**:
  - Date range filter (from/to)
  - Vendor filter (optional)
  - Summary totals card
  - Detailed table by vendor
  - Drill-down to individual bills/POs

### PVR-002: Report Data
- **Priority**: P1
- **Description**: Purchase data aggregation
- **Acceptance Criteria**:
  - Group by vendor
  - Total purchase amount per vendor
  - PO count per vendor
  - Bill count per vendor
  - Top items purchased
  - Percentage of total purchases

### PVR-003: Report Visualization
- **Priority**: P1
- **Description**: Charts for purchase analysis
- **Acceptance Criteria**:
  - Pie/Donut chart of purchases by vendor
  - Bar chart of top vendors
  - Trend chart if comparing periods

### PVR-004: Report Export
- **Priority**: P1
- **Description**: Export report data
- **Acceptance Criteria**:
  - Export to Excel button
  - Export to PDF button
  - Include filters in export

## API Endpoint

```
GET /api/reports/purchases/by-vendor
  Query params:
    - startDate: string (ISO date)
    - endDate: string (ISO date)
    - vendorId?: string (optional filter)
    - format?: 'json' | 'xlsx' | 'pdf'
```

## Response Schema

```typescript
interface PurchaseByVendorReport {
  summary: {
    totalPurchases: number;
    totalVendors: number;
    totalPOs: number;
    totalBills: number;
    avgPerVendor: number;
  };
  vendors: VendorPurchaseSummary[];
  period: {
    startDate: string;
    endDate: string;
  };
}

interface VendorPurchaseSummary {
  vendorId: string;
  vendorName: string;
  totalAmount: number;
  poCount: number;
  billCount: number;
  percentOfTotal: number;
  topItems: {
    itemId: string;
    itemName: string;
    quantity: number;
    amount: number;
  }[];
}
```

## UI Components

### PurchaseByVendorReport Page
```tsx
// /reports/purchases/by-vendor

const PurchaseByVendorReport = () => {
  const [dateRange, setDateRange] = useState<[Date, Date]>();
  const [vendorId, setVendorId] = useState<string>();

  return (
    <PageContainer>
      <ReportFilters>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <VendorSelect value={vendorId} onChange={setVendorId} allowClear />
        <ExportDropdown onExport={handleExport} />
      </ReportFilters>

      <SummaryCards data={report.summary} />

      <Row gutter={16}>
        <Col span={12}>
          <PurchasesByVendorChart data={report.vendors} />
        </Col>
        <Col span={12}>
          <TopVendorsChart data={report.vendors.slice(0, 10)} />
        </Col>
      </Row>

      <VendorPurchasesTable
        data={report.vendors}
        onVendorClick={handleVendorDrilldown}
      />
    </PageContainer>
  );
};
```

### SummaryCards Component
```tsx
// Shows: Total Purchases, Vendors, POs, Bills, Avg per Vendor
<Row gutter={16}>
  <Col span={6}>
    <Statistic title="Total Purchases" value={summary.totalPurchases} prefix="RM" />
  </Col>
  <Col span={6}>
    <Statistic title="Vendors" value={summary.totalVendors} />
  </Col>
  <Col span={6}>
    <Statistic title="Purchase Orders" value={summary.totalPOs} />
  </Col>
  <Col span={6}>
    <Statistic title="Bills" value={summary.totalBills} />
  </Col>
</Row>
```

### VendorPurchasesTable Component
```tsx
// Columns: Vendor, Total Amount, POs, Bills, % of Total, Actions
// Expandable row showing top items purchased from vendor
// Click vendor name to go to vendor detail page
```

## Navigation

```
Reports
├── Sales
│   ├── Sales by Customer
│   ├── Sales by Item
│   └── Receivables Aging
├── Purchases
│   ├── Purchase by Vendor  <-- Add this
│   └── Payables Aging
└── Inventory
    ├── Inventory Summary
    ├── Inventory Valuation
    └── Stock Aging
```

## Report Filters State

```typescript
interface ReportFilters {
  startDate: string;
  endDate: string;
  vendorId?: string;
}

// Default: Last 30 days
const defaultFilters: ReportFilters = {
  startDate: subDays(new Date(), 30).toISOString(),
  endDate: new Date().toISOString(),
};
```
