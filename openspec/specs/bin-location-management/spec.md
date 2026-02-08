# Bin/Location Management within Warehouses

## Overview
Granular storage location management within warehouses using zones and bins. Enables precise tracking of item placement, guided put-away, and pick operations for Malaysian auto parts, hardware, and spare parts wholesalers.

## Requirements

### BIN-001: Warehouse Zones
- **Priority**: P1
- **Description**: Create and manage logical zones within a warehouse
- **Acceptance Criteria**:
  - Create zones under a warehouse (e.g., "Zone A - Fast Moving", "Zone B - Bulk Storage")
  - Each zone has a unique name within its warehouse
  - Optional description for zone purpose
  - Zones are scoped to organization (multi-tenant)
  - List all zones for a warehouse
  - Update zone name and description
  - Delete zone only when no bins exist within it

### BIN-002: Bin Management
- **Priority**: P1
- **Description**: Create and manage individual storage bins within zones
- **Acceptance Criteria**:
  - Create bins with unique code within a warehouse (e.g., "A-01-01", "B-03-02")
  - Assign bin to a zone (required)
  - Bin types: STORAGE, PICKING, RECEIVING, SHIPPING
  - Set maximum capacity (optional, for occupancy tracking)
  - Track current occupancy (derived from BinStock quantities)
  - Active/inactive toggle (inactive bins excluded from suggestions)
  - Bulk create bins with pattern (e.g., "A-01-01" through "A-01-20")
  - Delete bin only when no stock exists within it

### BIN-003: Bin Stock Tracking
- **Priority**: P1
- **Description**: Track item quantities at bin level
- **Acceptance Criteria**:
  - Record item quantity per bin
  - Support batch tracking: same item with different batches in same bin
  - Support serial number tracking: individual serial numbers assigned to bins
  - Unique constraint on (binId, itemId, batchId) to prevent duplicate records
  - View all stock in a specific bin
  - View all bins containing a specific item
  - Bin stock quantities must reconcile with warehouse-level StockLevel

### BIN-004: Put-Away Operation
- **Priority**: P1
- **Description**: Place received items into specific bins
- **Acceptance Criteria**:
  - Select items to put away (from purchase receive or adjustment)
  - Select target bin
  - Specify quantity
  - Validate bin capacity (if maxCapacity is set)
  - Create/update BinStock record
  - Update bin currentOccupancy
  - Record put-away in stock movement history
  - Support partial put-away (put some items in one bin, rest in another)

### BIN-005: Pick Operation
- **Priority**: P1
- **Description**: Remove items from specific bins for orders
- **Acceptance Criteria**:
  - Select items to pick (from sales order or adjustment)
  - Select source bin
  - Specify quantity
  - Validate sufficient stock in bin
  - Decrease BinStock quantity (remove record if quantity reaches 0)
  - Update bin currentOccupancy
  - Record pick in stock movement history
  - Support multi-bin picking (pick partial from one bin, rest from another)

### BIN-006: Bin Suggestion Engine
- **Priority**: P2
- **Description**: Suggest optimal bin for put-away based on rules
- **Acceptance Criteria**:
  - Suggest bins that already contain the same item (consolidation preference)
  - Prefer bins in the zone associated with the item's category
  - Exclude inactive bins
  - Exclude bins at maximum capacity
  - Prefer STORAGE type bins for put-away
  - Prefer PICKING type bins when stock is needed for orders
  - Return ranked list of suggested bins with reason
  - Configurable rules per warehouse (future enhancement)

### BIN-007: Bin Visual Grid Layout
- **Priority**: P2
- **Description**: Visual representation of warehouse bin layout
- **Acceptance Criteria**:
  - Grid-based layout showing bins organized by zone
  - Color coding by occupancy level (empty, partial, full)
  - Color coding by bin type
  - Click bin to view stock details
  - Hover tooltip showing bin code, type, and occupancy percentage
  - Filter by zone
  - Search by bin code or item name
  - Responsive grid that adapts to screen size

### BIN-008: Bin Selector Component
- **Priority**: P1
- **Description**: Reusable bin selection component for forms
- **Acceptance Criteria**:
  - Dropdown/modal for selecting a bin
  - Filter by warehouse (required)
  - Filter by zone (optional)
  - Show bin code, zone, type, and current occupancy
  - Highlight bins containing the selected item
  - Show suggested bins at top of list
  - Used in: stock adjustments, inventory transfers, purchase receives
  - Searchable by bin code

