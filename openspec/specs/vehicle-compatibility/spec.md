# Vehicle Compatibility

## Overview
Track which auto parts are compatible with which vehicles. Auto parts wholesalers need structured vehicle fitment data so counter staff and customers can find the right part by specifying make, model, and year. This replaces the unstructured `vehicleModels` String[] currently on the Item model with a normalized, searchable data structure.

## Scope
- **In Scope**: VehicleMake, VehicleModel, VehicleYear models; ItemVehicleCompatibility junction model; cascading make/model/year selectors; vehicle-based item search; settings page for managing vehicle data
- **Out of Scope**: Engine/transmission sub-variants, VIN-based lookup, integration with external fitment databases (ACES/PIES)

## Requirements

### VC-001: Vehicle Make/Model Data Models
- **Priority**: P0
- **Description**: Normalized vehicle reference data with make, model, and year range
- **Acceptance Criteria**:
  - VehicleMake model (id, name, country, logoUrl, status)
  - VehicleModel model (id, makeId, name, category, status)
  - Both are organization-scoped so each org manages its own vehicle list
  - Vehicle model category: SEDAN, SUV, TRUCK, VAN, MOTORCYCLE, COMMERCIAL, OTHER
  - Pre-seed common Malaysian market makes: Perodua, Proton, Toyota, Honda, Nissan, Mitsubishi, Mazda, Hyundai, Kia, Suzuki, Isuzu, Hino, Mercedes-Benz, BMW
  - Sortable and searchable

### VC-002: Item Vehicle Compatibility Model
- **Priority**: P0
- **Description**: Junction model linking items to vehicle fitment
- **Acceptance Criteria**:
  - ItemVehicleCompatibility: id, itemId, vehicleMakeId, vehicleModelId (optional), yearFrom (optional), yearTo (optional), engineType (optional), notes, organizationId
  - vehicleModelId is optional to support make-level compatibility (e.g., "fits all Toyota")
  - yearFrom/yearTo define the year range (inclusive)
  - engineType is a free-text field for specifics (e.g., "1.5L DOHC", "2.0T")
  - notes for additional fitment notes
  - An item can have many compatibility entries
  - A vehicle can be compatible with many items

### VC-003: Vehicle Make/Model CRUD API
- **Priority**: P0
- **Description**: Full CRUD for managing vehicle reference data
- **Acceptance Criteria**:
  - GET /vehicles/makes - list all makes (with search, pagination)
  - POST /vehicles/makes - create make
  - PUT /vehicles/makes/:id - update make
  - DELETE /vehicles/makes/:id - delete make (only if no compatibility records reference it)
  - GET /vehicles/makes/:id/models - list models for a make
  - POST /vehicles/makes/:id/models - create model under a make
  - PUT /vehicles/models/:id - update model
  - DELETE /vehicles/models/:id - delete model (only if no compatibility records reference it)
  - Organization-scoped

### VC-004: Item Compatibility CRUD API
- **Priority**: P0
- **Description**: API for managing item-vehicle compatibility
- **Acceptance Criteria**:
  - GET /items/:id/compatibility - list vehicle compatibility for an item
  - POST /items/:id/compatibility - add compatibility entry
  - PUT /items/compatibility/:id - update compatibility entry
  - DELETE /items/compatibility/:id - remove compatibility entry
  - Validate that makeId exists, modelId (if provided) belongs to that make
  - yearFrom <= yearTo validation
  - Organization-scoped

### VC-005: Vehicle-Based Item Search API
- **Priority**: P0
- **Description**: Find compatible parts by specifying a vehicle
- **Acceptance Criteria**:
  - GET /items/search/by-vehicle?makeId=&modelId=&year=
  - makeId required; modelId and year optional
  - When only makeId provided: return items compatible with any model of that make, or with make-level compatibility
  - When modelId provided: return items compatible with that specific model (or the parent make)
  - When year provided: filter to items whose yearFrom <= year <= yearTo (or items with no year restriction)
  - Returns standard paginated item list with compatibility details
  - Include stock information in results
  - Organization-scoped

### VC-006: VehicleCompatibilityTable Component
- **Priority**: P0
- **Description**: Table on item detail page showing all compatible vehicles
- **Acceptance Criteria**:
  - New tab "Vehicle Compatibility" on item detail page
  - Ant Design Table with columns: Make, Model, Year Range, Engine Type, Notes, Actions
  - "Add Compatibility" button above table
  - Edit and Delete actions per row
  - Group/sort by make for readability
  - Empty state with helpful message

