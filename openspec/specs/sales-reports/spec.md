# Sales Reports

## Overview
Comprehensive sales reporting and analytics for business insights.

## Requirements

### SR-001: Sales Summary Report
- **Priority**: P0
- **Description**: Overview of sales performance
- **Acceptance Criteria**:
  - Total sales by period (daily, weekly, monthly)
  - Sales count and average
  - Comparison with previous period
  - Gross profit margin
  - Chart visualization

### SR-002: Sales by Customer Report
- **Priority**: P0
- **Description**: Sales analysis by customer
- **Acceptance Criteria**:
  - Total sales per customer
  - Customer ranking by revenue
  - Purchase frequency
  - Average order value
  - Customer growth trends

### SR-003: Sales by Item Report
- **Priority**: P0
- **Description**: Item-level sales analysis
- **Acceptance Criteria**:
  - Quantity sold per item
  - Revenue per item
  - Profit margin per item
  - Best/worst sellers
  - Category breakdown

### SR-004: Sales by Salesperson
- **Priority**: P1
- **Description**: Performance by sales rep
- **Acceptance Criteria**:
  - Sales per salesperson
  - Conversion rates
  - Average deal size
  - Commission calculation
  - Target vs actual

### SR-005: Invoice Aging Report
- **Priority**: P0
- **Description**: Accounts receivable aging
- **Acceptance Criteria**:
  - Aging buckets (current, 30, 60, 90+)
  - Outstanding per customer
  - Overdue amount
  - Collection rate
  - Bad debt analysis

### SR-006: Sales Order Status Report
- **Priority**: P0
- **Description**: Track order pipeline
- **Acceptance Criteria**:
  - Orders by status
  - Fulfillment rate
  - Backlog analysis
  - Average processing time

### SR-007: Export Functionality
- **Priority**: P0
- **Description**: Export reports
- **Acceptance Criteria**:
  - Export to Excel (XLSX)
  - Export to CSV
  - Export to PDF
  - Schedule email delivery

## API Endpoints

```
GET /api/reports/sales/summary         - Sales summary
GET /api/reports/sales/by-customer     - By customer
GET /api/reports/sales/by-item         - By item
GET /api/reports/sales/by-salesperson  - By salesperson
GET /api/reports/sales/invoice-aging   - Receivables aging
GET /api/reports/sales/order-status    - Order status
GET /api/reports/sales/export          - Export report
```

## Query Parameters

```typescript
interface ReportFilters {
  fromDate: string;      // ISO date
  toDate: string;        // ISO date
  customerId?: string;
  itemId?: string;
  categoryId?: string;
  warehouseId?: string;
  salespersonId?: string;
  status?: string;
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  format?: 'json' | 'xlsx' | 'csv' | 'pdf';
}
```

## Response Format

```typescript
interface SalesSummaryReport {
  period: {
    from: string;
    to: string;
  };
  summary: {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    totalCost: number;
    grossProfit: number;
    grossMargin: number;
  };
  comparison: {
    salesChange: number;      // Percentage
    ordersChange: number;
    marginChange: number;
  };
  chartData: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
    }[];
  };
  topCustomers: CustomerSale[];
  topItems: ItemSale[];
}
```
