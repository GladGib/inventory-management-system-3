## Context

Phase 1 established the foundation: NestJS backend with authentication, Prisma ORM with comprehensive schema, and Next.js frontend with Ant Design. Phase 2 builds the core business modules that users interact with daily.

**Current State**:
- Database schema exists for Item, StockLevel, Warehouse, Contact, Category
- Frontend has placeholder pages with mock data
- No actual CRUD operations implemented

**Constraints**:
- Must maintain organization-scoped data isolation
- Item SKUs must be unique within organization
- Stock calculations must be accurate (financial implications)
- Image uploads need size limits and format validation

## Goals / Non-Goals

**Goals:**
- Implement complete CRUD for items, warehouses, and contacts
- Provide efficient search and filtering for large item catalogs
- Track stock levels accurately with audit trails
- Support Malaysian auto parts industry requirements (part numbers, vehicle compatibility)
- Enable image uploads for item photos

**Non-Goals:**
- Barcode generation/scanning (Phase 6)
- Composite items / Bill of Materials (Phase 6)
- Batch and serial number tracking UI (schema exists, UI in Phase 6)
- Elasticsearch integration (optimize with PostgreSQL first)
- Bulk import/export (Phase 5)

## Decisions

### 1. Module Structure

**Decision**: Each domain gets its own NestJS module with controller, service, and DTOs

```
modules/
├── items/
│   ├── items.module.ts
│   ├── items.controller.ts
│   ├── items.service.ts
│   └── dto/
│       ├── create-item.dto.ts
│       ├── update-item.dto.ts
│       └── item-query.dto.ts
├── inventory/
│   ├── inventory.module.ts
│   ├── stock.controller.ts
│   ├── adjustments.controller.ts
│   ├── transfers.controller.ts
│   ├── warehouses.controller.ts
│   └── services/
│       ├── stock.service.ts
│       ├── adjustments.service.ts
│       └── warehouses.service.ts
├── contacts/
│   ├── contacts.module.ts
│   ├── contacts.controller.ts
│   ├── contacts.service.ts
│   └── dto/
└── categories/
    ├── categories.module.ts
    ├── categories.controller.ts
    └── categories.service.ts
```

**Rationale**: Clear separation of concerns, easy to test, follows NestJS conventions.

### 2. Pagination Strategy

**Decision**: Cursor-based pagination for lists, with offset pagination fallback

**Alternatives Considered**:
- Offset-only: Simple but poor performance on large datasets
- Cursor-only: Better performance but harder to implement "jump to page"

**Rationale**: Use cursor-based for main lists (items, contacts) for performance. Offset pagination available for reports where page jumping is needed.

```typescript
// Standard pagination response
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    cursor?: string;
  };
}
```

### 3. Item Search Strategy

**Decision**: PostgreSQL full-text search with GIN indexes, upgrade to Elasticsearch later if needed

**Alternatives Considered**:
- Elasticsearch from start: Overkill for MVP, adds operational complexity
- LIKE queries: Too slow for large catalogs
- pg_trgm extension: Good for fuzzy matching

**Rationale**: PostgreSQL full-text search handles 10K-100K items well. Add trigram index for fuzzy SKU/part number matching. Monitor query performance and migrate to Elasticsearch if P95 latency exceeds 200ms.

```sql
-- Add to migration
CREATE INDEX items_search_idx ON "Item" USING GIN (
  to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || sku)
);
CREATE INDEX items_sku_trgm_idx ON "Item" USING GIN (sku gin_trgm_ops);
CREATE INDEX items_part_number_trgm_idx ON "Item" USING GIN ("partNumber" gin_trgm_ops);
```

### 4. Stock Level Calculation

**Decision**: Denormalized `stockOnHand` and `committedStock` columns with transactional updates

**Alternatives Considered**:
- Calculate on-the-fly: Accurate but slow for list views
- Materialized views: Complex to maintain, PostgreSQL-specific
- Event sourcing: Overkill for MVP

**Rationale**: Store current stock levels directly. Update transactionally when orders/adjustments occur. Simpler to query, acceptable trade-off for slightly more complex writes.

```typescript
// Stock update pattern
async adjustStock(itemId: string, warehouseId: string, quantity: number, reason: string) {
  return this.prisma.$transaction(async (tx) => {
    // Create adjustment record
    const adjustment = await tx.stockAdjustment.create({...});

    // Update stock level
    await tx.stockLevel.update({
      where: { itemId_warehouseId: { itemId, warehouseId } },
      data: { stockOnHand: { increment: quantity } },
    });

    return adjustment;
  });
}
```

### 5. Image Upload Strategy

**Decision**: Direct upload to MinIO with presigned URLs, store paths in database

**Alternatives Considered**:
- Upload through API: Adds load to API server, file size limits
- Base64 in database: Bloats database, poor performance
- External CDN: More complex, overkill for MVP

**Rationale**: MinIO is already in Docker Compose. Frontend gets presigned upload URL, uploads directly, then saves path to item record. Efficient and scalable.

```typescript
// Upload flow
// 1. Frontend requests presigned URL
// 2. Frontend uploads directly to MinIO
// 3. Frontend saves image path to item
```

