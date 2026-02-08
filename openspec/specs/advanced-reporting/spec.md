# Advanced Reporting (Expanded to 50+ Reports)

## Overview
Expand the reporting system from approximately 10 existing reports to 50+ comprehensive reports across six categories: Sales, Inventory, Purchases, Financial, Compliance, and Operational. All reports follow the existing ReportViewer component pattern, support Excel and PDF export, and include date range filters. Reports are served through API endpoints under `/reports/:category/:type`.

## Existing Reports (Already Implemented)

The following reports already exist and are not redefined here:
1. Sales by Customer (SR-002)
2. Sales by Item (SR-003)
3. Sales Summary (SR-001)
4. Receivables Aging (SR-005)
5. Inventory Summary (IR-001)
6. Inventory Valuation (IR-004)
7. Low Stock Report (IR-003)
8. Stock Aging (IR-005)
9. Stock Movement (IR-006)
10. Payables Aging (purchases/payables-aging)
11. Purchase by Vendor (purchase-by-vendor-report)
12. SST Summary (TAX-006)

---

## New Sales Reports (8 reports)

### ADV-S01: Sales by Salesperson
- **Priority**: P2
- **Description**: Sales performance analysis by salesperson
- **Acceptance Criteria**:
  - Date range filter (required)
  - Table columns: Salesperson Name, Total Orders, Total Invoices, Total Sales (RM), Average Order Value (RM), % of Total Sales
  - Include only confirmed/shipped/delivered orders and non-void invoices
  - Sort by total sales descending (default)
  - Summary row with grand totals
  - Chart: bar chart showing top 10 salespersons
  - Drill-down: click salesperson to see their orders
  - Export: Excel, PDF

### ADV-S02: Sales by Category
- **Priority**: P2
- **Description**: Sales breakdown by item category
- **Acceptance Criteria**:
  - Date range filter (required)
  - Category filter (optional, multi-select)
  - Table columns: Category, Items Sold (count), Quantity Sold, Total Sales (RM), Cost (RM), Gross Profit (RM), Margin %
  - Support hierarchical categories (show parent > child)
  - Summary row
  - Chart: pie chart showing category distribution by revenue
  - Export: Excel, PDF

### ADV-S03: Sales by Region/State
- **Priority**: P2
- **Description**: Geographic sales distribution by Malaysian state
- **Acceptance Criteria**:
  - Date range filter (required)
  - Table columns: State, Customers (count), Orders (count), Total Sales (RM), Average Order (RM), % of Total
  - State derived from customer billing address
  - Use Malaysian state codes from localization spec
  - Unresolvable addresses grouped under "Unknown"
  - Chart: horizontal bar chart by state
  - Export: Excel, PDF

### ADV-S04: Monthly Sales Summary
- **Priority**: P2
- **Description**: Month-by-month sales summary
- **Acceptance Criteria**:
  - Year selector (required, default: current year)
  - Table columns: Month, Orders, Invoices, Gross Sales (RM), Returns (RM), Net Sales (RM), Tax (RM), Cost (RM), Gross Profit (RM), Margin %
  - One row per month (Jan-Dec)
  - Highlight current month
  - Summary row with annual totals
  - Chart: line chart showing monthly sales trend
  - Export: Excel, PDF

### ADV-S05: Sales Growth Comparison (Year-over-Year)
- **Priority**: P3
- **Description**: Compare sales performance across years
- **Acceptance Criteria**:
  - Year selection (compare Year A vs Year B, default: current vs previous)
  - Table columns: Month, Year A Sales (RM), Year B Sales (RM), Difference (RM), Growth %
  - Color coding: green for positive growth, red for negative
  - Summary row with annual comparison
  - Chart: dual-line chart overlaying both years
  - Export: Excel, PDF

### ADV-S06: Quote Conversion Rate
- **Priority**: P2
- **Description**: Track quote-to-order conversion metrics
- **Acceptance Criteria**:
  - Date range filter (required)
  - Salesperson filter (optional)
  - Summary metrics: Total Quotes, Accepted, Rejected, Expired, Converted, Conversion Rate %
  - Table columns: Salesperson, Quotes Sent, Accepted, Rejected, Expired, Converted, Conversion Rate %, Total Quoted Value (RM), Total Converted Value (RM)
  - Average time from quote to conversion
  - Chart: funnel chart (Sent -> Accepted -> Converted)
  - Depends on: Sales Quotes module
  - Export: Excel, PDF

### ADV-S07: Average Order Value Trend
- **Priority**: P3
- **Description**: Track average order value over time
- **Acceptance Criteria**:
  - Date range filter (required)
  - Group by: Daily, Weekly, Monthly (default: Monthly)
  - Table columns: Period, Order Count, Total Sales (RM), Average Order Value (RM), Median Order Value (RM), Min (RM), Max (RM)
  - Chart: line chart with AOV trend and moving average
  - Export: Excel, PDF

