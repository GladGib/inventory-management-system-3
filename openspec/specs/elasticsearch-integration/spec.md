# Elasticsearch Integration (Full-Text Search)

## Overview
Add Elasticsearch-powered full-text search across items and contacts, providing fuzzy matching on part numbers, autocomplete suggestions, and a unified search experience. The frontend header already has a placeholder area for global search; this spec wires it to a real search backend with graceful fallback to PostgreSQL ILIKE when Elasticsearch is unavailable.

## Architecture

### Module Location
- `apps/api/src/common/search/search.module.ts` - Global module
- `apps/api/src/common/search/search.service.ts` - Core ES client wrapper
- `apps/api/src/common/search/search.controller.ts` - Search API endpoints
- `apps/api/src/common/search/search.health.ts` - Health indicator
- `apps/api/src/common/search/indices/` - Index definitions and mappings
- `apps/api/src/common/search/sync/` - Data sync handlers

### Frontend
- `apps/web/src/components/layout/GlobalSearch.tsx` - Search bar in header
- `apps/web/src/app/(dashboard)/search/page.tsx` - Search results page
- `apps/web/src/hooks/use-search.ts` - Search hook
- `apps/web/src/lib/search.ts` - API client functions

### Dependencies
**Backend (apps/api/package.json):**
```json
{
  "@elastic/elasticsearch": "^8.13.0"
}
```

**No new frontend dependencies** -- uses existing axios via `apps/web/src/lib/api.ts`.

### Configuration
Environment variables in `.env`:
```
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
ELASTICSEARCH_ENABLED=true
```

### Docker Compose Addition
```yaml
# Add to docker-compose.yml
elasticsearch:
  image: elasticsearch:8.13.0
  container_name: ims-elasticsearch
  restart: unless-stopped
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=false
    - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
  ports:
    - '9200:9200'
  volumes:
    - elasticsearch_data:/usr/share/elasticsearch/data
  healthcheck:
    test: ['CMD-SHELL', 'curl -f http://localhost:9200/_cluster/health || exit 1']
    interval: 15s
    timeout: 10s
    retries: 5

# Add to volumes:
elasticsearch_data:
```

## Requirements

### ES-001: SearchModule (Global)
- **Priority**: P0
- **Description**: Create a global NestJS module that initializes the Elasticsearch client and exposes SearchService.
- **Acceptance Criteria**:
  - Module is decorated with `@Global()` and registered in `AppModule.imports`
  - Elasticsearch `Client` created via async factory using `ConfigService` for `ELASTICSEARCH_URL`, `ELASTICSEARCH_USERNAME`, `ELASTICSEARCH_PASSWORD`
  - `ELASTICSEARCH_ENABLED` env var (default `true`) controls whether ES client is initialized; when `false`, SearchService operates in fallback mode only
  - Module exports `SearchService`
  - `onModuleInit`: verify connection with `client.ping()`, log result
  - `onModuleDestroy`: close client connection
  - Connection errors logged but do not crash the process

### ES-002: SearchService
- **Priority**: P0
- **Description**: Service class wrapping the Elasticsearch client with typed methods for indexing, searching, and deleting documents.
- **Acceptance Criteria**:
  - `indexDocument(index: string, id: string, body: Record<string, unknown>): Promise<void>` -- index or update a document
  - `bulkIndex(index: string, documents: Array<{ id: string; body: Record<string, unknown> }>): Promise<void>` -- bulk indexing for reindex operations
  - `deleteDocument(index: string, id: string): Promise<void>` -- remove document from index
  - `search(params: SearchParams): Promise<SearchResult>` -- execute search query
  - `suggest(params: SuggestParams): Promise<SuggestResult>` -- autocomplete suggestions
  - `ensureIndex(index: string, mapping: Record<string, unknown>): Promise<void>` -- create index if not exists, update mapping
  - `deleteIndex(index: string): Promise<void>` -- delete entire index
  - `isAvailable(): Promise<boolean>` -- ping check
  - All methods catch errors and fall through gracefully when ES is unavailable

### ES-003: Items Index
- **Priority**: P0
- **Description**: Define and manage the Elasticsearch index for items/products.
- **Acceptance Criteria**:
  - Index name: `ims_items_{organizationId}` (organization-scoped indices for tenant isolation)
  - Index mapping:

```typescript
interface ItemDocument {
  id: string;
  organizationId: string;
  sku: string;
  name: string;
  nameMalay: string | null;
  description: string | null;
  brand: string | null;
  partNumber: string | null;
  crossReferences: string[];       // Array of alternative part numbers
  vehicleModels: string[];         // Compatible vehicles
  categoryId: string | null;
  categoryName: string | null;     // Denormalized for search display
  categoryNameMalay: string | null;
  type: string;                    // INVENTORY, SERVICE, etc.
  unit: string;
  sellingPrice: number;
  costPrice: number;
  status: string;
  tags: string[];                  // Derived from category hierarchy
  createdAt: string;
  updatedAt: string;
}
```

  - Field analysis:
    - `name`, `nameMalay`, `description`: `text` with `standard` analyzer + `keyword` sub-field for exact matching
    - `sku`, `partNumber`: `text` with `keyword` analyzer + `edge_ngram` sub-field for prefix matching
    - `crossReferences`: `text` with `keyword` analyzer + `edge_ngram` sub-field
    - `brand`: `text` + `keyword` sub-field
    - `categoryName`: `text` + `keyword` sub-field
    - `vehicleModels`: `text` + `keyword` sub-field
    - `status`, `type`, `unit`, `organizationId`: `keyword` only
    - `sellingPrice`, `costPrice`: `scaled_float` with scaling factor 10000
    - `createdAt`, `updatedAt`: `date`

  - Custom analyzer for part numbers:
    ```json
    {
      "analysis": {
        "analyzer": {
          "part_number_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "part_number_edge"]
          }
        },
        "filter": {
          "part_number_edge": {
            "type": "edge_ngram",
            "min_gram": 2,
            "max_gram": 15
          }
        }
      }
    }
    ```

### ES-004: Contacts Index
- **Priority**: P0
- **Description**: Define and manage the Elasticsearch index for contacts (customers and vendors).
- **Acceptance Criteria**:
  - Index name: `ims_contacts_{organizationId}`
  - Index mapping:

```typescript
interface ContactDocument {
  id: string;
  organizationId: string;
  type: string;                    // CUSTOMER, VENDOR, BOTH
  companyName: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  taxNumber: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}
```

  - Field analysis:
    - `companyName`, `displayName`: `text` with `standard` analyzer + `keyword` sub-field + `edge_ngram` for autocomplete
    - `firstName`, `lastName`: `text` + `keyword` sub-field
    - `email`: `text` with `keyword` sub-field (split on `@` and `.`)
    - `phone`, `mobile`: `keyword` + `wildcard` for partial phone search
    - `type`, `status`, `organizationId`: `keyword`
    - `createdAt`, `updatedAt`: `date`

### ES-005: Data Synchronization
- **Priority**: P0
- **Description**: Keep Elasticsearch indices in sync with PostgreSQL data on every create, update, and delete operation.
- **Acceptance Criteria**:
  - Sync strategy: **Direct call** from service layer (not event-based, to keep it simple initially)
  - `ItemsService`: after successful Prisma create/update, call `SearchService.indexDocument('ims_items_' + orgId, item.id, itemDoc)`
  - `ItemsService`: after successful Prisma delete, call `SearchService.deleteDocument('ims_items_' + orgId, item.id)`
  - `ContactsService`: same pattern for contacts
  - Sync is fire-and-forget (async, non-blocking): do not await the ES operation, do not fail the main operation if ES is down
  - Utility functions `mapItemToDocument(item: Item & { category?: Category }): ItemDocument` and `mapContactToDocument(contact: Contact): ContactDocument` for consistent mapping
  - Location: `apps/api/src/common/search/sync/item-sync.service.ts`, `contact-sync.service.ts`

### ES-006: Unified Search API
- **Priority**: P0
- **Description**: REST API endpoint for full-text search across items and contacts.
- **Acceptance Criteria**:

