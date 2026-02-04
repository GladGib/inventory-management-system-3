# Item Groups/Variants UI

## Overview
Frontend interface for managing item groups with variants (size, color, grade, etc.).

## Requirements

### IG-001: Item Groups List Page
- **Priority**: P1
- **Description**: List page showing all item groups
- **Acceptance Criteria**:
  - Table with group name, attributes, item count
  - Search by group name
  - Create new group button
  - Edit/Delete actions
  - Click to view group details

### IG-002: Create Item Group
- **Priority**: P1
- **Description**: Form to create item group with variants
- **Acceptance Criteria**:
  - Group name and description
  - Define attribute types (Size, Color, Grade, etc.)
  - Define attribute values per type
  - Auto-generate variant SKUs
  - Set base pricing

### IG-003: Item Group Detail Page
- **Priority**: P1
- **Description**: View and manage group variants
- **Acceptance Criteria**:
  - Group info header
  - Variants table with attribute values
  - Individual variant pricing override
  - Stock levels per variant
  - Add/Remove variants

### IG-004: Variant Matrix
- **Priority**: P1
- **Description**: Matrix view for managing variants
- **Acceptance Criteria**:
  - Grid showing all attribute combinations
  - Bulk edit pricing
  - Enable/disable specific combinations
  - Generate missing variants

### IG-005: Item Group Selection
- **Priority**: P1
- **Description**: Select items from groups in transactions
- **Acceptance Criteria**:
  - Show group items in item selector
  - Filter by attribute values
  - Quick variant picker popup
  - Display variant attributes in line items

## Database Schema (Reference from existing spec)

```prisma
model ItemGroup {
  id              String   @id @default(cuid())
  name            String
  description     String?
  attributes      Json     // [{name: "Size", values: ["S","M","L"]}, ...]
  organizationId  String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  items           Item[]

  @@index([organizationId])
}

// Update Item model
model Item {
  // ... existing fields
  itemGroupId     String?
  itemGroup       ItemGroup? @relation(fields: [itemGroupId], references: [id])
  variantAttributes Json?   // {Size: "M", Color: "Red"}
}
```

## API Endpoints

```
GET    /api/item-groups              - List item groups
POST   /api/item-groups              - Create item group
GET    /api/item-groups/:id          - Get item group with variants
PUT    /api/item-groups/:id          - Update item group
DELETE /api/item-groups/:id          - Delete item group
POST   /api/item-groups/:id/variants - Add variant to group
DELETE /api/item-groups/:id/variants/:variantId - Remove variant
PUT    /api/item-groups/:id/variants/bulk - Bulk update variants
```

## UI Components

### ItemGroupsPage
```tsx
// /items/groups
- DataTable with groups
- Filters: search
- Actions: view, edit, delete
```

### ItemGroupForm
```tsx
interface ItemGroupFormProps {
  group?: ItemGroup;
  onSuccess: () => void;
  onCancel: () => void;
}

// Form sections:
// 1. Basic Info (name, description)
// 2. Attributes Builder (dynamic add/remove)
// 3. Variant Generator (auto-generate from attributes)
```

### AttributeBuilder Component
```tsx
interface AttributeBuilderProps {
  attributes: Attribute[];
  onChange: (attributes: Attribute[]) => void;
}

interface Attribute {
  name: string;
  values: string[];
}
```

### VariantMatrix Component
```tsx
interface VariantMatrixProps {
  group: ItemGroup;
  variants: Item[];
  onUpdate: (variantId: string, data: Partial<Item>) => void;
  onToggle: (variantId: string, enabled: boolean) => void;
}
```

### VariantPicker Component
```tsx
interface VariantPickerProps {
  groupId: string;
  onSelect: (item: Item) => void;
}

// Renders attribute dropdowns to narrow down variant
// Shows matching variant details
// Add to cart/document button
```

## Variant SKU Generation

```typescript
// Example: Base SKU "TSHIRT" with Size (S,M,L) and Color (Red,Blue)
// Generated SKUs:
// TSHIRT-S-RED
// TSHIRT-S-BLUE
// TSHIRT-M-RED
// TSHIRT-M-BLUE
// TSHIRT-L-RED
// TSHIRT-L-BLUE

function generateVariantSku(baseSku: string, attributes: Record<string, string>): string {
  const suffix = Object.values(attributes).join('-').toUpperCase();
  return `${baseSku}-${suffix}`;
}
```

## Navigation

```
Items
├── All Items
├── Item Groups    <-- New page
│   ├── List
│   └── [id] Detail
└── Composite Items
```