### VC-007: AddCompatibilityModal
- **Priority**: P0
- **Description**: Modal with cascading vehicle selectors
- **Acceptance Criteria**:
  - Ant Design Modal with Form
  - Make selector (Select with search): loads from /vehicles/makes
  - Model selector (Select with search): loads from /vehicles/makes/:id/models, disabled until make selected
  - Year From (InputNumber, 1950-2030 range)
  - Year To (InputNumber, >= yearFrom)
  - Engine Type (Input, optional)
  - Notes (TextArea, optional)
  - Cascading behavior: changing make clears model and year
  - Reusable for create and edit

### VC-008: Vehicle Search Filter on Items List
- **Priority**: P1
- **Description**: Filter items by vehicle compatibility on the items list page
- **Acceptance Criteria**:
  - Collapsible filter section on items list page
  - Three cascading dropdowns: Make, Model, Year
  - "Search by Vehicle" button triggers /items/search/by-vehicle
  - Results replace the standard items list with compatible items
  - Clear filter returns to normal view
  - Show vehicle compatibility info in results

### VC-009: Vehicle Makes/Models Settings Page
- **Priority**: P1
- **Description**: Admin page to manage vehicle reference data
- **Acceptance Criteria**:
  - Accessible from Settings menu: /settings/vehicles
  - Two-panel layout: makes list on left, models list on right
  - Makes panel: list with Add, Edit, Delete actions
  - Models panel: shows models for selected make, with Add, Edit, Delete
  - Inline editing or modal-based editing
  - Search/filter within each panel
  - Show count of items using each make/model
  - Roles: ADMIN and MANAGER can manage; STAFF can view

## API Endpoints

```
# Vehicle Reference Data
GET    /api/vehicles/makes                     - List vehicle makes
POST   /api/vehicles/makes                     - Create vehicle make
PUT    /api/vehicles/makes/:id                 - Update vehicle make
DELETE /api/vehicles/makes/:id                 - Delete vehicle make
GET    /api/vehicles/makes/:id/models          - List models for a make
POST   /api/vehicles/makes/:id/models          - Create model under make
PUT    /api/vehicles/models/:id                - Update vehicle model
DELETE /api/vehicles/models/:id                - Delete vehicle model

# Item Compatibility
GET    /api/items/:id/compatibility            - List vehicle compatibility for item
POST   /api/items/:id/compatibility            - Add compatibility entry
PUT    /api/items/compatibility/:id            - Update compatibility entry
DELETE /api/items/compatibility/:id            - Remove compatibility entry

# Vehicle-Based Search
GET    /api/items/search/by-vehicle            - Find items by vehicle (makeId, modelId, year)
```

## Database Schema

```prisma
model VehicleMake {
  id             String   @id @default(cuid())
  name           String   // e.g., "Toyota", "Perodua"
  country        String?  // e.g., "Japan", "Malaysia"
  logoUrl        String?
  sortOrder      Int      @default(0)
  status         Status   @default(ACTIVE)
  organizationId String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  models          VehicleModel[]
  compatibilities ItemVehicleCompatibility[]

  @@unique([organizationId, name])
  @@index([organizationId])
  @@index([status])
}

model VehicleModel {
  id             String          @id @default(cuid())
  makeId         String
  make           VehicleMake     @relation(fields: [makeId], references: [id], onDelete: Cascade)
  name           String          // e.g., "Camry", "Myvi", "Civic"
  category       VehicleCategory @default(SEDAN)
  status         Status          @default(ACTIVE)
  organizationId String
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  // Relations
  compatibilities ItemVehicleCompatibility[]

  @@unique([makeId, name])
  @@index([makeId])
  @@index([organizationId])
  @@index([status])
}

model ItemVehicleCompatibility {
  id              String        @id @default(cuid())
  itemId          String
  item            Item          @relation(fields: [itemId], references: [id], onDelete: Cascade)
  vehicleMakeId   String
  vehicleMake     VehicleMake   @relation(fields: [vehicleMakeId], references: [id])
  vehicleModelId  String?       // Optional: null means "all models of this make"
  vehicleModel    VehicleModel? @relation(fields: [vehicleModelId], references: [id])
  yearFrom        Int?          // Start year (inclusive), e.g., 2015
  yearTo          Int?          // End year (inclusive), e.g., 2023
  engineType      String?       // e.g., "1.5L DOHC", "2.0 Turbo"
  notes           String?
  organizationId  String
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([itemId])
  @@index([vehicleMakeId])
  @@index([vehicleModelId])
  @@index([organizationId])
  @@index([yearFrom, yearTo])
}

enum VehicleCategory {
  SEDAN
  SUV
  HATCHBACK
  MPV
  TRUCK
  VAN
  PICKUP
  MOTORCYCLE
  COMMERCIAL
  OTHER
}
```

