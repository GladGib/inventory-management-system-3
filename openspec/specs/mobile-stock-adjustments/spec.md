# Mobile Stock Adjustments Specification

> **Implementation Note (2026-02-10):** The actual implementation uses **React Native with Expo** instead of Flutter. Technology mapping: Hive offline_queue → AsyncStorage, connectivity_plus → @react-native-community/netinfo. The behavioral requirements below remain valid.

## Purpose
Enable mobile users to adjust inventory stock levels through a quick single-item adjustment flow and a batch stocktake mode. Supports offline queuing of adjustments and integrates with the existing backend endpoints (`POST /api/v1/inventory/adjustments`, `POST /api/v1/inventory/adjustments/bulk`, `GET /api/v1/inventory/adjustments`).

## Requirements

### Requirement: Quick stock adjustment flow
The app SHALL provide a streamlined flow for adjusting stock on a single item.

#### Scenario: Quick adjust entry points
- **WHEN** the user initiates a stock adjustment
- **THEN** they can reach the adjustment screen via:
  - Dashboard quick action "Stock Adjust" -> `/inventory/adjust`
  - Item detail screen quick action "Adjust Stock" -> `/inventory/adjust?itemId=<id>`
  - Barcode scanner single-scan -> item detail -> "Adjust Stock"

#### Scenario: Step 1 - Select or scan item
- **WHEN** the stock adjustment screen opens without a pre-selected item (`/inventory/adjust`)
- **THEN** the screen SHALL display:
  - A search/scan item selector at the top
  - A "Scan Barcode" button that opens the scanner in single-scan mode
  - A search text field that searches items by name, SKU, or part number (debounced 300ms)
  - Search results in a dropdown/list below the field

#### Scenario: Step 1 - Pre-selected item
- **WHEN** the stock adjustment screen opens with a pre-selected item (`/inventory/adjust?itemId=<id>`)
- **THEN** the app SHALL fetch the item details and skip to Step 2
- **AND** display the selected item summary (name, SKU, current stock)

#### Scenario: Step 2 - Select warehouse
- **WHEN** an item is selected
- **THEN** the screen SHALL display a warehouse selector
- **AND** default to the user's primary warehouse (or the organization's default warehouse)
- **AND** show the current stock on hand at the selected warehouse
- **AND** if the item only has stock in one warehouse, auto-select that warehouse

#### Scenario: Warehouse stock display
- **WHEN** a warehouse is selected
- **THEN** the screen SHALL display: "Current Stock at [Warehouse Name]: [stockOnHand] [unit]"

#### Scenario: Step 3 - Enter adjustment quantity
- **WHEN** the warehouse is selected
- **THEN** the screen SHALL display:
  - A quantity input field with a numeric keypad
  - Toggle buttons or a sign toggle: "Increase (+)" and "Decrease (-)"
  - The default selection SHALL be "Increase (+)"
  - A preview showing: "New stock level: [current + adjustment]" or "[current - adjustment]"

#### Scenario: Negative adjustment validation
- **WHEN** the user enters a negative adjustment (decrease) that would result in stock below zero
- **THEN** the input SHALL display a warning: "Adjustment would result in negative stock ([calculated value])"
- **AND** the submit button SHALL still be enabled (the backend enforces the hard validation)

#### Scenario: Zero quantity validation
- **WHEN** the user enters 0 as the adjustment quantity
- **THEN** the submit button SHALL be disabled
- **AND** display a hint: "Enter a quantity greater than 0"

#### Scenario: Step 4 - Select reason
- **WHEN** the quantity is entered
- **THEN** the screen SHALL display a reason selector with the following options:
  - **Damaged** (maps to `DAMAGE`)
  - **Lost** (maps to `LOSS`)
  - **Found** (maps to `FOUND`)
  - **Count Correction** (maps to `CORRECTION`)
  - **Return** (maps to `RETURN`)
  - **Opening Stock** (maps to `OPENING_STOCK`)
  - **Other** (maps to `OTHER`)
- **AND** the reason SHALL be required (no default selection)