#### `GET /api/v1/search`
Query parameters:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | (required) | Search query, minimum 2 characters |
| `type` | `items` \| `contacts` \| `all` | `all` | Entity type filter |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Results per page (max 100) |
| `status` | string | `ACTIVE` | Filter by status |
| `category` | string | - | Filter items by categoryId |
| `contactType` | `CUSTOMER` \| `VENDOR` \| `BOTH` | - | Filter contacts by type |
| `sort` | `relevance` \| `name` \| `date` | `relevance` | Sort order |

Response:
```typescript
interface SearchResponse {
  query: string;
  totalResults: number;
  items: {
    total: number;
    results: Array<{
      id: string;
      sku: string;
      name: string;
      nameMalay: string | null;
      partNumber: string | null;
      brand: string | null;
      categoryName: string | null;
      sellingPrice: number;
      status: string;
      highlight: Record<string, string[]>;  // Field highlights with <em> tags
      score: number;
    }>;
  };
  contacts: {
    total: number;
    results: Array<{
      id: string;
      type: string;
      companyName: string;
      displayName: string;
      email: string | null;
      phone: string | null;
      status: string;
      highlight: Record<string, string[]>;
      score: number;
    }>;
  };
  took: number;  // Query time in ms
}
```

  - Search query uses `multi_match` with `best_fields` type
  - Items boost: `name^3`, `partNumber^4`, `sku^3`, `crossReferences^2`, `brand^1.5`, `description^1`, `vehicleModels^1.5`
  - Contacts boost: `companyName^3`, `displayName^2`, `email^1.5`, `phone^1`
  - Fuzzy matching enabled: `fuzziness: "AUTO"` (Levenshtein distance auto-calculated based on term length)
  - Part number fields use additional `prefix` query for exact prefix matching (e.g. searching "04152" matches "04152-YZZA1")
  - Results include `highlight` for matched fields with `<em>` tags
  - Organization-scoped: search only queries `ims_items_{orgId}` and `ims_contacts_{orgId}` indices

### ES-007: Autocomplete / Suggest API
- **Priority**: P1
- **Description**: Lightweight endpoint for search-as-you-type suggestions.
- **Acceptance Criteria**:

#### `GET /api/v1/search/suggest`
Query parameters:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | (required) | Partial query, minimum 1 character |
| `type` | `items` \| `contacts` \| `all` | `all` | Entity type filter |
| `limit` | number | 5 | Max suggestions (max 10) |

Response:
```typescript
interface SuggestResponse {
  suggestions: Array<{
    id: string;
    type: 'item' | 'contact';
    text: string;            // Display text (item name or contact displayName)
    subtext: string;         // Secondary info (SKU/part# for items, company for contacts)
    icon: 'item' | 'customer' | 'vendor';
    url: string;             // Direct link: /items/{id} or /contacts/{id}
  }>;
}
```

  - Uses `edge_ngram` fields for prefix matching
  - Response time target: < 100ms
  - Debounced on frontend (300ms)
  - Cached in Redis for 30 seconds with key `ims:suggest:{orgId}:{queryHash}`

### ES-008: PostgreSQL Fallback Search
- **Priority**: P0
- **Description**: When Elasticsearch is unavailable, search falls back to PostgreSQL ILIKE queries.
- **Acceptance Criteria**:
  - `SearchService.search()` checks `isAvailable()` before querying ES
  - If ES is down, delegates to `FallbackSearchService`
  - `FallbackSearchService` uses Prisma queries:
    ```sql
    -- Items fallback
    WHERE (name ILIKE '%query%' OR sku ILIKE '%query%' OR "partNumber" ILIKE '%query%'
           OR "nameMalay" ILIKE '%query%' OR brand ILIKE '%query%')
    AND "organizationId" = :orgId AND status = 'ACTIVE'
    ORDER BY
      CASE WHEN sku = :query THEN 0
           WHEN "partNumber" = :query THEN 1
           WHEN name ILIKE :query || '%' THEN 2
           ELSE 3 END,
      name ASC
    LIMIT :limit OFFSET :offset

    -- Contacts fallback
    WHERE ("companyName" ILIKE '%query%' OR "displayName" ILIKE '%query%'
           OR email ILIKE '%query%' OR phone ILIKE '%query%')
    AND "organizationId" = :orgId AND status = 'ACTIVE'
    ORDER BY "displayName" ASC
    LIMIT :limit OFFSET :offset
    ```
  - Fallback does not support fuzzy matching, highlights, or relevance scoring
  - Response format is identical to ES search (highlights will be empty arrays)
  - `X-Search-Backend: elasticsearch | postgresql` response header indicates which backend was used