### ADV-S08: Customer Acquisition
- **Priority**: P3
- **Description**: New customer acquisition analysis
- **Acceptance Criteria**:
  - Date range filter (required)
  - Group by: Monthly (default)
  - Table columns: Period, New Customers, First Order Count, First Order Total (RM), Average First Order (RM), Returning Customers, Returning Order Total (RM)
  - "New customer" = customer whose first order falls within the period
  - Chart: bar chart showing new vs returning customer counts
  - Export: Excel, PDF

---

## New Inventory Reports (8 reports)

### ADV-I01: Inventory Turnover Rate
- **Priority**: P2
- **Description**: Measure how quickly inventory sells
- **Acceptance Criteria**:
  - Date range filter (required, default: last 12 months)
  - Category filter (optional)
  - Warehouse filter (optional)
  - Table columns: Item, SKU, Category, Average Inventory (units), Units Sold, Turnover Rate, Days to Sell
  - Turnover Rate = Units Sold / Average Inventory
  - Days to Sell = 365 / Turnover Rate
  - Color coding: green (high turnover), yellow (medium), red (low/dead)
  - Sort by turnover rate
  - Summary: average turnover across all items
  - Export: Excel, PDF

### ADV-I02: Dead Stock Report
- **Priority**: P2
- **Description**: Identify items with no movement for extended periods
- **Acceptance Criteria**:
  - Threshold filter: "No movement for X days" (default: 90 days)
  - Warehouse filter (optional)
  - Category filter (optional)
  - Table columns: Item, SKU, Category, Warehouse, Stock On Hand, Unit Cost (RM), Total Value (RM), Last Sale Date, Last Receive Date, Days Since Last Movement
  - Sort by days since last movement descending
  - Summary: total dead stock count, total dead stock value
  - Action: link to create stock adjustment for write-off
  - Export: Excel, PDF

### ADV-I03: Stock Movement History
- **Priority**: P2
- **Description**: Detailed stock movement ledger for specific items
- **Acceptance Criteria**:
  - Item selector (required)
  - Warehouse filter (optional)
  - Date range filter (required)
  - Table columns: Date, Type (Sale/Purchase/Adjustment/Transfer), Reference #, Quantity In, Quantity Out, Balance, Unit Cost (RM), Total Value (RM), User
  - Running balance column
  - Movement types color coded
  - Summary: opening balance, total in, total out, closing balance
  - Export: Excel, PDF

### ADV-I04: Warehouse Utilization
- **Priority**: P2
- **Description**: Compare stock distribution across warehouses
- **Acceptance Criteria**:
  - Table columns: Warehouse, Total SKUs, Total Units, Total Value (RM), % of Total Value, Active Items, Inactive Items
  - Summary row with totals
  - Chart: bar chart comparing warehouse values
  - Chart: pie chart showing value distribution
  - If bin management enabled: show zone utilization breakdown
  - Export: Excel, PDF

### ADV-I05: Bin Occupancy Report
- **Priority**: P2
- **Description**: Bin-level occupancy analysis within warehouses
- **Acceptance Criteria**:
  - Warehouse filter (required)
  - Zone filter (optional)
  - Bin type filter (optional)
  - Table columns: Bin Code, Zone, Type, Max Capacity, Current Occupancy, Utilization %, Items Count, Primary Item
  - Color coding by utilization: empty (gray), low (green), medium (blue), high (orange), full (red)
  - Summary: total bins, empty bins, average utilization %
  - Depends on: Bin Location Management module
  - Export: Excel, PDF

### ADV-I06: ABC Analysis
- **Priority**: P2
- **Description**: Classify items by value contribution (Pareto principle)
- **Acceptance Criteria**:
  - Date range filter (required, default: last 12 months)
  - Classification method: by sales revenue (default), by quantity sold, by profit margin
  - Table columns: Item, SKU, Category, Annual Usage Value (RM), % of Total Value, Cumulative %, Classification (A/B/C)
  - Classification rules:
    - A: top items contributing to 80% of total value
    - B: next items contributing to 15% (80-95% cumulative)
    - C: remaining items contributing to 5% (95-100% cumulative)
  - Summary: count and value per classification
  - Chart: Pareto chart (bar + cumulative line)
  - Export: Excel, PDF

### ADV-I07: Inventory Forecast
- **Priority**: P3
- **Description**: Projected inventory levels based on historical demand
- **Acceptance Criteria**:
  - Item selector (optional, default: all items with reorder settings)
  - Forecast period: 30, 60, 90 days (default: 30)
  - Forecast method: Moving Average (default), Exponential Smoothing
  - Table columns: Item, SKU, Current Stock, Average Daily Usage, Forecasted Demand (period), Projected Stock (end of period), Days Until Stockout, Suggested Reorder Qty
  - Color coding: red if stockout within period, yellow if below safety stock, green if adequate
  - Uses DemandForecast model data
  - Export: Excel, PDF

