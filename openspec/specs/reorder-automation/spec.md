# Reorder Automation

## Overview
Automated inventory replenishment based on reorder points and demand forecasting.

## Requirements

### RA-001: Reorder Point Configuration
- **Priority**: P1
- **Description**: Set reorder levels per item
- **Acceptance Criteria**:
  - Reorder level (minimum stock)
  - Reorder quantity (how much to order)
  - Per-warehouse configuration
  - Lead time days
  - Safety stock buffer

### RA-002: Low Stock Alerts
- **Priority**: P0
- **Description**: Alert when stock falls below reorder point
- **Acceptance Criteria**:
  - Real-time monitoring
  - Email notifications
  - In-app notifications
  - Dashboard widget
  - Configurable thresholds

### RA-003: Auto-Generate PO
- **Priority**: P1
- **Description**: Automatically create purchase orders
- **Acceptance Criteria**:
  - Trigger on reorder point
  - Select preferred vendor
  - Calculate optimal quantity
  - Create draft PO for review
  - Optional auto-submit

### RA-004: Reorder Suggestions
- **Priority**: P1
- **Description**: Smart reorder recommendations
- **Acceptance Criteria**:
  - List items to reorder
  - Suggested quantities
  - Vendor suggestions
  - Lead time consideration
  - Bulk PO creation

### RA-005: Demand Forecasting
- **Priority**: P2
- **Description**: Predict future demand
- **Acceptance Criteria**:
  - Historical sales analysis
  - Seasonal patterns
  - Trend detection
  - Forecast-based reorder
  - Manual adjustments

### RA-006: Vendor Management
- **Priority**: P1
- **Description**: Preferred vendor per item
- **Acceptance Criteria**:
  - Set preferred vendor
  - Vendor pricing history
  - Multiple vendor options
  - Lead time tracking
  - Minimum order quantities

### RA-007: Reorder Report
- **Priority**: P1
- **Description**: Track reorder activity
- **Acceptance Criteria**:
  - Items below reorder point
  - Pending reorders
  - Reorder history
  - Stock coverage days
  - Export functionality

## API Endpoints

```
GET  /api/inventory/reorder-suggestions   - Get reorder suggestions
POST /api/inventory/reorder-settings      - Update reorder settings
GET  /api/inventory/reorder-settings      - Get reorder settings
POST /api/inventory/auto-reorder          - Trigger auto reorder
GET  /api/inventory/low-stock-alerts      - Get low stock items
PUT  /api/items/:id/reorder-settings      - Update item reorder settings
GET  /api/reports/reorder                 - Reorder report
POST /api/inventory/bulk-po               - Create bulk PO from suggestions
```

## Database Schema

```prisma
model ItemReorderSettings {
  id              String   @id @default(cuid())
  itemId          String
  item            Item     @relation(fields: [itemId], references: [id])
  warehouseId     String?  // Null = all warehouses
  warehouse       Warehouse? @relation(fields: [warehouseId], references: [id])
  reorderLevel    Decimal
  reorderQuantity Decimal
  safetyStock     Decimal  @default(0)
  leadTimeDays    Int      @default(0)
  preferredVendorId String?
  preferredVendor Contact? @relation(fields: [preferredVendorId], references: [id])
  autoReorder     Boolean  @default(false)
  isActive        Boolean  @default(true)
  organizationId  String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([itemId, warehouseId])
}

model ReorderAlert {
  id              String       @id @default(cuid())
  itemId          String
  item            Item         @relation(fields: [itemId], references: [id])
  warehouseId     String
  warehouse       Warehouse    @relation(fields: [warehouseId], references: [id])
  currentStock    Decimal
  reorderLevel    Decimal
  suggestedQty    Decimal
  status          AlertStatus  @default(PENDING)
  purchaseOrderId String?      // If PO created
  purchaseOrder   PurchaseOrder? @relation(fields: [purchaseOrderId], references: [id])
  notifiedAt      DateTime?
  resolvedAt      DateTime?
  organizationId  String
  createdAt       DateTime     @default(now())
}

model DemandForecast {
  id              String   @id @default(cuid())
  itemId          String
  item            Item     @relation(fields: [itemId], references: [id])
  warehouseId     String?
  period          DateTime // Month
  forecastQty     Decimal
  actualQty       Decimal?
  variance        Decimal?
  confidence      Decimal? // 0-1
  method          ForecastMethod
  organizationId  String
  createdAt       DateTime @default(now())
}

enum AlertStatus {
  PENDING
  ACKNOWLEDGED
  PO_CREATED
  RESOLVED
  IGNORED
}

enum ForecastMethod {
  MOVING_AVERAGE
  EXPONENTIAL_SMOOTHING
  SEASONAL
  MANUAL
}
```

## Business Logic

```typescript
// Check and create reorder alerts
async function checkReorderPoints(organizationId: string): Promise<void> {
  const items = await getItemsWithReorderSettings(organizationId);

  for (const item of items) {
    for (const setting of item.reorderSettings) {
      const stockLevel = await getStockLevel(
        item.id,
        setting.warehouseId
      );

      const availableStock = stockLevel.stockOnHand - stockLevel.committedStock;

      if (availableStock <= setting.reorderLevel) {
        // Create or update alert
        await createReorderAlert({
          itemId: item.id,
          warehouseId: setting.warehouseId,
          currentStock: availableStock,
          reorderLevel: setting.reorderLevel,
          suggestedQty: calculateReorderQuantity(setting, stockLevel),
        });

        // Send notification
        await notifyLowStock(item, setting, availableStock);

        // Auto-create PO if enabled
        if (setting.autoReorder && setting.preferredVendorId) {
          await createAutoPurchaseOrder(item, setting);
        }
      }
    }
  }
}

// Calculate optimal reorder quantity
function calculateReorderQuantity(
  setting: ReorderSettings,
  stockLevel: StockLevel
): number {
  const currentStock = Number(stockLevel.stockOnHand) - Number(stockLevel.committedStock);
  const targetStock = Number(setting.reorderLevel) + Number(setting.safetyStock);
  const deficit = targetStock - currentStock;

  // At minimum, order the reorder quantity
  return Math.max(deficit, Number(setting.reorderQuantity));
}

// Simple demand forecasting (moving average)
async function forecastDemand(
  itemId: string,
  periods: number = 3
): Promise<number> {
  const sales = await getSalesHistory(itemId, periods);
  const total = sales.reduce((sum, s) => sum + s.quantity, 0);
  return total / periods;
}
```

## Notification Templates

```typescript
// Low stock email template
const lowStockEmail = {
  subject: 'Low Stock Alert: {{itemName}} ({{sku}})',
  body: `
    The following item has fallen below its reorder point:

    Item: {{itemName}}
    SKU: {{sku}}
    Warehouse: {{warehouseName}}
    Current Stock: {{currentStock}}
    Reorder Level: {{reorderLevel}}
    Suggested Order Qty: {{suggestedQty}}

    Click here to create a purchase order: {{poLink}}
  `,
};
```