### Changes to Existing Models

```prisma
// Add to Item model relations:
model Item {
  // ... existing fields ...
  vehicleCompatibilities ItemVehicleCompatibility[]  // New relation
  // Note: Keep existing vehicleModels String[] for backward compat during migration
}

// Add to Organization model relations:
model Organization {
  // ... existing fields ...
  vehicleMakes  VehicleMake[]
  vehicleModels VehicleModel[]
}
```

## DTOs

### CreateVehicleMakeDto
```typescript
import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVehicleMakeDto {
  @ApiProperty({ example: 'Toyota' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Japan' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
```

### CreateVehicleModelDto
```typescript
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateVehicleModelDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(VehicleCategory)
  category?: VehicleCategory;
}
```

### CreateItemCompatibilityDto
```typescript
import { IsString, IsOptional, IsInt, Min, Max, ValidateIf } from 'class-validator';

export class CreateItemCompatibilityDto {
  @IsString()
  vehicleMakeId: string;

  @IsOptional()
  @IsString()
  vehicleModelId?: string;

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2030)
  yearFrom?: number;

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2030)
  yearTo?: number;

  @IsOptional()
  @IsString()
  engineType?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
// Custom validation: if yearFrom and yearTo both provided, yearFrom <= yearTo
// Custom validation: if vehicleModelId provided, it must belong to vehicleMakeId
```

### VehicleSearchDto
```typescript
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class VehicleSearchDto {
  @IsString()
  makeId: string;

  @IsOptional()
  @IsString()
  modelId?: string;

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2030)
  year?: number;

  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  limit?: number;
}
```

## NestJS Module Structure

```
apps/api/src/modules/vehicles/
├── vehicles.controller.ts        - Makes and models CRUD
├── vehicles.service.ts           - Business logic for vehicle reference data
├── vehicles.module.ts            - Module registration
└── dto/
    ├── create-vehicle-make.dto.ts
    ├── update-vehicle-make.dto.ts
    ├── create-vehicle-model.dto.ts
    ├── update-vehicle-model.dto.ts
    └── vehicle-search.dto.ts

apps/api/src/modules/items/
├── compatibility/
│   ├── compatibility.controller.ts   - Item compatibility CRUD + vehicle search
│   ├── compatibility.service.ts
│   └── dto/
│       ├── create-item-compatibility.dto.ts
│       └── update-item-compatibility.dto.ts
```

## Service Implementation

### Vehicle Search Logic
```typescript
async searchByVehicle(organizationId: string, query: VehicleSearchDto) {
  const { makeId, modelId, year, page = 1, limit = 25 } = query;

  const compatWhere: Prisma.ItemVehicleCompatibilityWhereInput = {
    organizationId,
    vehicleMakeId: makeId,
  };

  if (modelId) {
    // Match specific model OR make-level entries (modelId is null)
    compatWhere.OR = [
      { vehicleModelId: modelId },
      { vehicleModelId: null },
    ];
  }

  if (year) {
    // Year must be in range, or no year restriction
    compatWhere.AND = [
      {
        OR: [
          { yearFrom: null },
          { yearFrom: { lte: year } },
        ],
      },
      {
        OR: [
          { yearTo: null },
          { yearTo: { gte: year } },
        ],
      },
    ];
  }

  const [items, total] = await Promise.all([
    this.prisma.item.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        vehicleCompatibilities: { some: compatWhere },
      },
      include: {
        category: { select: { id: true, name: true } },
        vehicleCompatibilities: {
          where: compatWhere,
          include: {
            vehicleMake: { select: { id: true, name: true } },
            vehicleModel: { select: { id: true, name: true } },
          },
        },
        stockLevels: { select: { stockOnHand: true, committedStock: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    this.prisma.item.count({
      where: {
        organizationId,
        status: 'ACTIVE',
        vehicleCompatibilities: { some: compatWhere },
      },
    }),
  ]);

  const results = items.map((item) => {
    const totalStock = item.stockLevels.reduce(
      (sum, sl) => sum + Number(sl.stockOnHand), 0
    );
    return {
      ...item,
      stockOnHand: totalStock,
      stockLevels: undefined,
    };
  });

  return {
    data: results,
    meta: { total, page, limit, hasMore: page * limit < total },
  };
}
```

## Frontend Components