### ADV-I08: Item Profitability
- **Priority**: P2
- **Description**: Profit analysis per item
- **Acceptance Criteria**:
  - Date range filter (required)
  - Category filter (optional)
  - Table columns: Item, SKU, Category, Units Sold, Revenue (RM), Cost (RM), Gross Profit (RM), Margin %, Revenue per Unit (RM), Cost per Unit (RM)
  - Sort by gross profit descending (default)
  - Top/bottom performers highlight
  - Summary: total revenue, total cost, total profit, average margin
  - Chart: scatter plot (revenue vs margin)
  - Export: Excel, PDF

---

## New Purchase Reports (6 reports)

### ADV-P01: Purchase by Category
- **Priority**: P2
- **Description**: Purchase spending breakdown by item category
- **Acceptance Criteria**:
  - Date range filter (required)
  - Table columns: Category, Items Purchased (count), Quantity, Total Cost (RM), % of Total Purchases
  - Summary row
  - Chart: pie chart showing category distribution
  - Export: Excel, PDF

### ADV-P02: Purchase by Item
- **Priority**: P2
- **Description**: Detailed purchase analysis per item
- **Acceptance Criteria**:
  - Date range filter (required)
  - Category filter (optional)
  - Vendor filter (optional)
  - Table columns: Item, SKU, Category, Total Qty Purchased, Average Unit Cost (RM), Min Price (RM), Max Price (RM), Total Cost (RM), Vendor Count
  - Sort by total cost descending
  - Export: Excel, PDF

### ADV-P03: Vendor Performance Scorecard
- **Priority**: P2
- **Description**: Evaluate vendor reliability and performance
- **Acceptance Criteria**:
  - Date range filter (required)
  - Vendor filter (optional, for individual vendor detail)
  - Table columns: Vendor, POs Issued, POs Received, On-Time %, Total Ordered (RM), Total Received (RM), Quality Issues (rejected items count), Average Lead Time (days), Price Variance %
  - On-Time % = POs received by expectedDate / total POs received
  - Quality = rejected qty from PurchaseReceiveItem / total received qty
  - Lead Time = average days from PO issue to receive date
  - Color coding: green (good), yellow (needs attention), red (poor)
  - Overall vendor score (composite metric)
  - Export: Excel, PDF

### ADV-P04: Purchase Price Variance
- **Priority**: P3
- **Description**: Track price changes for items across purchase orders
- **Acceptance Criteria**:
  - Date range filter (required)
  - Item filter (optional)
  - Vendor filter (optional)
  - Table columns: Item, SKU, Vendor, PO Number, PO Date, Quantity, Unit Price (RM), Previous Price (RM), Variance (RM), Variance %
  - Previous price = unit price from the prior PO for same item from same vendor
  - Highlight significant variances (> 10%)
  - Summary: items with price increases, items with price decreases, average variance
  - Export: Excel, PDF

### ADV-P05: Delivery Timeline Analysis
- **Priority**: P3
- **Description**: Analyze purchase order delivery timelines
- **Acceptance Criteria**:
  - Date range filter (required)
  - Vendor filter (optional)
  - Table columns: PO Number, Vendor, Order Date, Expected Date, Receive Date, Days Expected, Days Actual, Variance (days), On Time?
  - On Time = received on or before expected date
  - Summary: average delivery time, on-time percentage, late percentage
  - Chart: histogram of delivery time distribution
  - Export: Excel, PDF

### ADV-P06: Outstanding Purchase Orders
- **Priority**: P2
- **Description**: List of open/partially received POs
- **Acceptance Criteria**:
  - Status filter: Open, Partially Received (default: both)
  - Vendor filter (optional)
  - Warehouse filter (optional)
  - Table columns: PO Number, Vendor, Order Date, Expected Date, Days Open, Total (RM), Received %, Status
  - Days Open = today - order date
  - Color coding: green (within expected), yellow (approaching due), red (overdue)
  - Summary: total outstanding POs, total outstanding value
  - Action: link to PO detail page
  - Export: Excel, PDF

---

## New Financial Reports (10 reports)

### ADV-F01: Profit & Loss Statement
- **Priority**: P2
- **Description**: Income and expense summary for a period
- **Acceptance Criteria**:
  - Date range filter (required)
  - Comparison option: vs previous period, vs same period last year
  - Sections:
    - Revenue: Total Sales, Less: Returns/Credits = Net Revenue
    - Cost of Goods Sold: Opening Inventory + Purchases - Closing Inventory = COGS
    - Gross Profit = Net Revenue - COGS
    - Operating Expenses (if journal entries available from accounting module)
    - Net Profit
  - Each line shows: Amount (RM), % of Revenue, Comparison Amount, Change %
  - If accounting module not yet implemented, derive from sales/purchase transactions
  - Export: Excel, PDF

### ADV-F02: Trial Balance
- **Priority**: P2
- **Description**: List of all GL accounts with debit/credit balances
- **Acceptance Criteria**:
  - As-of date (required, default: today)
  - Depends on: Accounting Export module (chart of accounts + journal entries)
  - See accounting-export spec for detailed trial balance requirements
  - Table columns: Account Code, Account Name, Type, Debit (RM), Credit (RM)
  - Grouped by account type with subtotals
  - Grand total (must balance)
  - Export: Excel, PDF