## Database Schema

```prisma
model WarehouseZone {
  id             String   @id @default(cuid())
  warehouseId    String
  name           String
  description    String?
  organizationId String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  warehouse Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  bins      Bin[]

  @@unique([warehouseId, name])
  @@index([warehouseId])
  @@index([organizationId])
}

model Bin {
  id               String   @id @default(cuid())
  warehouseZoneId  String
  warehouseId      String
  code             String
  name             String?
  type             BinType  @default(STORAGE)
  maxCapacity      Decimal? @db.Decimal(15, 4)
  currentOccupancy Decimal  @default(0) @db.Decimal(15, 4)
  isActive         Boolean  @default(true)
  organizationId   String
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // Relations
  warehouseZone WarehouseZone @relation(fields: [warehouseZoneId], references: [id], onDelete: Cascade)
  warehouse     Warehouse     @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  binStock      BinStock[]

  @@unique([warehouseId, code])
  @@index([warehouseZoneId])
  @@index([warehouseId])
  @@index([organizationId])
  @@index([type])
  @@index([isActive])
}

model BinStock {
  id             String  @id @default(cuid())
  binId          String
  itemId         String
  quantity       Decimal @db.Decimal(15, 4)
  batchId        String?
  serialNumberId String?
  organizationId String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  bin          Bin           @relation(fields: [binId], references: [id], onDelete: Cascade)
  item         Item          @relation(fields: [itemId], references: [id])
  batch        Batch?        @relation(fields: [batchId], references: [id])
  serialNumber SerialNumber? @relation(fields: [serialNumberId], references: [id])

  @@unique([binId, itemId, batchId])
  @@index([binId])
  @@index([itemId])
  @@index([organizationId])
}

enum BinType {
  STORAGE
  PICKING
  RECEIVING
  SHIPPING
}
```

### Schema Changes to Existing Models

```prisma
// Add to Warehouse model:
model Warehouse {
  // ... existing fields ...
  zones Bin[]           // Add relation
  bins  WarehouseZone[] // Add relation
}

// Add to Item model:
model Item {
  // ... existing fields ...
  binStock BinStock[] // Add relation
}

// Add to Batch model:
model Batch {
  // ... existing fields ...
  binStock BinStock[] // Add relation
}

// Add to SerialNumber model:
model SerialNumber {
  // ... existing fields ...
  binStock BinStock[] // Add relation
}
```

## API Endpoints

```
# Zone Management
GET    /api/warehouses/:warehouseId/zones              - List zones for a warehouse
POST   /api/warehouses/:warehouseId/zones              - Create zone
GET    /api/warehouses/:warehouseId/zones/:zoneId      - Get zone details
PUT    /api/warehouses/:warehouseId/zones/:zoneId      - Update zone
DELETE /api/warehouses/:warehouseId/zones/:zoneId      - Delete zone (if empty)

# Bin Management
GET    /api/warehouses/:warehouseId/bins               - List bins (filterable by zone, type, active status)
POST   /api/warehouses/:warehouseId/bins               - Create bin
POST   /api/warehouses/:warehouseId/bins/bulk          - Bulk create bins with pattern
GET    /api/warehouses/:warehouseId/bins/:binId        - Get bin details
PUT    /api/warehouses/:warehouseId/bins/:binId        - Update bin
DELETE /api/warehouses/:warehouseId/bins/:binId        - Delete bin (if empty)

# Bin Stock Operations
GET    /api/warehouses/:warehouseId/bins/:binId/stock  - Get stock in a specific bin
POST   /api/bins/put-away                              - Put away items into bins
POST   /api/bins/pick                                  - Pick items from bins

# Bin Suggestions
GET    /api/bins/suggest                               - Suggest bins (query: itemId, warehouseId)
```

### Request/Response Schemas