#### Scenario: Step 5 - Optional note
- **WHEN** a reason is selected
- **THEN** the screen SHALL display an optional multi-line text field for notes
- **AND** the placeholder text SHALL read "Add a note (optional)"
- **AND** maximum length SHALL be 500 characters

#### Scenario: Adjustment form layout
- **WHEN** all steps are presented
- **THEN** the form SHALL be a single scrollable screen (not a stepper wizard)
- **AND** sections SHALL be visually separated with dividers or cards
- **AND** the submit button SHALL be fixed at the bottom of the screen

#### Scenario: Submit adjustment
- **WHEN** the user taps "Submit Adjustment"
- **THEN** the app SHALL display a confirmation dialog:
  - Title: "Confirm Stock Adjustment"
  - Body: "[Item Name] at [Warehouse]: [+/-][Quantity] [Unit] (Reason: [Reason])"
  - Buttons: "Cancel" and "Confirm"

#### Scenario: Confirmed submission
- **WHEN** the user taps "Confirm"
- **THEN** the app SHALL call `POST /api/v1/inventory/adjustments` with:
  ```json
  {
    "itemId": "<item_id>",
    "warehouseId": "<warehouse_id>",
    "quantity": <signed_quantity>,
    "reason": "<REASON_CODE>",
    "notes": "<optional_notes>"
  }
  ```
- **AND** display a loading overlay during the request

#### Scenario: Successful submission
- **WHEN** the API returns 201 Created
- **THEN** the app SHALL:
  1. Display a success animation (green checkmark with "Adjustment Saved")
  2. Show the adjustment summary briefly (2 seconds)
  3. Navigate back to the previous screen (item detail or dashboard)

#### Scenario: Submission error
- **WHEN** the API returns an error (400, 500)
- **THEN** the app SHALL display the error message from the backend in a snackbar
- **AND** keep the form data intact for retry

#### Scenario: Insufficient stock error
- **WHEN** the API returns 400 with "Insufficient stock"
- **THEN** the app SHALL display: "Cannot decrease stock below zero. Current stock: [value]"

### Requirement: Batch adjustment (stocktake mode)
The app SHALL support a batch stocktake workflow where users count multiple items and submit adjustments in bulk.

#### Scenario: Stocktake entry
- **WHEN** the user navigates to `/inventory/stocktake`
- **THEN** the screen SHALL first prompt to select a warehouse from a dropdown
- **AND** after selection, display the stocktake item list

#### Scenario: Stocktake warehouse selection
- **WHEN** the warehouse is selected
- **THEN** the app SHALL load the list of items with stock at that warehouse (or all items)
- **AND** display the warehouse name as a header

#### Scenario: Add items to stocktake
- **WHEN** the stocktake screen is active
- **THEN** the user SHALL be able to add items via:
  - "Scan" button that opens the barcode scanner in batch mode
  - "Search" button that opens the item search for manual selection
  - Items can also be pre-populated from a batch scan session

#### Scenario: Stocktake item row
- **WHEN** an item is in the stocktake list
- **THEN** each row SHALL display:
  - Item name and SKU
  - System stock: the current `stockOnHand` at the selected warehouse (read-only)
  - Actual count: an editable numeric input field
  - Variance: `actualCount - systemCount` (calculated automatically)
  - Variance color: green if positive, red if negative, gray if zero

#### Scenario: Enter actual count
- **WHEN** the user taps the "Actual Count" field for an item
- **THEN** a numeric keypad SHALL appear for entering the physical count
- **AND** the variance SHALL update in real-time as the count changes

#### Scenario: Remove item from stocktake
- **WHEN** the user swipes left on an item row (or taps a delete icon)
- **THEN** the item SHALL be removed from the stocktake list
- **AND** a brief undo snackbar SHALL appear

#### Scenario: Stocktake review
- **WHEN** the user taps "Review" (or scrolls to the bottom and taps "Review Adjustments")
- **THEN** the app SHALL navigate to a review screen showing:
  - Total items counted: [count]
  - Items with variance: [count]
  - Items with no variance: [count] (these will be skipped)
  - A list of all items with non-zero variance, showing: item name, system count, actual count, adjustment (+/-)