### ADV-F03: Balance Sheet (Basic)
- **Priority**: P3
- **Description**: Snapshot of financial position
- **Acceptance Criteria**:
  - As-of date (required, default: today)
  - Depends on: Accounting Export module
  - Sections:
    - Assets: Cash, Bank, Accounts Receivable, Inventory = Total Assets
    - Liabilities: Accounts Payable, SST Payable = Total Liabilities
    - Equity: Owner Equity, Retained Earnings = Total Equity
  - Equation: Assets = Liabilities + Equity (must balance)
  - Derived from journal entry balances
  - Export: Excel, PDF

### ADV-F04: Cash Flow Statement
- **Priority**: P3
- **Description**: Cash inflows and outflows for a period
- **Acceptance Criteria**:
  - Date range filter (required)
  - Sections:
    - Operating Activities: Customer Payments Received - Vendor Payments Made - Tax Payments
    - Summary: Net Cash from Operations
  - Data sourced from Payment and VendorPayment records
  - Payment method breakdown
  - Chart: waterfall chart showing cash flow components
  - Export: Excel, PDF

### ADV-F05: Revenue by Month
- **Priority**: P2
- **Description**: Monthly revenue breakdown
- **Acceptance Criteria**:
  - Year selector (required, default: current year)
  - Table columns: Month, Invoice Count, Gross Revenue (RM), Credits/Returns (RM), Net Revenue (RM), Tax Collected (RM)
  - Summary row with annual totals
  - Chart: bar chart with monthly revenue
  - Export: Excel, PDF

### ADV-F06: Expense Analysis
- **Priority**: P3
- **Description**: Expense breakdown from vendor bills
- **Acceptance Criteria**:
  - Date range filter (required)
  - Category filter (optional, from bill item categories)
  - Vendor filter (optional)
  - Table columns: Category/Vendor, Bill Count, Total Amount (RM), % of Total Expenses, Average Bill (RM)
  - Group by: Category or Vendor (toggle)
  - Chart: pie chart showing expense distribution
  - Export: Excel, PDF

### ADV-F07: Tax Summary (GST + SST Combined)
- **Priority**: P2
- **Description**: Combined tax summary handling both GST and SST periods
- **Acceptance Criteria**:
  - Date range filter (required)
  - Tax regime filter: All, GST, SST, Tax Holiday
  - Table columns: Tax Code, Tax Name, Regime, Rate %, Taxable Sales (RM), Output Tax (RM), Taxable Purchases (RM), Input Tax (RM), Net Tax (RM)
  - Summary: total output tax, total input tax, net payable/refundable
  - Regime-separated subtotals when date range spans multiple regimes
  - Depends on: GST/SST Transition spec
  - Export: Excel, PDF

### ADV-F08: Outstanding Payments Aging
- **Priority**: P2
- **Description**: Combined receivables and payables aging view
- **Acceptance Criteria**:
  - As-of date (default: today)
  - Type toggle: Receivables, Payables, Both
  - Table columns: Contact, Type (Customer/Vendor), Current (RM), 1-30 (RM), 31-60 (RM), 61-90 (RM), 90+ (RM), Total (RM)
  - Color coding by severity
  - Summary: total receivables, total payables, net position
  - Export: Excel, PDF

### ADV-F09: Customer Lifetime Value
- **Priority**: P3
- **Description**: Total revenue generated per customer over all time
- **Acceptance Criteria**:
  - Table columns: Customer, First Order Date, Last Order Date, Total Orders, Total Revenue (RM), Average Order Value (RM), Orders per Month, Estimated CLV (RM)
  - CLV = Average Order Value x Purchase Frequency x Customer Lifespan (months)
  - Sort by total revenue descending (default)
  - Filter: active customers only (have ordered in last 12 months), or all
  - Top 20 customers highlighted
  - Export: Excel, PDF

### ADV-F10: Payment Method Analysis
- **Priority**: P3
- **Description**: Breakdown of payments by method
- **Acceptance Criteria**:
  - Date range filter (required)
  - Type toggle: Sales Payments, Purchase Payments, Both
  - Table columns: Payment Method, Transaction Count, Total Amount (RM), % of Total, Average Amount (RM)
  - Payment methods from PaymentMethod enum: CASH, BANK_TRANSFER, CHEQUE, CREDIT_CARD, FPX, DUITNOW, GRABPAY, TNG_EWALLET, OTHER
  - Chart: pie chart showing distribution
  - Export: Excel, PDF

---

## New Compliance Reports (4 reports)

### ADV-C01: SST Filing Summary
- **Priority**: P2
- **Description**: Data for SST-02 return filing
- **Acceptance Criteria**:
  - Filing period selector (bi-monthly periods: Jan-Feb, Mar-Apr, etc.)
  - Table sections:
    - Sales Tax (10%): Total taxable sales, Tax amount
    - Service Tax (6%): Total taxable services, Tax amount
    - Zero-rated supplies: Total
    - Exempt supplies: Total
  - Summary: Total tax payable
  - Reference to SST registration number from organization settings
  - Export: Excel (SST-02 format), PDF

