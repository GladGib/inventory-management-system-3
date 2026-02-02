# Dashboard & Analytics

## Overview
Real-time dashboard with KPIs, charts, and actionable insights.

## Requirements

### DA-001: KPI Widgets
- **Priority**: P0
- **Description**: Key performance indicators
- **Acceptance Criteria**:
  - Total Sales (today/month)
  - Total Purchases
  - Receivables Outstanding
  - Payables Outstanding
  - Stock Value
  - Pending Orders
  - Comparison with previous period
  - Click-through to details

### DA-002: Sales Charts
- **Priority**: P0
- **Description**: Visual sales analytics
- **Acceptance Criteria**:
  - Sales trend (line chart)
  - Sales by category (pie/donut)
  - Top customers (bar chart)
  - Top products (bar chart)
  - Period selection (7d, 30d, 90d, YTD)

### DA-003: Inventory Widgets
- **Priority**: P0
- **Description**: Inventory status overview
- **Acceptance Criteria**:
  - Stock value by warehouse
  - Low stock alerts (list)
  - Out of stock count
  - Stock movement trend
  - Reorder suggestions

### DA-004: Pending Actions
- **Priority**: P0
- **Description**: Action items requiring attention
- **Acceptance Criteria**:
  - Pending approvals
  - Overdue invoices
  - Orders to ship
  - Bills to pay
  - Low stock items
  - Quick action buttons

### DA-005: Recent Activity
- **Priority**: P0
- **Description**: Activity feed
- **Acceptance Criteria**:
  - Recent transactions
  - User activity
  - System notifications
  - Filter by type
  - Pagination

### DA-006: Cash Flow Overview
- **Priority**: P1
- **Description**: Cash flow summary
- **Acceptance Criteria**:
  - Cash in (expected)
  - Cash out (expected)
  - Net cash flow
  - Receivables aging summary
  - Payables aging summary

### DA-007: Customizable Dashboard
- **Priority**: P2
- **Description**: User-configurable widgets
- **Acceptance Criteria**:
  - Drag and drop layout
  - Show/hide widgets
  - Widget size options
  - Save layout per user
  - Reset to default

## API Endpoints

```
GET /api/dashboard/kpis              - Get KPI data
GET /api/dashboard/sales-chart       - Sales trend data
GET /api/dashboard/top-customers     - Top customers
GET /api/dashboard/top-products      - Top products
GET /api/dashboard/inventory-status  - Inventory overview
GET /api/dashboard/pending-actions   - Action items
GET /api/dashboard/recent-activity   - Activity feed
GET /api/dashboard/cash-flow         - Cash flow data
PUT /api/dashboard/layout            - Save layout
```

## Response Format

```typescript
interface DashboardKPIs {
  sales: {
    today: number;
    thisMonth: number;
    previousMonth: number;
    changePercent: number;
  };
  purchases: {
    thisMonth: number;
    previousMonth: number;
    changePercent: number;
  };
  receivables: {
    total: number;
    overdue: number;
    overdueCount: number;
  };
  payables: {
    total: number;
    overdue: number;
    overdueCount: number;
  };
  inventory: {
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  orders: {
    pending: number;
    toShip: number;
    toInvoice: number;
  };
}

interface PendingAction {
  id: string;
  type: 'APPROVAL' | 'OVERDUE_INVOICE' | 'TO_SHIP' | 'TO_PAY' | 'LOW_STOCK';
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  actionUrl: string;
  createdAt: string;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  userId: string;
  userName: string;
  entityType: string;
  entityId: string;
  timestamp: string;
}
```

## Widget Layout Schema

```prisma
model DashboardLayout {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  layout          Json     // Widget positions and visibility
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```