#### Scenario: Stocktake submission
- **WHEN** the user taps "Submit Stocktake" on the review screen
- **THEN** the app SHALL display a confirmation dialog:
  - Title: "Submit Stocktake?"
  - Body: "This will create [N] stock adjustments at [Warehouse Name]. This action cannot be undone."
  - Buttons: "Cancel" and "Submit"

#### Scenario: Confirmed stocktake submission
- **WHEN** the user confirms submission
- **THEN** the app SHALL call `POST /api/v1/inventory/adjustments/bulk` with:
  ```json
  {
    "adjustments": [
      {
        "itemId": "<id>",
        "warehouseId": "<warehouse_id>",
        "quantity": <variance>,
        "reason": "CORRECTION",
        "notes": "Stocktake adjustment on <date>"
      }
    ]
  }
  ```
  for each item where variance != 0

#### Scenario: Successful stocktake submission
- **WHEN** the bulk adjustment API returns success
- **THEN** the app SHALL display a success screen:
  - Green checkmark animation
  - "[N] adjustments saved successfully"
  - "Return to Dashboard" button

#### Scenario: Partial stocktake failure
- **WHEN** the bulk adjustment API returns an error (transaction rollback)
- **THEN** the app SHALL display the error message
- **AND** keep all stocktake data intact for retry
- **AND** NOT mark any adjustments as submitted

### Requirement: Offline adjustment support
The app SHALL queue stock adjustments when offline and sync when connectivity is restored.

#### Scenario: Offline adjustment creation
- **WHEN** the device is offline and the user submits a stock adjustment
- **THEN** the app SHALL:
  1. Store the adjustment payload in the Hive `offline_queue` box
  2. Show a success message: "Adjustment saved offline. It will sync when you reconnect."
  3. Navigate back as if the submission succeeded

#### Scenario: Offline queue indicator
- **WHEN** there are pending offline adjustments
- **THEN** the app SHALL display a badge or indicator on the inventory section: "X pending sync"

#### Scenario: Automatic sync on reconnection
- **WHEN** the device regains internet connectivity
- **THEN** the app SHALL automatically process the offline queue in FIFO order
- **AND** for each queued adjustment, call the appropriate API endpoint
- **AND** on success, remove the item from the queue
- **AND** on failure, mark it as failed and keep it in the queue for manual retry

#### Scenario: Sync conflict
- **WHEN** an offline adjustment fails on sync (e.g., item deleted, insufficient stock)
- **THEN** the app SHALL:
  - Show a notification: "1 adjustment failed to sync"
  - Provide a "View Failed" screen showing the failed adjustment details and the error message
  - Allow the user to retry or discard the failed adjustment

#### Scenario: Offline batch stocktake
- **WHEN** the device is offline during a batch stocktake submission
- **THEN** the entire batch SHALL be queued as a single offline operation
- **AND** synced as a bulk request when connectivity returns

### Requirement: Recent adjustments list
The app SHALL display a list of recent adjustments for review.

#### Scenario: Recent adjustments screen
- **WHEN** the user navigates to adjustment history (accessible from the inventory section)
- **THEN** the app SHALL call `GET /api/v1/inventory/adjustments?limit=20` and display a list

#### Scenario: Adjustment list item
- **WHEN** adjustments are displayed
- **THEN** each row SHALL show:
  - Item name and SKU
  - Warehouse name
  - Adjustment quantity (with + or - sign)
  - Reason code
  - Date and time
  - Created by user name

#### Scenario: Adjustment list pagination
- **WHEN** the user scrolls to the bottom
- **THEN** the app SHALL load the next page of adjustments

#### Scenario: Adjustment list filters
- **WHEN** the user taps a filter button
- **THEN** they SHALL be able to filter by:
  - Item (search)
  - Warehouse
  - Reason code
  - Date range