### ADV-C02: e-Invoice Submission Log
- **Priority**: P2
- **Description**: Track all e-Invoice submissions to MyInvois
- **Acceptance Criteria**:
  - Date range filter (required)
  - Status filter: All, Pending, Submitted, Validated, Rejected, Cancelled
  - Table columns: Invoice Number, Customer, Invoice Date, Amount (RM), Submission UUID, Document UUID, Status, Submitted At, Validated At, Errors
  - Status badges with colors matching EInvoiceStatus enum
  - Retry count for failed submissions
  - Click to view full submission details
  - Summary: total submitted, validated, rejected, pending
  - Export: Excel, PDF

### ADV-C03: Tax Audit Trail
- **Priority**: P2
- **Description**: Complete audit trail of tax-related transactions
- **Acceptance Criteria**:
  - Date range filter (required)
  - Tax code filter (optional)
  - Transaction type filter (optional): Invoice, Credit Note, Bill, Vendor Credit
  - Table columns: Date, Transaction Type, Document Number, Contact, Tax Code, Rate %, Taxable Amount (RM), Tax Amount (RM), Created By, Status
  - Ordered by date
  - Running tax total
  - Export: Excel (suitable for audit submission), PDF

### ADV-C04: Annual Tax Summary
- **Priority**: P3
- **Description**: Year-end tax summary for annual filing
- **Acceptance Criteria**:
  - Year selector (required, default: previous year)
  - Sections:
    - Total Revenue
    - Total Tax Collected (broken down by tax code)
    - Total Purchases
    - Total Input Tax (broken down by tax code)
    - Net Tax Position
  - Monthly breakdown within the year
  - Regime separation if year spans GST/SST transition
  - Export: Excel, PDF

---

## New Operational Reports (4 reports)

### ADV-O01: User Activity Log
- **Priority**: P3
- **Description**: Track user actions in the system
- **Acceptance Criteria**:
  - Date range filter (required)
  - User filter (optional)
  - Action type filter (optional): Create, Update, Delete, Login, Export
  - Table columns: Timestamp, User, Action, Module, Resource, Details, IP Address
  - Note: Requires implementing an activity log table (future model addition)
  - For initial implementation, derive from createdBy/updatedAt fields on existing models
  - Summary: actions per user, most active modules
  - Export: Excel, PDF

### ADV-O02: Document Status Summary
- **Priority**: P2
- **Description**: Overview of all document statuses across modules
- **Acceptance Criteria**:
  - Date range filter (optional, default: all time)
  - Table sections:
    - Sales Orders: count per status (Draft, Confirmed, Shipped, Delivered, Closed, Cancelled)
    - Invoices: count per status (Draft, Sent, Partially Paid, Paid, Overdue, Void)
    - Purchase Orders: count per status (Draft, Issued, Partially Received, Received, Closed, Cancelled)
    - Bills: count per status (Draft, Received, Partially Paid, Paid, Overdue, Void)
    - Quotes: count per status (Draft, Sent, Accepted, Expired, Rejected, Converted)
    - Stock Adjustments: count per status (Draft, Completed, Cancelled)
    - Inventory Transfers: count per status (Draft, In Transit, Received, Cancelled)
  - Stacked bar chart per module
  - Highlight action-required counts (overdue invoices, draft POs, etc.)
  - Export: Excel, PDF

### ADV-O03: System Health Report
- **Priority**: P3
- **Description**: Data integrity and system health overview
- **Acceptance Criteria**:
  - No date filter (current snapshot)
  - Sections:
    - Data Counts: Items, Contacts, Warehouses, Users
    - Active vs Inactive counts per entity
    - Orphaned records check (items without category, contacts without transactions)
    - Stock discrepancy check (items where SUM(StockLevel) differs from expected)
    - Documents with missing required fields
    - Duplicate detection (duplicate SKUs, duplicate contact emails)
  - Status indicators: green (healthy), yellow (warning), red (issue)
  - Export: PDF

### ADV-O04: Audit Trail
- **Priority**: P2
- **Description**: Document change history for compliance
- **Acceptance Criteria**:
  - Date range filter (required)
  - Module filter: Sales, Purchases, Inventory, Settings
  - Table columns: Timestamp, User, Action (Create/Update/Delete), Module, Document #, Field Changed, Old Value, New Value
  - Note: Requires audit log implementation (can use Prisma middleware or database triggers)
  - For initial implementation, show document creation and status changes
  - Export: Excel, PDF

---

## API Endpoints (All New Reports)