### ES-009: Reindex CLI Command
- **Priority**: P1
- **Description**: CLI command to reindex all data from PostgreSQL to Elasticsearch.
- **Acceptance Criteria**:
  - NestJS CLI command: `npx ts-node apps/api/src/common/search/cli/reindex.ts`
  - Usage: `reindex [--index items|contacts|all] [--org <organizationId>]`
  - Process:
    1. Delete existing index (if `--force` flag)
    2. Create index with mapping
    3. Query all records from PostgreSQL (batched, 500 per batch)
    4. Bulk index to Elasticsearch
    5. Report: total indexed, errors, duration
  - Progress output to stdout: `Indexing items... 1500/3200 (46%)`
  - Can target a single organization or all organizations
  - Should be runnable in production without downtime (creates new index, swaps alias)

### ES-010: Frontend Global Search Bar
- **Priority**: P0
- **Description**: Wire the search bar in the header to the search/suggest API.
- **Acceptance Criteria**:
  - `GlobalSearch.tsx` component in header (replaces placeholder):
    - Uses Ant Design `AutoComplete` component with `Input.Search`
    - Debounced input (300ms) triggers `GET /search/suggest?q=...`
    - Dropdown shows suggestions grouped by type (Items, Contacts)
    - Each suggestion shows icon (ShoppingOutlined for items, UserOutlined/ShopOutlined for contacts), primary text, and subtext
    - Clicking a suggestion navigates to `/items/{id}` or `/contacts/{id}`
    - Pressing Enter navigates to `/search?q={query}` (full search results page)
    - Loading state while fetching
    - Empty state: "No results found for '{query}'"
    - Keyboard shortcut: `Ctrl+K` or `Cmd+K` to focus the search bar
  - Responsive: full width on mobile, 400px on desktop

### ES-011: Frontend Search Results Page
- **Priority**: P0
- **Description**: Full search results page at `/search?q=xxx` with tabbed results.
- **Acceptance Criteria**:
  - Route: `apps/web/src/app/(dashboard)/search/page.tsx`
  - Layout:
    - Search input at top (pre-filled from URL query param)
    - Tabs: "All ({total})", "Items ({items.total})", "Contacts ({contacts.total})"
    - Each tab shows results list with highlights
  - Item result row: SKU, name (with highlight), part number, brand, category, selling price, status badge
  - Contact result row: display name (with highlight), company name, type badge, email, phone
  - Click navigates to detail page
  - Pagination at bottom
  - "Searched in {took}ms" indicator
  - Empty state when no results
  - Uses `useSearch` hook with `@tanstack/react-query`

## File Structure

### Backend
```
apps/api/src/common/search/
  search.module.ts
  search.service.ts
  search.controller.ts
  search.health.ts
  fallback-search.service.ts
  dto/
    search-query.dto.ts
    suggest-query.dto.ts
  indices/
    items.mapping.ts
    contacts.mapping.ts
  sync/
    item-sync.service.ts
    contact-sync.service.ts
  cli/
    reindex.ts
  __tests__/
    search.service.spec.ts
    search.controller.spec.ts
    fallback-search.service.spec.ts
```

### Frontend
```
apps/web/src/
  components/layout/GlobalSearch.tsx
  app/(dashboard)/search/page.tsx
  hooks/use-search.ts
  lib/search.ts
```

## Health Check Integration

Update `/health` endpoint to include Elasticsearch status:
```json
{
  "services": {
    "database": { "status": "up", "responseTime": 5 },
    "redis": { "status": "up", "responseTime": 2 },
    "elasticsearch": { "status": "up", "responseTime": 12 }
  }
}
```

## Performance Targets
| Operation | Target |
|-----------|--------|
| Suggest query (5 results) | < 100ms |
| Full search (20 results) | < 300ms |
| Single document index | < 50ms |
| Bulk index (500 documents) | < 2s |
| Full reindex (10,000 items) | < 60s |
