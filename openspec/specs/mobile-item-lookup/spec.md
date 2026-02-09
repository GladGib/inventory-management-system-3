# Mobile Item Lookup Specification

> **Implementation Note (2026-02-10):** The actual implementation uses **React Native with Expo** instead of Flutter. The behavioral requirements below remain valid; Dart/Flutter code examples should be mapped to TypeScript/React Native equivalents.

## Purpose
Provide a mobile-optimized item search and detail view that enables users to quickly find inventory items by name, SKU, part number, cross-reference number, or barcode. Supports offline caching of recently viewed items and integrates with the existing backend item endpoints (`GET /api/v1/items`, `GET /api/v1/items/:id`, `GET /api/v1/items/low-stock`).

## Requirements

### Requirement: Item search screen
The app SHALL provide an item search screen with instant search, filtering, and sorting.

#### Scenario: Search bar
- **WHEN** the user navigates to the items screen (`/items`)
- **THEN** the screen SHALL display a search bar at the top with:
  - A text field with placeholder "Search items by name, SKU, part number..."
  - A search icon prefix
  - A clear button (X icon) when text is entered
  - Keyboard type set to `text` with search action button

#### Scenario: Debounced search
- **WHEN** the user types in the search bar
- **THEN** the app SHALL debounce input by 300ms before making the API call
- **AND** call `GET /api/v1/items?search=<query>` with the debounced text

#### Scenario: Search by multiple fields
- **WHEN** a search query is submitted
- **THEN** the backend SHALL match against: `name`, `sku`, `partNumber`, `crossReferences`, and `barcode` fields
- **AND** results SHALL be ranked by relevance (exact SKU match first, then partial name matches)

#### Scenario: Empty search
- **WHEN** the search field is empty
- **THEN** the app SHALL display all items in the default sort order (most recently created first)

#### Scenario: Search results loading
- **WHEN** a search request is in progress
- **THEN** the app SHALL display a loading indicator below the search bar
- **AND** previous results SHALL remain visible until new results arrive

#### Scenario: No results
- **WHEN** the search returns zero results
- **THEN** the app SHALL display an empty state with:
  - An illustration (magnifying glass with question mark)
  - Text: "No items found"
  - Subtitle: "Try a different search term or adjust your filters"
  - Optional: "Scan Barcode" button to try barcode search

### Requirement: Results list
The search results SHALL be displayed as a scrollable list with item summaries.

#### Scenario: Result item card layout
- **WHEN** results are displayed
- **THEN** each item in the list SHALL show:
  - Item image thumbnail (40x40dp, rounded corners) on the left, or a placeholder icon if no image
  - Item name (primary text, single line, ellipsis overflow)
  - SKU (secondary text, gray)
  - Stock level indicator: numeric value with colored badge (green if in-stock, yellow if low, red if out-of-stock)
  - Selling price formatted as RM currency on the right

#### Scenario: Stock level badge colors
- **WHEN** rendering the stock level badge
- **THEN** colors SHALL be:
  - Green (`#52c41a`): stockOnHand > reorderLevel
  - Yellow/amber (`#faad14`): 0 < stockOnHand <= reorderLevel
  - Red (`#ff4d4f`): stockOnHand == 0

#### Scenario: Infinite scroll pagination
- **WHEN** the user scrolls to the bottom of the results list
- **THEN** the app SHALL fetch the next page of results (`?page=N&limit=25`)
- **AND** append the results to the existing list
- **AND** display a loading indicator at the bottom during fetch

#### Scenario: End of results
- **WHEN** there are no more pages to load
- **THEN** the app SHALL stop requesting additional pages
- **AND** optionally display a subtle "End of results" divider

#### Scenario: Tap to view detail
- **WHEN** the user taps an item in the results list
- **THEN** the app SHALL navigate to the item detail screen (`/items/:id`)

### Requirement: Filters
The item list SHALL support filtering by category, brand, and stock status.

#### Scenario: Filter button
- **WHEN** the items screen is displayed
- **THEN** a filter icon button SHALL appear next to the search bar or in the app bar
- **AND** tapping it SHALL open a filter bottom sheet or modal

#### Scenario: Filter options
- **WHEN** the filter modal is open
- **THEN** the user SHALL be able to select:
  - **Category**: dropdown or searchable list of categories from `GET /api/v1/categories`
  - **Brand**: dropdown or searchable list of unique brand values
  - **Stock Status**: radio or chip group with options: "All", "In Stock", "Low Stock", "Out of Stock"