```
# Sales Reports
GET /api/reports/sales/by-salesperson                   - ADV-S01
GET /api/reports/sales/by-category                      - ADV-S02
GET /api/reports/sales/by-region                        - ADV-S03
GET /api/reports/sales/monthly-summary                  - ADV-S04
GET /api/reports/sales/growth-comparison                - ADV-S05
GET /api/reports/sales/quote-conversion                 - ADV-S06
GET /api/reports/sales/average-order-value              - ADV-S07
GET /api/reports/sales/customer-acquisition             - ADV-S08

# Inventory Reports
GET /api/reports/inventory/turnover                     - ADV-I01
GET /api/reports/inventory/dead-stock                   - ADV-I02
GET /api/reports/inventory/movement-history             - ADV-I03
GET /api/reports/inventory/warehouse-utilization        - ADV-I04
GET /api/reports/inventory/bin-occupancy                - ADV-I05
GET /api/reports/inventory/abc-analysis                 - ADV-I06
GET /api/reports/inventory/forecast                     - ADV-I07
GET /api/reports/inventory/item-profitability           - ADV-I08

# Purchase Reports
GET /api/reports/purchases/by-category                  - ADV-P01
GET /api/reports/purchases/by-item                      - ADV-P02
GET /api/reports/purchases/vendor-performance           - ADV-P03
GET /api/reports/purchases/price-variance               - ADV-P04
GET /api/reports/purchases/delivery-timeline            - ADV-P05
GET /api/reports/purchases/outstanding-pos              - ADV-P06

# Financial Reports
GET /api/reports/financial/profit-loss                   - ADV-F01
GET /api/reports/financial/trial-balance                 - ADV-F02
GET /api/reports/financial/balance-sheet                 - ADV-F03
GET /api/reports/financial/cash-flow                     - ADV-F04
GET /api/reports/financial/revenue-by-month              - ADV-F05
GET /api/reports/financial/expense-analysis              - ADV-F06
GET /api/reports/financial/tax-summary                   - ADV-F07
GET /api/reports/financial/outstanding-payments-aging    - ADV-F08
GET /api/reports/financial/customer-lifetime-value       - ADV-F09
GET /api/reports/financial/payment-method-analysis       - ADV-F10

# Compliance Reports
GET /api/reports/compliance/sst-filing-summary           - ADV-C01
GET /api/reports/compliance/einvoice-submission-log      - ADV-C02
GET /api/reports/compliance/tax-audit-trail              - ADV-C03
GET /api/reports/compliance/annual-tax-summary           - ADV-C04

# Operational Reports
GET /api/reports/operational/user-activity               - ADV-O01
GET /api/reports/operational/document-status-summary     - ADV-O02
GET /api/reports/operational/system-health               - ADV-O03
GET /api/reports/operational/audit-trail                 - ADV-O04

# All endpoints support:
# ?format=json (default)
# ?format=xlsx (Excel export)
# ?format=pdf (PDF export)
# ?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD (date range)
# ?page=1&limit=50 (pagination for large datasets)
```

## Shared Query Parameters

```typescript
interface BaseReportQuery {
  fromDate?: string;      // ISO date
  toDate?: string;        // ISO date
  format?: 'json' | 'xlsx' | 'pdf';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Extended per report type with specific filters
interface SalesBySalespersonQuery extends BaseReportQuery {
  salespersonId?: string;
}

interface InventoryTurnoverQuery extends BaseReportQuery {
  categoryId?: string;
  warehouseId?: string;
}

// ... etc.
```

## Shared Response Format

```typescript
interface ReportResponse<T> {
  report: {
    type: string;        // e.g., "sales/by-salesperson"
    title: string;       // e.g., "Sales by Salesperson"
    generatedAt: string; // ISO datetime
    period: {
      from: string;
      to: string;
    };
    filters: Record<string, string>; // Applied filter values
  };
  columns: {
    key: string;
    title: string;
    dataIndex: string;
    type: 'string' | 'number' | 'currency' | 'percentage' | 'date';
    align?: 'left' | 'right' | 'center';
    sortable?: boolean;
  }[];
  data: T[];
  summary?: Record<string, number | string>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  chartData?: {
    type: 'bar' | 'line' | 'pie' | 'scatter' | 'funnel' | 'waterfall';
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      color?: string;
    }[];
  };
}
```

## Frontend Implementation

### Updated Report Index Page