```typescript
// POST /api/warehouses/:warehouseId/zones
interface CreateZoneRequest {
  name: string;
  description?: string;
}

// POST /api/warehouses/:warehouseId/bins
interface CreateBinRequest {
  warehouseZoneId: string;
  code: string;
  name?: string;
  type: 'STORAGE' | 'PICKING' | 'RECEIVING' | 'SHIPPING';
  maxCapacity?: number;
}

// POST /api/warehouses/:warehouseId/bins/bulk
interface BulkCreateBinsRequest {
  warehouseZoneId: string;
  prefix: string;        // e.g., "A-01-"
  startNumber: number;   // e.g., 1
  endNumber: number;     // e.g., 20
  type: 'STORAGE' | 'PICKING' | 'RECEIVING' | 'SHIPPING';
  maxCapacity?: number;
}

// POST /api/bins/put-away
interface PutAwayRequest {
  warehouseId: string;
  items: {
    itemId: string;
    binId: string;
    quantity: number;
    batchId?: string;
    serialNumberId?: string;
  }[];
  referenceType?: string; // 'PURCHASE_RECEIVE', 'ADJUSTMENT'
  referenceId?: string;
}

// POST /api/bins/pick
interface PickRequest {
  warehouseId: string;
  items: {
    itemId: string;
    binId: string;
    quantity: number;
    batchId?: string;
    serialNumberId?: string;
  }[];
  referenceType?: string; // 'SALES_ORDER', 'ADJUSTMENT'
  referenceId?: string;
}

// GET /api/bins/suggest?itemId=xxx&warehouseId=xxx
interface BinSuggestionResponse {
  suggestions: {
    binId: string;
    binCode: string;
    zoneName: string;
    type: string;
    currentOccupancy: number;
    maxCapacity: number | null;
    availableCapacity: number | null;
    existingItemQty: number; // Qty of same item already in bin
    reason: string; // "Same item already stored", "Matching zone for category", "Available capacity"
    score: number;  // Ranking score (higher is better)
  }[];
}
```

### Query Parameters

```typescript
// GET /api/warehouses/:warehouseId/bins
interface ListBinsQuery {
  zoneId?: string;
  type?: 'STORAGE' | 'PICKING' | 'RECEIVING' | 'SHIPPING';
  isActive?: boolean;
  search?: string;     // Search by bin code or name
  page?: number;
  limit?: number;
}

// GET /api/warehouses/:warehouseId/bins/:binId/stock
interface BinStockQuery {
  itemId?: string;     // Filter by specific item
  page?: number;
  limit?: number;
}
```

## Frontend Pages

### Page Structure

```
apps/web/app/(dashboard)/inventory/warehouses/[id]/bins/
├── page.tsx                    # Bin grid layout + list view
├── components/
│   ├── BinGrid.tsx             # Visual grid layout
│   ├── BinCard.tsx             # Individual bin in grid
│   ├── BinStockDrawer.tsx      # Drawer showing bin stock details
│   ├── BinFormModal.tsx        # Create/edit bin modal
│   ├── ZoneFormModal.tsx       # Create/edit zone modal
│   ├── BulkCreateModal.tsx     # Bulk bin creation modal
│   ├── PutAwayModal.tsx        # Put-away operation modal
│   └── PickModal.tsx           # Pick operation modal

apps/web/components/
├── BinSelector.tsx             # Reusable bin selector for forms
└── BinStockView.tsx            # Reusable bin stock breakdown view
```

### /inventory/warehouses/[id]/bins Page

```tsx
// Page layout:
// - Breadcrumb: Inventory > Warehouses > {Warehouse Name} > Bins
// - Header: warehouse name, zone count, bin count
// - Toolbar: Add Zone button, Add Bin button, Bulk Create button, view toggle (grid/list)
// - Zone filter tabs
// - Main content: BinGrid or Ant Design Table depending on view mode
// - Grid view: color-coded bins organized by zone
// - List view: Table with columns: Code, Zone, Type, Capacity, Occupancy, Status, Actions
// - Click bin -> BinStockDrawer opens showing item breakdown
// - Actions: Edit, Deactivate/Activate, Delete (if empty)

interface BinGridProps {
  warehouseId: string;
  zones: WarehouseZone[];
  bins: Bin[];
  onBinClick: (bin: Bin) => void;
  selectedZoneId?: string;
}

// Color coding:
// - Empty (0%): light gray (#f0f0f0)
// - Low (1-30%): green (#95de64)
// - Medium (31-70%): blue (#69b1ff)
// - High (71-90%): orange (#ffc069)
// - Full (91-100%): red (#ff7875)
// - Inactive: striped pattern overlay
```

### BinSelector Component