### File Structure
```
apps/web/src/
├── app/(dashboard)/items/[id]/
│   └── page.tsx                            - Add "Vehicle Compatibility" tab
├── app/(dashboard)/settings/vehicles/
│   └── page.tsx                            - Vehicle makes/models management
├── components/items/
│   ├── VehicleCompatibilityTable.tsx        - Table on item detail
│   ├── AddCompatibilityModal.tsx           - Modal with cascading selectors
│   └── VehicleSearchFilter.tsx             - Filter component for items list
├── components/vehicles/
│   ├── VehicleMakesList.tsx                - Makes list panel
│   ├── VehicleModelsList.tsx               - Models list panel
│   ├── AddVehicleMakeModal.tsx
│   └── AddVehicleModelModal.tsx
├── hooks/
│   ├── use-vehicle-makes.ts
│   ├── use-vehicle-models.ts
│   └── use-vehicle-compatibility.ts
└── lib/
    ├── vehicles.ts                          - API client for vehicles
    └── vehicle-compatibility.ts             - API client for compatibility
```

### VehicleCompatibilityTable Component
```tsx
// Ant Design Table on item detail page
// Columns: Make, Model (or "All Models"), Year Range (e.g., "2015 - 2023"), Engine Type, Notes, Actions
// Group or sort by make name
// Add/Edit/Delete actions
```

### AddCompatibilityModal Component
```tsx
// Modal with cascading select:
// 1. Select Make -> loads models for that make
// 2. Select Model (or "All Models" option) -> enabled only after make selected
// 3. Year From / Year To inputs
// 4. Engine Type input
// 5. Notes textarea
// Ant Design Form with proper validation
```

### VehicleSearchFilter Component (Items List)
```tsx
// Collapsible panel on items list page
// Three cascading Select components: Make -> Model -> Year
// "Find Parts" button triggers search
// "Clear" button resets filter
// Shows results count after search
```

### Settings Page (/settings/vehicles)
```tsx
// Two-column layout:
// Left: VehicleMakesList - list of makes with Add/Edit/Delete
// Right: VehicleModelsList - models for selected make, with Add/Edit/Delete
// Master-detail pattern
// Show item count per make/model
```

## Business Logic and Validation Rules

1. **Make name uniqueness**: VehicleMake names must be unique per organization.
2. **Model name uniqueness**: VehicleModel names must be unique within a make.
3. **Year range validation**: If both yearFrom and yearTo are provided, yearFrom must be <= yearTo.
4. **Model belongs to make**: When creating compatibility, if vehicleModelId is provided, it must belong to the specified vehicleMakeId.
5. **Deletion protection**: Cannot delete a VehicleMake or VehicleModel that has ItemVehicleCompatibility records referencing it. Show error with count of affected items.
6. **Cascade on item delete**: When an Item is deleted, all its ItemVehicleCompatibility records are cascade-deleted.
7. **Organization isolation**: All vehicle data is organization-scoped. Each org maintains its own vehicle reference data.
8. **Search inclusivity**: Vehicle search returns items that match at make-level OR model-level. A part marked as compatible with "all Toyota" should appear when searching for "Toyota Camry 2020".

## Migration Notes

A data migration is needed to convert `Item.vehicleModels` String[] into structured compatibility data:

```typescript
// For each item with vehicleModels entries:
// - Parse the string to identify make/model (best effort)
// - Create VehicleMake and VehicleModel records if they don't exist
// - Create ItemVehicleCompatibility records
// - Flag entries that couldn't be parsed for manual review
// After migration, Item.vehicleModels can be deprecated
```

## Seed Data

Pre-seed common Malaysian market vehicle makes:

```typescript
const malaysianMakes = [
  { name: 'Perodua', country: 'Malaysia' },
  { name: 'Proton', country: 'Malaysia' },
  { name: 'Toyota', country: 'Japan' },
  { name: 'Honda', country: 'Japan' },
  { name: 'Nissan', country: 'Japan' },
  { name: 'Mitsubishi', country: 'Japan' },
  { name: 'Mazda', country: 'Japan' },
  { name: 'Hyundai', country: 'South Korea' },
  { name: 'Kia', country: 'South Korea' },
  { name: 'Suzuki', country: 'Japan' },
  { name: 'Isuzu', country: 'Japan' },
  { name: 'Hino', country: 'Japan' },
  { name: 'Mercedes-Benz', country: 'Germany' },
  { name: 'BMW', country: 'Germany' },
  { name: 'Ford', country: 'USA' },
  { name: 'Volkswagen', country: 'Germany' },
  { name: 'Subaru', country: 'Japan' },
];
```