### 6. Contact Type Handling

**Decision**: Single Contact entity with `type` enum (CUSTOMER, VENDOR, BOTH)

**Alternatives Considered**:
- Separate Customer/Vendor tables: Duplication, harder to handle BOTH type
- Inheritance with discriminator: More complex querying

**Rationale**: Many businesses have contacts that are both customers and vendors. Single table with type field is simpler and covers all cases.

## API Design

### Items API

```
GET    /api/v1/items                    List items (paginated, filterable)
POST   /api/v1/items                    Create item
GET    /api/v1/items/:id                Get item details
PUT    /api/v1/items/:id                Update item
DELETE /api/v1/items/:id                Delete item (soft delete)
GET    /api/v1/items/:id/stock          Get stock levels for item
POST   /api/v1/items/:id/images         Upload item image
DELETE /api/v1/items/:id/images/:imgId  Delete item image

GET    /api/v1/items/search             Search items (SKU, name, part number)
GET    /api/v1/items/low-stock          List items below reorder level
```

### Inventory API

```
GET    /api/v1/inventory/stock          List stock levels (by warehouse, item)
GET    /api/v1/inventory/stock/:itemId  Get item stock across warehouses

POST   /api/v1/inventory/adjustments    Create stock adjustment
GET    /api/v1/inventory/adjustments    List adjustments (filterable by date, item)

POST   /api/v1/inventory/transfers      Create inter-warehouse transfer
GET    /api/v1/inventory/transfers      List transfers
PUT    /api/v1/inventory/transfers/:id  Update transfer status (RECEIVE, CANCEL)

GET    /api/v1/warehouses               List warehouses
POST   /api/v1/warehouses               Create warehouse
PUT    /api/v1/warehouses/:id           Update warehouse
DELETE /api/v1/warehouses/:id           Delete warehouse (if no stock)
```

### Contacts API

```
GET    /api/v1/contacts                 List contacts (filter by type)
POST   /api/v1/contacts                 Create contact
GET    /api/v1/contacts/:id             Get contact details
PUT    /api/v1/contacts/:id             Update contact
DELETE /api/v1/contacts/:id             Delete contact (soft delete)

GET    /api/v1/contacts/:id/transactions  List transactions for contact
GET    /api/v1/contacts/:id/balance       Get outstanding balance

GET    /api/v1/customers                Alias for contacts?type=CUSTOMER
GET    /api/v1/vendors                  Alias for contacts?type=VENDOR
```

### Categories API

```
GET    /api/v1/categories               List categories (tree structure)
POST   /api/v1/categories               Create category
PUT    /api/v1/categories/:id           Update category
DELETE /api/v1/categories/:id           Delete category (if no items)
```

## Frontend Structure

```
app/(dashboard)/
├── items/
│   ├── page.tsx                 # Item list with filters
│   ├── new/page.tsx             # Create item form
│   ├── [id]/page.tsx            # Item detail view
│   ├── [id]/edit/page.tsx       # Edit item form
│   └── groups/page.tsx          # Item groups management
├── inventory/
│   ├── page.tsx                 # Stock summary
│   ├── adjustments/
│   │   ├── page.tsx             # Adjustment list
│   │   └── new/page.tsx         # Create adjustment
│   ├── transfers/
│   │   ├── page.tsx             # Transfer list
│   │   └── new/page.tsx         # Create transfer
│   └── warehouses/
│       ├── page.tsx             # Warehouse list
│       └── new/page.tsx         # Create warehouse
├── contacts/
│   ├── customers/
│   │   ├── page.tsx             # Customer list
│   │   ├── new/page.tsx         # Create customer
│   │   └── [id]/page.tsx        # Customer detail
│   └── vendors/
│       ├── page.tsx             # Vendor list
│       ├── new/page.tsx         # Create vendor
│       └── [id]/page.tsx        # Vendor detail
```

## Risks / Trade-offs

### [Risk] Stock discrepancy due to concurrent updates
**Mitigation**: Use database transactions with row-level locking. Implement optimistic locking with version field if contention is high.

### [Risk] Large item catalogs slow down search
**Mitigation**: PostgreSQL GIN indexes for full-text search. Monitor P95 latency. Plan Elasticsearch migration if >100K items.

### [Risk] Image storage costs grow with catalog
**Mitigation**: Set max image size (2MB), max images per item (5). Implement image compression. Consider CDN caching for frequently accessed images.

### [Trade-off] Denormalized stock levels vs calculated
**Decision**: Denormalized for read performance. Accepts slightly more complex write logic.

### [Trade-off] Single Contact table vs separate Customer/Vendor
**Decision**: Single table for flexibility. Accepts need for type-based filtering.

## Open Questions

1. **SKU Generation**: Should the system auto-generate SKUs or require manual entry? Consider prefix + sequence pattern.
2. **Stock Valuation**: When to calculate FIFO vs weighted average cost? On-demand or background job?
3. **Audit Trail**: Should we log all field changes or just stock movements? Storage vs compliance trade-off.
4. **Soft Delete**: How long to retain soft-deleted items before hard delete? 90 days default?