```
apps/web/app/(dashboard)/reports/
├── page.tsx                                  # Report index - 6 category cards
├── layout.tsx                                # Reports layout with sidebar
│
├── sales/
│   ├── by-salesperson/page.tsx               # ADV-S01
│   ├── by-category/page.tsx                  # ADV-S02
│   ├── by-region/page.tsx                    # ADV-S03
│   ├── monthly-summary/page.tsx              # ADV-S04
│   ├── growth-comparison/page.tsx            # ADV-S05
│   ├── quote-conversion/page.tsx             # ADV-S06
│   ├── average-order-value/page.tsx          # ADV-S07
│   └── customer-acquisition/page.tsx         # ADV-S08
│
├── inventory/
│   ├── turnover/page.tsx                     # ADV-I01
│   ├── dead-stock/page.tsx                   # ADV-I02
│   ├── movement-history/page.tsx             # ADV-I03
│   ├── warehouse-utilization/page.tsx        # ADV-I04
│   ├── bin-occupancy/page.tsx                # ADV-I05
│   ├── abc-analysis/page.tsx                 # ADV-I06
│   ├── forecast/page.tsx                     # ADV-I07
│   └── item-profitability/page.tsx           # ADV-I08
│
├── purchases/
│   ├── by-category/page.tsx                  # ADV-P01
│   ├── by-item/page.tsx                      # ADV-P02
│   ├── vendor-performance/page.tsx           # ADV-P03
│   ├── price-variance/page.tsx               # ADV-P04
│   ├── delivery-timeline/page.tsx            # ADV-P05
│   └── outstanding-pos/page.tsx              # ADV-P06
│
├── financial/
│   ├── profit-loss/page.tsx                  # ADV-F01
│   ├── trial-balance/page.tsx                # ADV-F02
│   ├── balance-sheet/page.tsx                # ADV-F03
│   ├── cash-flow/page.tsx                    # ADV-F04
│   ├── revenue-by-month/page.tsx             # ADV-F05
│   ├── expense-analysis/page.tsx             # ADV-F06
│   ├── tax-summary/page.tsx                  # ADV-F07
│   ├── outstanding-payments-aging/page.tsx   # ADV-F08
│   ├── customer-lifetime-value/page.tsx      # ADV-F09
│   └── payment-method-analysis/page.tsx      # ADV-F10
│
├── compliance/
│   ├── sst-filing-summary/page.tsx           # ADV-C01
│   ├── einvoice-submission-log/page.tsx      # ADV-C02
│   ├── tax-audit-trail/page.tsx              # ADV-C03
│   └── annual-tax-summary/page.tsx           # ADV-C04
│
├── operational/
│   ├── user-activity/page.tsx                # ADV-O01
│   ├── document-status-summary/page.tsx      # ADV-O02
│   ├── system-health/page.tsx                # ADV-O03
│   └── audit-trail/page.tsx                  # ADV-O04
│
└── components/
    ├── ReportFilterBar.tsx                   # Existing - enhanced with more filter types
    ├── ReportTable.tsx                       # Existing - reused
    ├── ReportSummary.tsx                     # Existing - reused
    ├── ReportChart.tsx                       # NEW - renders chart based on chartData
    ├── DateRangePresets.tsx                  # Existing - reused
    ├── ReportCategoryCard.tsx               # NEW - card for report index
    ├── ReportSidebar.tsx                    # NEW - sidebar navigation within reports
    ├── ExportDropdown.tsx                   # Existing - reused
    └── index.ts
```

### Report Index Page Design

```tsx
// /reports/page.tsx
// Six category cards in 2x3 grid:

// Row 1:
// [Sales Reports - 11 reports]        [Inventory Reports - 11 reports]
//  Sales by Customer                   Stock Summary
//  Sales by Item                       Inventory Valuation
//  ... +9 more                         ... +9 more

// Row 2:
// [Purchase Reports - 8 reports]      [Financial Reports - 10 reports]
//  Purchase by Vendor                  Profit & Loss
//  Payables Aging                      Trial Balance
//  ... +6 more                         ... +8 more

// Row 3:
// [Compliance Reports - 5 reports]    [Operational Reports - 4 reports]
//  SST Summary                         Document Status Summary
//  SST Filing Summary                  Audit Trail
//  ... +3 more                         ... +2 more

// Each card:
// - Category title with icon
// - Report count badge
// - List of report names (clickable links)
// - "View All" link to category page
```

### Report Sidebar Navigation

```tsx
// Within /reports/* pages, show a left sidebar with categorized report links
// Collapsed by default on mobile, visible on desktop
// Highlights currently active report
// Groups:
// - Sales (11 reports)
// - Inventory (11 reports)
// - Purchases (8 reports)
// - Financial (10 reports)
// - Compliance (5 reports)
// - Operational (4 reports)
```

### ReportChart Component

```tsx
// Uses Ant Design Charts (@ant-design/charts) or Recharts

interface ReportChartProps {
  chartData: {
    type: 'bar' | 'line' | 'pie' | 'scatter' | 'funnel' | 'waterfall';
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      color?: string;
    }[];
  };
  height?: number;
  title?: string;
}

// Renders appropriate chart type based on chartData.type
// Responsive sizing
// Tooltip on hover
// Legend for multi-dataset charts
// Print-friendly styling
```

## Hooks