#### Scenario: Apply filters
- **WHEN** the user taps "Apply Filters"
- **THEN** the app SHALL make a new API request with the selected filter parameters:
  - `categoryId=<id>` for category filter
  - `brand=<value>` for brand filter
  - Stock status maps to: no filter, `stockOnHand>reorderLevel`, `stockOnHand<=reorderLevel AND stockOnHand>0`, `stockOnHand=0`
- **AND** clear the existing results and show the filtered results

#### Scenario: Active filter indicator
- **WHEN** one or more filters are active
- **THEN** the filter icon SHALL display a badge with the count of active filters
- **AND** active filter chips SHALL be displayed below the search bar

#### Scenario: Clear filters
- **WHEN** the user taps "Clear All" in the filter modal or removes all filter chips
- **THEN** all filters SHALL be reset and the full item list SHALL reload

### Requirement: Sort options
The item list SHALL support sorting by name, SKU, price, and stock level.

#### Scenario: Sort button
- **WHEN** the items screen is displayed
- **THEN** a sort icon button SHALL appear in the app bar or toolbar

#### Scenario: Sort options list
- **WHEN** the sort button is tapped
- **THEN** a bottom sheet SHALL display sort options:
  - Name A-Z / Name Z-A
  - SKU A-Z / SKU Z-A
  - Price: Low to High / Price: High to Low
  - Stock: Low to High / Stock: High to Low

#### Scenario: Sort application
- **WHEN** the user selects a sort option
- **THEN** the app SHALL pass `sortBy=<field>&sortOrder=asc|desc` to the API
- **AND** reload the item list with the new sort order

#### Scenario: Default sort
- **WHEN** no sort is explicitly selected
- **THEN** items SHALL be sorted by `createdAt` descending (newest first)

### Requirement: Item detail screen
The app SHALL display a comprehensive item detail screen with tabbed information sections.

#### Scenario: Item detail layout
- **WHEN** the user navigates to `/items/:id`
- **THEN** the app SHALL call `GET /api/v1/items/:id` and display:
  - Image carousel at the top (or placeholder if no images)
  - Item name as the screen title or large heading
  - SKU displayed below the name
  - Status badge (ACTIVE / INACTIVE)
  - Tabbed content area below

#### Scenario: Image carousel
- **WHEN** the item has one or more images
- **THEN** the app SHALL display a swipeable horizontal image carousel with:
  - Full-width images with aspect ratio preservation
  - Page indicator dots at the bottom
  - Pinch-to-zoom gesture support
- **AND** images SHALL be loaded via `cached_network_image` for caching

#### Scenario: Image placeholder
- **WHEN** the item has no images
- **THEN** the app SHALL display a placeholder container with a generic package icon and "No image" text

#### Scenario: Details tab
- **WHEN** the "Details" tab is selected (default tab)
- **THEN** the tab content SHALL display:
  - **Name**: item name
  - **Name (BM)**: nameMalay (if available)
  - **SKU**: item SKU
  - **Type**: INVENTORY / SERVICE / NON_INVENTORY
  - **Category**: category name
  - **Brand**: brand name
  - **Unit**: unit of measure
  - **Part Number**: partNumber (if applicable)
  - **Description**: item description (full text)
  - **Vehicle Compatibility**: list of vehicleModels (if applicable)

#### Scenario: Stock tab
- **WHEN** the "Stock" tab is selected
- **THEN** the tab content SHALL display:
  - **Total Stock On Hand**: sum across all warehouses
  - **Total Available Stock**: total stockOnHand - total committedStock
  - **Reorder Level**: item reorderLevel
  - **Low Stock Indicator**: warning icon if below reorder level
  - **Stock by Warehouse breakdown**: a list showing each warehouse name, stockOnHand, committedStock, and availableStock

#### Scenario: Pricing tab
- **WHEN** the "Pricing" tab is selected
- **THEN** the tab content SHALL display:
  - **Cost Price**: formatted as RM currency
  - **Selling Price**: formatted as RM currency
  - **Margin**: calculated as `((sellingPrice - costPrice) / sellingPrice) * 100` displayed as percentage
  - **Taxable**: Yes/No
  - **Tax Rate**: tax rate name and percentage (if assigned)
  - **Stock Value**: stockOnHand * costPrice (across all warehouses)

#### Scenario: Cross-References tab
- **WHEN** the "Cross-Refs" tab is selected
- **THEN** the tab content SHALL display:
  - List of cross-reference part numbers from the `crossReferences` array
  - Each cross-reference shown as a tappable chip or list item
  - Tapping a cross-reference SHALL search items by that number

### Requirement: Item detail quick actions
The item detail screen SHALL provide quick action buttons for common operations.

