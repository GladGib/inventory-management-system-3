# Composite Items (Bill of Materials)

## Overview
Create bundled/kit items composed of multiple component items.

## Requirements

### CI-001: Create Composite Item
- **Priority**: P1
- **Description**: Define item as composite with components
- **Acceptance Criteria**:
  - Mark item as composite type
  - Add component items with quantities
  - Nested composites not allowed
  - Cost calculation from components
  - Selling price independent

### CI-002: Component Management
- **Priority**: P1
- **Description**: Manage bill of materials
- **Acceptance Criteria**:
  - Add/remove components
  - Specify quantity per component
  - Component substitutes (optional)
  - Version history of BOM
  - Import BOM from file

### CI-003: Stock Availability
- **Priority**: P1
- **Description**: Calculate available composite stock
- **Acceptance Criteria**:
  - Based on component availability
  - Limited by lowest component stock
  - Show limiting component
  - Multi-warehouse calculation
  - Real-time availability

### CI-004: Assembly (Build)
- **Priority**: P1
- **Description**: Assemble composites from components
- **Acceptance Criteria**:
  - Create assembly/build order
  - Consume component stock
  - Add composite to inventory
  - Track assembly cost
  - Assembly history

### CI-005: Disassembly (Unbundle)
- **Priority**: P2
- **Description**: Break down composite to components
- **Acceptance Criteria**:
  - Reverse of assembly
  - Return components to stock
  - Reduce composite stock
  - Track disassembly reason

### CI-006: Sell as Bundle
- **Priority**: P1
- **Description**: Sell composite items
- **Acceptance Criteria**:
  - Add to sales order
  - Auto-commit component stock
  - Option to assemble on sale
  - Show components on invoice (optional)

### CI-007: Pricing
- **Priority**: P1
- **Description**: Composite pricing options
- **Acceptance Criteria**:
  - Fixed selling price
  - Markup on component cost
  - Price list support
  - Component cost rollup

## API Endpoints

```
POST /api/items/composite              - Create composite item
PUT  /api/items/:id/bom                - Update BOM
GET  /api/items/:id/bom                - Get BOM
GET  /api/items/:id/bom/availability   - Check availability
POST /api/inventory/assembly           - Create assembly
GET  /api/inventory/assemblies         - List assemblies
POST /api/inventory/disassembly        - Disassemble
GET  /api/items/:id/bom/cost           - Calculate cost
```

## Database Schema

```prisma
model CompositeItem {
  id              String   @id @default(cuid())
  itemId          String   @unique
  item            Item     @relation(fields: [itemId], references: [id])
  assemblyMethod  AssemblyMethod @default(MANUAL)
  components      BOMComponent[]
  organizationId  String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model BOMComponent {
  id              String        @id @default(cuid())
  compositeItemId String
  compositeItem   CompositeItem @relation(fields: [compositeItemId], references: [id])
  componentItemId String
  componentItem   Item          @relation("ComponentItem", fields: [componentItemId], references: [id])
  quantity        Decimal
  notes           String?
  sortOrder       Int           @default(0)
}

model Assembly {
  id              String         @id @default(cuid())
  assemblyNumber  String         @unique
  compositeItemId String
  compositeItem   CompositeItem  @relation(fields: [compositeItemId], references: [id])
  quantity        Decimal
  warehouseId     String
  warehouse       Warehouse      @relation(fields: [warehouseId], references: [id])
  status          AssemblyStatus @default(DRAFT)
  assemblyDate    DateTime?
  totalCost       Decimal?
  notes           String?
  items           AssemblyItem[]
  organizationId  String
  createdById     String
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

model AssemblyItem {
  id              String   @id @default(cuid())
  assemblyId      String
  assembly        Assembly @relation(fields: [assemblyId], references: [id])
  itemId          String
  item            Item     @relation(fields: [itemId], references: [id])
  requiredQty     Decimal
  consumedQty     Decimal
  unitCost        Decimal
  totalCost       Decimal
}

enum AssemblyMethod {
  MANUAL          // Manually build
  ON_SALE         // Auto-build when sold
}

enum AssemblyStatus {
  DRAFT
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

## Business Logic

```typescript
// Calculate available composite quantity
async function calculateAvailableQuantity(
  compositeItemId: string,
  warehouseId: string
): Promise<{ available: number; limitingComponent: string }> {
  const composite = await getCompositeWithComponents(compositeItemId);
  let minAvailable = Infinity;
  let limitingComponent = '';

  for (const component of composite.components) {
    const stockLevel = await getStockLevel(
      component.componentItemId,
      warehouseId
    );
    const availableStock = stockLevel.stockOnHand - stockLevel.committedStock;
    const canMake = Math.floor(availableStock / component.quantity);

    if (canMake < minAvailable) {
      minAvailable = canMake;
      limitingComponent = component.componentItem.name;
    }
  }

  return {
    available: minAvailable === Infinity ? 0 : minAvailable,
    limitingComponent,
  };
}

// Calculate component cost
async function calculateComponentCost(compositeItemId: string): Promise<number> {
  const composite = await getCompositeWithComponents(compositeItemId);
  let totalCost = 0;

  for (const component of composite.components) {
    totalCost += Number(component.componentItem.costPrice) * Number(component.quantity);
  }

  return totalCost;
}
```
