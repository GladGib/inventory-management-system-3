# Batch Tracking

## Overview
Track inventory by batch/lot numbers for traceability and expiry management.

## Requirements

### BT-001: Enable Batch Tracking
- **Priority**: P1
- **Description**: Configure items for batch tracking
- **Acceptance Criteria**:
  - Toggle batch tracking per item
  - Require batch on stock in
  - Optional batch format template
  - Auto-generate batch numbers option

### BT-002: Batch Creation
- **Priority**: P1
- **Description**: Create batches on stock receipt
- **Acceptance Criteria**:
  - Assign batch number on purchase receive
  - Record manufacture date
  - Record expiry date
  - Track quantity per batch
  - Assign to warehouse

### BT-003: Batch Selection on Sale
- **Priority**: P1
- **Description**: Select batch when selling
- **Acceptance Criteria**:
  - FIFO recommendation
  - FEFO option (first expiry first out)
  - Manual batch selection
  - Show available qty per batch
  - Prevent overselling batch

### BT-004: Batch Traceability
- **Priority**: P1
- **Description**: Track batch through lifecycle
- **Acceptance Criteria**:
  - Full audit trail
  - Link to purchase (supplier)
  - Link to sales (customers)
  - Recall capability
  - Batch history report

### BT-005: Expiry Management
- **Priority**: P1
- **Description**: Monitor and alert on expiry
- **Acceptance Criteria**:
  - Expiry alerts (configurable days)
  - Near-expiry report
  - Expired stock report
  - Block sale of expired items
  - Expiry dashboard widget

### BT-006: Batch Adjustment
- **Priority**: P1
- **Description**: Adjust batch quantities
- **Acceptance Criteria**:
  - Stock count per batch
  - Batch-specific adjustments
  - Reason tracking
  - Value impact

## API Endpoints

```
GET  /api/items/:id/batches              - List batches for item
POST /api/items/:id/batches              - Create batch
GET  /api/batches/:id                    - Get batch details
PUT  /api/batches/:id                    - Update batch
GET  /api/batches/:id/history            - Batch transaction history
GET  /api/reports/batches/expiring       - Expiring batches
GET  /api/reports/batches/expired        - Expired batches
POST /api/inventory/adjustments/batch    - Batch adjustment
```

## Database Schema

```prisma
model Batch {
  id              String    @id @default(cuid())
  batchNumber     String
  itemId          String
  item            Item      @relation(fields: [itemId], references: [id])
  warehouseId     String
  warehouse       Warehouse @relation(fields: [warehouseId], references: [id])
  manufactureDate DateTime?
  expiryDate      DateTime?
  quantity        Decimal
  initialQuantity Decimal
  status          BatchStatus @default(ACTIVE)
  notes           String?
  purchaseReceiveId String?
  purchaseReceive PurchaseReceive? @relation(fields: [purchaseReceiveId], references: [id])
  supplierId      String?
  organizationId  String
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Unique constraint
  @@unique([itemId, warehouseId, batchNumber])

  // Relations
  transactions    BatchTransaction[]
}

model BatchTransaction {
  id              String   @id @default(cuid())
  batchId         String
  batch           Batch    @relation(fields: [batchId], references: [id])
  type            BatchTransactionType
  quantity        Decimal  // Positive for in, negative for out
  referenceType   String?  // SALE, PURCHASE, ADJUSTMENT, TRANSFER
  referenceId     String?
  notes           String?
  createdById     String
  createdAt       DateTime @default(now())
}

enum BatchStatus {
  ACTIVE
  EXPIRED
  DEPLETED
  RECALLED
}

enum BatchTransactionType {
  RECEIVE
  SALE
  ADJUSTMENT
  TRANSFER_IN
  TRANSFER_OUT
  RETURN
  WRITE_OFF
}
```

## Business Logic

```typescript
// FEFO (First Expiry First Out) selection
async function selectBatchesForSale(
  itemId: string,
  warehouseId: string,
  quantity: number,
  method: 'FIFO' | 'FEFO' = 'FEFO'
): Promise<BatchAllocation[]> {
  const batches = await getBatchesWithStock(itemId, warehouseId);

  // Sort by expiry date for FEFO, or creation date for FIFO
  batches.sort((a, b) => {
    if (method === 'FEFO') {
      return (a.expiryDate || Infinity) - (b.expiryDate || Infinity);
    }
    return a.createdAt - b.createdAt;
  });

  // Allocate from batches
  const allocations: BatchAllocation[] = [];
  let remaining = quantity;

  for (const batch of batches) {
    if (remaining <= 0) break;

    const allocate = Math.min(batch.quantity, remaining);
    allocations.push({ batchId: batch.id, quantity: allocate });
    remaining -= allocate;
  }

  return allocations;
}
```