#### Scenario: Quick action buttons
- **WHEN** the item detail screen is displayed
- **THEN** a floating action button (FAB) or bottom action bar SHALL provide:
  - **Adjust Stock**: navigate to stock adjustment screen pre-filled with this item
  - **Add to Quote**: add this item to a draft quote (future feature, show "Coming soon")
  - **View History**: navigate to stock movement history for this item

#### Scenario: FAB expand
- **WHEN** the user taps the FAB
- **THEN** it SHALL expand to show the individual action buttons with labels

### Requirement: Offline item caching
The app SHALL cache recently viewed items locally for offline access.

#### Scenario: Cache on view
- **WHEN** the user views an item detail screen
- **THEN** the full item data SHALL be stored in the Hive `items_cache` box
- **AND** keyed by the item ID
- **AND** include a `cachedAt` timestamp

#### Scenario: Cache size limit
- **WHEN** the cache exceeds 100 items
- **THEN** the oldest cached items (by `cachedAt`) SHALL be evicted to maintain the limit

#### Scenario: Offline detail view
- **WHEN** the device is offline and the user navigates to a cached item
- **THEN** the app SHALL render the item detail from the Hive cache
- **AND** display a banner: "Showing cached data. Connect to the internet for the latest information."

#### Scenario: Offline search
- **WHEN** the device is offline and the user searches
- **THEN** the app SHALL search the local Hive cache by name, SKU, and partNumber
- **AND** display results from cache with an offline indicator

### Requirement: Pull-to-refresh
The item list and item detail screens SHALL support pull-to-refresh.

#### Scenario: Item list refresh
- **WHEN** the user pulls to refresh on the item list
- **THEN** the current search/filter/sort state SHALL be preserved
- **AND** the list SHALL refetch from page 1

#### Scenario: Item detail refresh
- **WHEN** the user pulls to refresh on the item detail
- **THEN** the item data SHALL be refetched from `GET /api/v1/items/:id`
- **AND** the local cache SHALL be updated

### Requirement: Empty state
The item list SHALL display a meaningful empty state when there are no items.

#### Scenario: No items in organization
- **WHEN** the organization has zero items and no search/filters are applied
- **THEN** the screen SHALL display:
  - An illustration (empty box or package icon)
  - Title: "No items yet"
  - Subtitle: "Add your first item to get started"
  - Action button: "Add Item" (if the user has permission)

#### Scenario: No search results with illustration
- **WHEN** a search returns no results
- **THEN** the empty state SHALL use a search-specific illustration
- **AND** suggest: "Try a different search term" and "Scan Barcode" button

## API Endpoints Used

```
GET  /api/v1/items                 - List/search items (paginated)
GET  /api/v1/items/:id             - Get item detail with stock levels
GET  /api/v1/items/low-stock       - List items below reorder level
GET  /api/v1/categories            - List categories (for filter dropdown)
GET  /api/v1/inventory/stock/:id   - Get stock levels for specific item
```

## Data Models

```dart
// features/items/domain/models/item.dart

@freezed
class Item with _$Item {
  const factory Item({
    required String id,
    required String sku,
    required String name,
    String? nameMalay,
    String? description,
    required String type,       // 'INVENTORY', 'SERVICE', 'NON_INVENTORY'
    required String unit,
    String? brand,
    String? categoryId,
    String? categoryName,
    String? partNumber,
    @Default([]) List<String> crossReferences,
    @Default([]) List<String> vehicleModels,
    required double costPrice,
    required double sellingPrice,
    int? reorderLevel,
    int? reorderQty,
    required bool taxable,
    String? taxRateId,
    String? taxRateName,
    double? taxRatePercent,
    @Default([]) List<String> images,
    required String status,
    @Default([]) List<StockLevel> stockLevels,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _Item;

  factory Item.fromJson(Map<String, dynamic> json) => _$ItemFromJson(json);
}

@freezed
class StockLevel with _$StockLevel {
  const factory StockLevel({
    required String id,
    required String warehouseId,
    required String warehouseName,
    required int stockOnHand,
    required int committedStock,
    required int availableStock,
  }) = _StockLevel;

  factory StockLevel.fromJson(Map<String, dynamic> json) => _$StockLevelFromJson(json);
}

@freezed
class ItemFilter with _$ItemFilter {
  const factory ItemFilter({
    String? search,
    String? categoryId,
    String? brand,
    String? stockStatus,    // 'in_stock', 'low_stock', 'out_of_stock'
    String? sortBy,         // 'name', 'sku', 'sellingPrice', 'stockOnHand'
    String? sortOrder,      // 'asc', 'desc'
    @Default(1) int page,
    @Default(25) int limit,
  }) = _ItemFilter;
}
```
