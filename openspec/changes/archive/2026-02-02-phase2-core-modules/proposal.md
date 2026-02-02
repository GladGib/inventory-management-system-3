## Why

With the foundation infrastructure in place (authentication, database schema, frontend scaffolding), the system needs core business functionality for managing inventory items, tracking stock levels, and maintaining customer/vendor relationships. These modules form the backbone of daily operations for auto parts, hardware, and spare parts wholesalers.

## What Changes

**Items Module:**
- Full CRUD operations for inventory items with Malaysian auto parts industry fields
- Item groups for managing product variants (size, color, grade)
- Category management for hierarchical item organization
- Image upload and management for product photos
- Part number search and cross-reference lookups
- Vehicle compatibility tracking for auto parts

**Inventory Module:**
- Real-time stock level tracking across multiple warehouses
- Inventory adjustments (add/remove/damage/return)
- Inter-warehouse stock transfers
- Warehouse CRUD with default warehouse designation
- Stock valuation (FIFO, weighted average)
- Low stock alerts and reorder notifications

**Contacts Module:**
- Customer management with credit limits and payment terms
- Vendor management with lead times and minimum orders
- Contact addresses (billing and shipping)
- Price list assignment per contact
- Outstanding balance tracking

## Capabilities

### New Capabilities

- `items-management`: Full CRUD for items with SKU generation, pricing, tax settings, and auto parts industry fields (part numbers, cross-references, vehicle models)
- `item-groups`: Variant management with configurable attributes and automatic SKU suffixes
- `categories`: Hierarchical category tree for item organization
- `stock-tracking`: Real-time stock levels per warehouse with committed/available calculations
- `inventory-adjustments`: Stock quantity modifications with reason codes and audit trail
- `inventory-transfers`: Move stock between warehouses with transfer documentation
- `warehouses`: Multi-location inventory with bin/zone support
- `customers`: Customer contact management with credit terms, price lists, and transaction history
- `vendors`: Vendor contact management with lead times, minimum orders, and purchase history
- `file-uploads`: Image upload to MinIO/S3 with thumbnail generation

### Modified Capabilities

- `database-schema`: Add indexes for performance, update relations for new modules
- `frontend-layout`: Add breadcrumbs, page titles, and loading states

## Impact

- **API Endpoints**: New REST endpoints under `/api/v1/items`, `/api/v1/inventory`, `/api/v1/contacts`
- **Database**: Heavy read/write on Item, StockLevel, Contact tables; need proper indexing
- **File Storage**: MinIO integration for item images; storage costs scale with catalog size
- **Frontend Routes**: New pages under `/items/*`, `/inventory/*`, `/contacts/*`
- **Search**: Item search by SKU, name, part number requires efficient querying (consider Elasticsearch for large catalogs)