```typescript
// apps/web/hooks/use-reports.ts

// Generic report hook
export function useReport<T>(
  reportType: string,
  filters: BaseReportQuery,
  options?: { enabled?: boolean },
);

// Specific hooks for complex reports
export function useSalesBySalesperson(filters: SalesBySalespersonQuery);
export function useSalesByCategory(filters: BaseReportQuery);
export function useSalesByRegion(filters: BaseReportQuery);
export function useMonthlySalesSummary(year: number);
export function useSalesGrowthComparison(yearA: number, yearB: number);
export function useQuoteConversionRate(filters: BaseReportQuery);
export function useAverageOrderValue(filters: BaseReportQuery);
export function useCustomerAcquisition(filters: BaseReportQuery);

export function useInventoryTurnover(filters: InventoryTurnoverQuery);
export function useDeadStock(filters: DeadStockQuery);
export function useStockMovementHistory(itemId: string, filters: BaseReportQuery);
export function useWarehouseUtilization();
export function useBinOccupancy(warehouseId: string, filters?: BinOccupancyQuery);
export function useAbcAnalysis(filters: BaseReportQuery);
export function useInventoryForecast(filters: ForecastQuery);
export function useItemProfitability(filters: BaseReportQuery);

export function usePurchaseByCategory(filters: BaseReportQuery);
export function usePurchaseByItem(filters: BaseReportQuery);
export function useVendorPerformance(filters: BaseReportQuery);
export function usePurchasePriceVariance(filters: BaseReportQuery);
export function useDeliveryTimeline(filters: BaseReportQuery);
export function useOutstandingPOs(filters: BaseReportQuery);

export function useProfitLoss(filters: BaseReportQuery);
export function useBalanceSheet(asOfDate: string);
export function useCashFlow(filters: BaseReportQuery);
export function useRevenueByMonth(year: number);
export function useExpenseAnalysis(filters: BaseReportQuery);
export function useTaxSummary(filters: BaseReportQuery);
export function useOutstandingPaymentsAging(asOfDate?: string);
export function useCustomerLifetimeValue();
export function usePaymentMethodAnalysis(filters: BaseReportQuery);

export function useSstFilingSummary(period: string);
export function useEInvoiceSubmissionLog(filters: BaseReportQuery);
export function useTaxAuditTrail(filters: BaseReportQuery);
export function useAnnualTaxSummary(year: number);

export function useUserActivity(filters: BaseReportQuery);
export function useDocumentStatusSummary(filters?: BaseReportQuery);
export function useSystemHealth();
export function useAuditTrail(filters: BaseReportQuery);

// Export hook (existing, reused)
export function useReportExport(reportType: string, filters: BaseReportQuery);
```

## NestJS Module Structure

```
apps/api/src/modules/reports/
├── reports.module.ts                        # Existing - register new controllers
├── controllers/
│   ├── sales-reports.controller.ts          # Existing - add new endpoints
│   ├── inventory-reports.controller.ts      # Existing - add new endpoints
│   ├── purchase-reports.controller.ts       # Existing - add new endpoints
│   ├── financial-reports.controller.ts      # NEW
│   ├── compliance-reports.controller.ts     # NEW
│   └── operational-reports.controller.ts    # NEW
├── services/
│   ├── sales-report.service.ts             # Existing - add new methods
│   ├── inventory-report.service.ts         # Existing - add new methods
│   ├── purchase-report.service.ts          # Existing - add new methods
│   ├── financial-report.service.ts         # NEW
│   ├── compliance-report.service.ts        # NEW
│   ├── operational-report.service.ts       # NEW
│   ├── excel-export.service.ts             # Existing - reused
│   └── pdf-export.service.ts               # Existing - reused
├── dto/
│   ├── base-report-query.dto.ts            # Shared base DTO
│   ├── sales-report-queries.dto.ts         # Sales-specific DTOs
│   ├── inventory-report-queries.dto.ts     # Inventory-specific DTOs
│   ├── purchase-report-queries.dto.ts      # Purchase-specific DTOs
│   ├── financial-report-queries.dto.ts     # Financial-specific DTOs
│   ├── compliance-report-queries.dto.ts    # Compliance-specific DTOs
│   └── operational-report-queries.dto.ts   # Operational-specific DTOs
└── tests/
    ├── sales-reports.service.spec.ts
    ├── inventory-reports.service.spec.ts
    ├── purchase-reports.service.spec.ts
    ├── financial-reports.service.spec.ts
    ├── compliance-reports.service.spec.ts
    └── operational-reports.service.spec.ts
```

## Report Count Summary

| Category    | Existing | New | Total |
|-------------|----------|-----|-------|
| Sales       | 3        | 8   | 11    |
| Inventory   | 3        | 8   | 11    |
| Purchases   | 2        | 6   | 8     |
| Financial   | 0        | 10  | 10    |
| Compliance  | 1        | 4   | 5     |
| Operational | 0        | 4   | 4     |
| **Total**   | **9**    | **40** | **49** |

Note: With the SST Summary (existing) and potential additional reports from other specs (Journal Entries report from accounting-export, Bin Occupancy from bin-location-management), the total exceeds 50 reports.

## Dependencies
- Existing report infrastructure (ReportViewer, ExportDropdown, DateRangePresets)
- Existing Excel and PDF export services
- Bin Location Management spec (for ADV-I05: Bin Occupancy)
- Sales Quotes spec (for ADV-S06: Quote Conversion Rate)
- GST/SST Transition spec (for ADV-F07: Tax Summary)
- Accounting Export spec (for ADV-F02: Trial Balance, ADV-F03: Balance Sheet)
- @ant-design/charts or Recharts for chart visualizations
