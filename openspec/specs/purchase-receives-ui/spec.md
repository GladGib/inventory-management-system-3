# Purchase Receives UI

## Overview
Frontend interface for receiving goods against purchase orders.

## Requirements

### PR-001: Purchase Receives List
- **Priority**: P1
- **Description**: List page showing all purchase receives
- **Acceptance Criteria**:
  - Table with receive number, PO number, vendor, date, status
  - Filter by status, vendor, date range
  - Search by receive number or PO number
  - Receive Goods button (from PO)
  - Status badges (Draft, Received, Cancelled)

### PR-002: Receive Goods Form
- **Priority**: P1
- **Description**: Form to record goods receipt against PO
- **Acceptance Criteria**:
  - Select Purchase Order (unreceived/partially received)
  - Auto-populate pending items
  - Enter received quantities
  - Select receiving warehouse
  - Receive date
  - Record batch/lot numbers (if applicable)
  - Notes field
  - Over-receive warning

### PR-003: Purchase Receive Detail
- **Priority**: P1
- **Description**: View receive details
- **Acceptance Criteria**:
  - Receive header info
  - PO reference with link
  - Vendor information
  - Items table with ordered vs received
  - Warehouse location
  - Activity timeline

### PR-004: Partial Receives
- **Priority**: P1
- **Description**: Support partial receipt of PO items
- **Acceptance Criteria**:
  - Receive subset of ordered items
  - Track remaining to receive
  - Multiple receives per PO
  - PO status updates (Partially Received)

### PR-005: Stock Updates
- **Priority**: P1
- **Description**: Update stock levels on receive
- **Acceptance Criteria**:
  - Increase stock in receiving warehouse
  - Create stock movement record
  - Update item average cost
  - Trigger low stock alerts if applicable

## API Endpoints (Reference)

```
GET    /api/purchases/receives              - List receives
POST   /api/purchases/receives              - Create receive
GET    /api/purchases/receives/:id          - Get receive details
PUT    /api/purchases/receives/:id          - Update receive (draft only)
PUT    /api/purchases/receives/:id/confirm  - Confirm receive
PUT    /api/purchases/receives/:id/cancel   - Cancel receive
GET    /api/purchases/orders/:id/receivable - Get receivable items for PO
```

## UI Components

### PurchaseReceivesPage
```tsx
// /purchases/receives
- DataTable with receives
- Filters: status, vendor, dateRange
- "Receive Goods" dropdown (select from pending POs)
- Actions: view, edit (draft), confirm
```

### PurchaseReceiveForm
```tsx
interface PurchaseReceiveFormProps {
  purchaseOrderId?: string;
  receive?: PurchaseReceive;
  onSuccess: () => void;
}

// Form sections:
// 1. PO Selection (searchable dropdown)
// 2. Receive Details (date, warehouse)
// 3. Items to Receive (editable quantities)
// 4. Notes
```

### ReceiveItemsTable Component
```tsx
interface ReceiveItemsTableProps {
  poItems: PurchaseOrderItem[];
  receiveItems: ReceiveItem[];
  onChange: (items: ReceiveItem[]) => void;
}

// Columns:
// - Item (SKU, Name)
// - Ordered Qty
// - Already Received
// - Pending
// - Receiving Now (editable)
// - Warehouse (if multi-warehouse)
```

### PurchaseReceiveDetail Page
```tsx
// /purchases/receives/[id]
// Sections:
// - Header with status and actions
// - PO reference card
// - Vendor info
// - Items table (ordered vs received)
// - Warehouse info
// - Notes
// - Timeline
```

### POSelector Component
```tsx
interface POSelectorProps {
  vendorId?: string;
  value?: string;
  onChange: (poId: string) => void;
  filterStatus?: POStatus[];
}

// Shows only POs with pending items
// Displays: PO#, Vendor, Date, Items pending
```

## Navigation

```
Purchases
├── Purchase Orders
├── Purchase Receives  <-- Already exists, needs form
│   ├── List
│   ├── New (from PO)
│   └── [id] Detail
├── Bills
├── Payments Made
└── Vendor Credits
```

## Receive Flow

```
1. User goes to Purchase Receives
2. Clicks "Receive Goods"
3. Selects from list of POs with pending items
4. Form shows PO items with quantities
5. User enters received quantities
6. User selects warehouse
7. User confirms receive
8. Stock levels updated
9. PO status updated (Partially/Fully Received)
```

## Stock Movement Record

```prisma
// Created on receive confirmation
model StockMovement {
  id              String   @id @default(cuid())
  type            MovementType // PURCHASE_RECEIVE
  itemId          String
  warehouseId     String
  quantity        Decimal
  referenceType   String   // 'purchase_receive'
  referenceId     String   // purchaseReceiveId
  notes           String?
  createdAt       DateTime @default(now())
}
```
