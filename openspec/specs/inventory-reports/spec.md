# Inventory Reports

## Overview
Comprehensive inventory reporting for stock management and analysis.

## Requirements

### IR-001: Stock Summary Report
- **Priority**: P0
- **Description**: Overall inventory position
- **Acceptance Criteria**:
  - Total items in inventory
  - Total stock value (at cost)
  - Stock by warehouse
  - Stock by category
  - Low stock alerts count

### IR-002: Stock Level Report
- **Priority**: P0
- **Description**: Detailed stock levels
- **Acceptance Criteria**:
  - Stock on hand per item/warehouse
  - Committed stock
  - Available stock
  - Reorder level comparison
  - Filter by warehouse/category

### IR-003: Low Stock Report
- **Priority**: P0
- **Description**: Items below reorder level
- **Acceptance Criteria**:
  - Items at or below reorder point
  - Quantity to reorder
  - Supplier information
  - Last purchase price
  - Suggested PO creation

### IR-004: Stock Valuation Report
- **Priority**: P0
- **Description**: Inventory value analysis
- **Acceptance Criteria**:
  - Valuation methods (FIFO, Weighted Average)
  - Cost value per item
  - Total inventory value
  - Category breakdown
  - Warehouse breakdown

### IR-005: Stock Aging Report
- **Priority**: P1
- **Description**: Inventory aging analysis
- **Acceptance Criteria**:
  - Age buckets (0-30, 31-60, 61-90, 90+)
  - Slow-moving items
  - Dead stock identification
  - Aging by category
  - Turnover rate

### IR-006: Stock Movement Report
- **Priority**: P0
- **Description**: Track stock transactions
- **Acceptance Criteria**:
  - All movements (in/out)
  - Movement types (sale, purchase, adjustment, transfer)
  - Date range filter
  - Item-specific history
  - Running balance

### IR-007: Inventory Turnover Report
- **Priority**: P1
- **Description**: Stock turnover analysis
- **Acceptance Criteria**:
  - Turnover ratio calculation
  - Days inventory outstanding
  - Category comparison
  - Trend analysis
  - Optimization recommendations

### IR-008: Stock Adjustment Report
- **Priority**: P0
- **Description**: History of adjustments
- **Acceptance Criteria**:
  - All adjustments by date
  - Reason code analysis
  - User who made adjustment
  - Value impact
  - Audit trail

## API Endpoints

```
GET /api/reports/inventory/summary        - Stock summary
GET /api/reports/inventory/levels         - Stock levels
GET /api/reports/inventory/low-stock      - Low stock
GET /api/reports/inventory/valuation      - Valuation
GET /api/reports/inventory/aging          - Aging analysis
GET /api/reports/inventory/movement       - Stock movement
GET /api/reports/inventory/turnover       - Turnover analysis
GET /api/reports/inventory/adjustments    - Adjustment history
GET /api/reports/inventory/export         - Export report
```

## Response Format

```typescript
interface StockSummaryReport {
  summary: {
    totalItems: number;
    totalSKUs: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  byWarehouse: {
    warehouseId: string;
    warehouseName: string;
    itemCount: number;
    totalValue: number;
  }[];
  byCategory: {
    categoryId: string;
    categoryName: string;
    itemCount: number;
    totalValue: number;
  }[];
  alerts: {
    lowStock: ItemAlert[];
    outOfStock: ItemAlert[];
    overstock: ItemAlert[];
  };
}

interface StockMovementReport {
  movements: {
    date: string;
    itemId: string;
    itemName: string;
    sku: string;
    warehouseId: string;
    warehouseName: string;
    type: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT';
    reference: string;
    quantity: number;
    balance: number;
    unitCost: number;
    totalValue: number;
  }[];
  totals: {
    totalIn: number;
    totalOut: number;
    netMovement: number;
  };
}
```