```tsx
interface BinSelectorProps {
  warehouseId: string;
  itemId?: string;        // Used for suggestion highlighting
  value?: string;         // Selected bin ID
  onChange: (binId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  filterType?: BinType;   // Pre-filter by bin type
  showSuggestions?: boolean; // Show suggested bins section
}

// Renders as Ant Design Select with:
// - Grouped options by zone
// - Each option shows: bin code, type badge, occupancy bar
// - Suggested bins section at top (if itemId provided and showSuggestions=true)
// - Search by bin code
// - Filter by zone via dropdown filter
```

### BinStockDrawer

```tsx
// Ant Design Drawer that opens from right side
// Shows:
// - Bin code, zone, type as header
// - Occupancy progress bar (current/max)
// - Table of items in bin:
//   - Item name, SKU
//   - Quantity
//   - Batch number (if applicable)
//   - Serial number (if applicable)
// - Actions: Put Away, Pick buttons
// - Quick transfer: move stock from this bin to another
```

## Hooks

```typescript
// apps/web/hooks/use-bins.ts

export function useWarehouseZones(warehouseId: string);
export function useCreateZone(warehouseId: string);
export function useUpdateZone(warehouseId: string);
export function useDeleteZone(warehouseId: string);

export function useWarehouseBins(warehouseId: string, filters?: ListBinsQuery);
export function useCreateBin(warehouseId: string);
export function useBulkCreateBins(warehouseId: string);
export function useUpdateBin(warehouseId: string);
export function useDeleteBin(warehouseId: string);

export function useBinStock(warehouseId: string, binId: string);
export function usePutAway();
export function usePick();
export function useBinSuggestions(itemId: string, warehouseId: string);
```

## Business Logic

### Put-Away Validation
1. Verify bin belongs to the specified warehouse
2. Verify bin is active
3. Verify item exists and belongs to the organization
4. If maxCapacity is set, verify adding quantity does not exceed capacity
5. If batch tracking enabled for item, batchId is required
6. If serial tracking enabled for item, serialNumberId is required
7. Create/update BinStock record
8. Update Bin.currentOccupancy (SUM of all BinStock quantities for that bin)

### Pick Validation
1. Verify bin belongs to the specified warehouse
2. Verify BinStock record exists for the item/bin/batch combination
3. Verify sufficient quantity in bin
4. Decrease BinStock.quantity (delete record if it reaches 0)
5. Update Bin.currentOccupancy
6. If serial tracking, update SerialNumber warehouse/status

### Bin Suggestion Algorithm
```typescript
function suggestBins(itemId: string, warehouseId: string): BinSuggestion[] {
  // 1. Get all active bins in warehouse with available capacity
  // 2. Score each bin:
  //    - +50 points: bin already contains the same item (consolidation)
  //    - +30 points: bin zone matches item category zone mapping
  //    - +20 points: bin type is STORAGE (for put-away)
  //    - +10 points: bin is less than 50% full (space preference)
  //    - -10 points: bin is more than 80% full
  //    - -100 points: bin is at max capacity (excluded)
  // 3. Sort by score descending
  // 4. Return top 10 suggestions
}
```

## NestJS Module Structure

```
apps/api/src/modules/bins/
├── bins.module.ts
├── bins.controller.ts         # Bin CRUD + put-away/pick endpoints
├── bins.service.ts            # Core bin management logic
├── zones.controller.ts        # Zone CRUD endpoints
├── zones.service.ts           # Zone management logic
├── bin-stock.service.ts       # Stock tracking at bin level
├── bin-suggestion.service.ts  # Suggestion engine
├── dto/
│   ├── create-zone.dto.ts
│   ├── update-zone.dto.ts
│   ├── create-bin.dto.ts
│   ├── update-bin.dto.ts
│   ├── bulk-create-bins.dto.ts
│   ├── put-away.dto.ts
│   └── pick.dto.ts
└── tests/
    ├── bins.controller.spec.ts
    ├── bins.service.spec.ts
    └── bin-suggestion.service.spec.ts
```

## Dependencies
- Existing Warehouse module (parent relationship)
- Existing Item module (stock references)
- Existing Batch module (batch tracking integration)
- Existing SerialNumber module (serial tracking integration)
- Existing StockLevel model (bin quantities must reconcile with warehouse totals)