### Requirement: Confirmation and success UX
The app SHALL provide clear confirmation dialogs before submission and success feedback after.

#### Scenario: Confirmation dialog
- **WHEN** a confirmation dialog is shown
- **THEN** it SHALL be a modal dialog (not a bottom sheet)
- **AND** the "Cancel" button SHALL be on the left (secondary style)
- **AND** the "Confirm"/"Submit" button SHALL be on the right (primary style)

#### Scenario: Success animation
- **WHEN** a submission succeeds
- **THEN** the app SHALL display a brief full-screen overlay with:
  - Green checkmark icon (animated scale-in)
  - Summary text
  - Auto-dismiss after 2 seconds, or tap to dismiss immediately

## API Endpoints Used

```
POST  /api/v1/inventory/adjustments           - Create single stock adjustment
POST  /api/v1/inventory/adjustments/bulk       - Create bulk stock adjustments (stocktake)
GET   /api/v1/inventory/adjustments            - List adjustments (with pagination and filters)
GET   /api/v1/inventory/stock/:itemId          - Get current stock levels for an item
GET   /api/v1/items?search=<query>             - Search items for item selection
GET   /api/v1/warehouses                       - List warehouses for selection
```

## Data Models

```dart
// features/inventory/domain/models/stock_adjustment.dart

@freezed
class StockAdjustmentRequest with _$StockAdjustmentRequest {
  const factory StockAdjustmentRequest({
    required String itemId,
    required String warehouseId,
    required int quantity,       // Signed: positive for increase, negative for decrease
    required String reason,      // DAMAGE, LOSS, FOUND, CORRECTION, RETURN, OPENING_STOCK, OTHER
    String? notes,
  }) = _StockAdjustmentRequest;

  factory StockAdjustmentRequest.fromJson(Map<String, dynamic> json) =>
      _$StockAdjustmentRequestFromJson(json);
}

@freezed
class StockAdjustment with _$StockAdjustment {
  const factory StockAdjustment({
    required String id,
    required String itemId,
    required String itemName,
    required String itemSku,
    required String warehouseId,
    required String warehouseName,
    required int quantity,
    required String reason,
    String? notes,
    required String createdById,
    required String createdByName,
    required DateTime adjustmentDate,
    required DateTime createdAt,
  }) = _StockAdjustment;

  factory StockAdjustment.fromJson(Map<String, dynamic> json) =>
      _$StockAdjustmentFromJson(json);
}

@freezed
class BulkAdjustmentRequest with _$BulkAdjustmentRequest {
  const factory BulkAdjustmentRequest({
    required List<StockAdjustmentRequest> adjustments,
  }) = _BulkAdjustmentRequest;
}

@freezed
class StocktakeEntry with _$StocktakeEntry {
  const factory StocktakeEntry({
    required String itemId,
    required String itemName,
    required String sku,
    required String warehouseId,
    required int systemCount,
    required int actualCount,
  }) = _StocktakeEntry;
}

// Offline queue entry
@freezed
class OfflineQueueEntry with _$OfflineQueueEntry {
  const factory OfflineQueueEntry({
    required String id,            // UUID for tracking
    required String type,          // 'adjustment', 'bulk_adjustment', 'sale'
    required Map<String, dynamic> payload,
    required DateTime queuedAt,
    @Default(0) int retryCount,
    String? lastError,
    @Default('pending') String status,  // 'pending', 'syncing', 'failed'
  }) = _OfflineQueueEntry;
}
```

## Adjustment Reason Codes

| Display Label      | API Code       | Typical Direction |
|-------------------|----------------|-------------------|
| Damaged           | `DAMAGE`       | Decrease (-)      |
| Lost              | `LOSS`         | Decrease (-)      |
| Found             | `FOUND`        | Increase (+)      |
| Count Correction  | `CORRECTION`   | Either (+/-)      |
| Return            | `RETURN`       | Increase (+)      |
| Opening Stock     | `OPENING_STOCK`| Increase (+)      |
| Other             | `OTHER`        | Either (+/-)      |
