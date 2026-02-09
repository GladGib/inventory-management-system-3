# Mobile Barcode Scanning Specification

> **Implementation Note (2026-02-10):** The actual implementation uses **React Native with Expo** instead of Flutter. Technology mapping: mobile_scanner → expo-camera/expo-barcode-scanner. The behavioral requirements below remain valid.

## Purpose
Provide camera-based barcode and QR code scanning for the mobile app, enabling quick item lookup, batch scanning for stocktakes, and scan-to-sale workflows. Uses expo-camera with barcode scanning for reliable, performant barcode detection.

## Requirements

### Requirement: Scanner screen
The app SHALL provide a dedicated barcode scanner screen accessible from the dashboard quick actions and navigation.

#### Scenario: Scanner screen layout
- **WHEN** the user navigates to `/scan`
- **THEN** the screen SHALL display:
  - Full-screen camera viewfinder
  - A semi-transparent overlay with a rectangular cutout (scan area guide)
  - Animated scan line or corner brackets indicating the active scan area
  - A flashlight toggle button (top-right corner)
  - A scan mode selector (bottom, above the nav bar)
  - A close/back button (top-left corner)

#### Scenario: Camera permission request
- **WHEN** the scanner screen is opened for the first time
- **THEN** the app SHALL request camera permission via `permission_handler`
- **AND** display a rationale dialog: "Camera access is needed to scan barcodes and QR codes for item lookup."

#### Scenario: Camera permission denied
- **WHEN** the user denies camera permission
- **THEN** the scanner screen SHALL display:
  - An icon (camera with a slash)
  - Text: "Camera permission is required to scan barcodes"
  - A button: "Open Settings" that navigates to the app settings page via `openAppSettings()`
  - A button: "Search Manually" that navigates to the item search screen

#### Scenario: Camera permission permanently denied
- **WHEN** the user has permanently denied camera permission
- **THEN** the app SHALL show the same UI as "denied" with the "Open Settings" button

### Requirement: Barcode format support
The scanner SHALL support industry-standard barcode formats used in inventory management.

#### Scenario: Supported barcode formats
- **WHEN** the `MobileScanner` widget is configured
- **THEN** it SHALL accept the following formats:
  - **Code 128**: common for shipping and logistics labels
  - **EAN-13**: standard retail barcodes (13-digit)
  - **EAN-8**: compact retail barcodes (8-digit)
  - **UPC-A**: North American retail product codes
  - **QR Code**: for item links, batch info, or custom data
  - **Code 39**: used in automotive and defense industries
  - **Code 93**: compact alternative to Code 39
  - **ITF (Interleaved 2 of 5)**: used for packaging

#### Scenario: Format auto-detection
- **WHEN** a barcode is visible in the camera viewfinder
- **THEN** the scanner SHALL automatically detect and decode the barcode format
- **AND** return the decoded string value

### Requirement: Scan detection and feedback
The scanner SHALL provide immediate feedback when a barcode is detected.

#### Scenario: Successful scan detection
- **WHEN** a barcode is successfully decoded
- **THEN** the app SHALL:
  1. Trigger a short vibration (100ms) via the `vibration` package
  2. Play a beep sound effect (system sound or bundled audio file)
  3. Display the decoded value briefly on the overlay
  4. Proceed to item lookup based on the current scan mode

#### Scenario: Duplicate scan prevention
- **WHEN** the same barcode is scanned within 2 seconds of a previous scan
- **THEN** the scanner SHALL ignore the duplicate
- **AND** NOT trigger additional feedback

#### Scenario: Flashlight toggle
- **WHEN** the user taps the flashlight button
- **THEN** the camera torch SHALL toggle on/off
- **AND** the button icon SHALL reflect the current state (flash on/off)

### Requirement: Single scan mode
The scanner SHALL support a single-scan mode for individual item lookup.

#### Scenario: Single scan mode activation
- **WHEN** the scan mode selector shows "Single Scan" (default mode)
- **THEN** the scanner SHALL operate in single-item mode

#### Scenario: Single scan item found
- **WHEN** a barcode is scanned in single-scan mode
- **THEN** the app SHALL call `GET /api/v1/items?search=<barcode_value>` (searching SKU, barcode, partNumber)
- **AND** if exactly one item matches, navigate to the item detail screen (`/items/:id`)
- **AND** if multiple items match, display a disambiguation list for the user to select

#### Scenario: Single scan item not found
- **WHEN** a barcode is scanned and no matching item is found
- **THEN** the app SHALL display a bottom sheet with:
  - The scanned barcode value
  - Text: "Item not found"
  - Button: "Create New Item" (navigates to item creation with barcode pre-filled, future feature)
  - Button: "Search Manually" (navigates to item search with the barcode value pre-filled in the search bar)
  - Button: "Scan Again" (dismisses the bottom sheet and resumes scanning)

#### Scenario: Single scan loading
- **WHEN** the item lookup API call is in progress
- **THEN** the scanner SHALL pause scanning
- **AND** display a loading indicator overlaid on the camera view

### Requirement: Batch scan mode
The scanner SHALL support batch scanning for continuous multi-item capture, primarily for stocktake operations.

#### Scenario: Batch scan mode activation
- **WHEN** the user selects "Batch Scan" from the mode selector
- **THEN** the scanner SHALL operate in continuous scanning mode
- **AND** display a scanned items counter at the bottom: "X items scanned"

#### Scenario: Batch scan accumulation
- **WHEN** a barcode is scanned in batch mode
- **THEN** the app SHALL:
  1. Look up the item by barcode
  2. If found, add the item to an in-memory scanned items list
  3. If the item is already in the list, increment its count by 1
  4. Update the counter display
  5. Resume scanning immediately (no navigation)

#### Scenario: Batch scan item not found
- **WHEN** a barcode is scanned in batch mode and the item is not found
- **THEN** the app SHALL:
  1. Show a brief red flash overlay with "Item not found"
  2. Add the unknown barcode to a separate "unresolved" list
  3. Resume scanning

#### Scenario: Batch scan list view
- **WHEN** the user taps the scanned items counter
- **THEN** a bottom sheet SHALL expand showing:
  - List of scanned items with: item name, SKU, scanned count
  - Unresolved barcodes section (if any)
  - "Clear All" button
  - "Continue to Stocktake" button (navigates to batch stocktake screen with the scanned items)

#### Scenario: Batch scan to stocktake
- **WHEN** the user taps "Continue to Stocktake"
- **THEN** the app SHALL navigate to the batch stocktake screen (`/inventory/stocktake`)
- **AND** pre-populate the stocktake with the scanned items and their scanned counts as the "actual count"

### Requirement: Sale scan mode
The scanner SHALL support a sale-oriented scanning mode that adds items to a quick sale.

#### Scenario: Sale scan mode activation
- **WHEN** the user selects "Sale Scan" from the mode selector
- **THEN** the scanner SHALL operate in continuous mode
- **AND** display a running total at the bottom: "X items - RM Y,YYY.YY"

#### Scenario: Sale scan item add
- **WHEN** a barcode is scanned in sale mode
- **THEN** the app SHALL:
  1. Look up the item by barcode
  2. If found, add the item to the sale cart with quantity 1 at its selling price
  3. If the item is already in the cart, increment its quantity by 1
  4. Update the running total
  5. Show a brief confirmation: item name and "+ 1"
  6. Resume scanning

#### Scenario: Sale scan item not found
- **WHEN** an unrecognized barcode is scanned in sale mode
- **THEN** the app SHALL show a brief red flash overlay: "Item not found"
- **AND** resume scanning

#### Scenario: Sale scan to checkout
- **WHEN** the user taps the running total bar or a "Checkout" button
- **THEN** the app SHALL navigate to the quick sale screen (`/sales/new`)
- **AND** pre-populate the sale with all scanned items and their quantities

### Requirement: Scan history
The scanner SHALL maintain a local history of recent scans.

#### Scenario: History storage
- **WHEN** a barcode is scanned (any mode)
- **THEN** the app SHALL record in the Hive `scan_history` box:
  - `barcode`: the decoded value
  - `format`: the barcode format (e.g., "EAN-13")
  - `itemId`: the matched item ID (null if not found)
  - `itemName`: the matched item name (null if not found)
  - `scannedAt`: timestamp
  - `mode`: the scan mode ("single", "batch", "sale")

#### Scenario: History limit
- **WHEN** the scan history exceeds 50 entries
- **THEN** the oldest entries SHALL be evicted

#### Scenario: History access
- **WHEN** the user taps a "History" icon on the scanner screen
- **THEN** a bottom sheet or screen SHALL display the recent scan history
- **AND** tapping an entry SHALL navigate to the item detail (if itemId is not null) or initiate a new search

### Requirement: Batch stocktake mode
The scanner SHALL support a dedicated stocktake workflow combining scanning with count entry.

#### Scenario: Stocktake mode activation
- **WHEN** the user enters the stocktake flow (via dashboard quick action or scanner batch mode)
- **THEN** the app SHALL prompt the user to select a warehouse first

#### Scenario: Stocktake scan and count
- **WHEN** in stocktake mode, the user scans an item
- **THEN** the app SHALL:
  1. Look up the item
  2. Show the item with its current system stock level
  3. Prompt the user to enter the physical/actual count via a numeric keypad
  4. Store the entry: item, warehouse, system count, actual count, variance (actual - system)

#### Scenario: Stocktake manual entry
- **WHEN** an item cannot be scanned
- **THEN** the user SHALL be able to search and add items manually to the stocktake

#### Scenario: Stocktake review
- **WHEN** the user is done scanning/counting
- **THEN** the app SHALL display a review screen showing:
  - All items with system count, actual count, and variance
  - Items with variances highlighted (green for positive, red for negative)
  - Total items counted
  - Total variance items

#### Scenario: Stocktake submission
- **WHEN** the user taps "Submit Stocktake"
- **THEN** the app SHALL create stock adjustments for all items with non-zero variances
- **AND** call the bulk adjustment API endpoint
- **AND** each adjustment SHALL use reason "CORRECTION" with a note referencing the stocktake

## Scanner Configuration

```dart
// Scanner widget configuration
MobileScanner(
  controller: MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
    torchEnabled: false,
    formats: [
      BarcodeFormat.code128,
      BarcodeFormat.ean13,
      BarcodeFormat.ean8,
      BarcodeFormat.upcA,
      BarcodeFormat.qrCode,
      BarcodeFormat.code39,
      BarcodeFormat.code93,
      BarcodeFormat.itf,
    ],
  ),
  onDetect: (BarcodeCapture capture) {
    // Handle detected barcode
  },
)
```

## Data Models

```dart
// Scan history entry
@freezed
class ScanHistoryEntry with _$ScanHistoryEntry {
  const factory ScanHistoryEntry({
    required String barcode,
    required String format,
    String? itemId,
    String? itemName,
    required DateTime scannedAt,
    required String mode,    // 'single', 'batch', 'sale'
  }) = _ScanHistoryEntry;
}

// Batch scan item
@freezed
class BatchScanItem with _$BatchScanItem {
  const factory BatchScanItem({
    required String itemId,
    required String itemName,
    required String sku,
    required String barcode,
    required int scannedCount,
    required double sellingPrice,
  }) = _BatchScanItem;
}

// Stocktake entry
@freezed
class StocktakeEntry with _$StocktakeEntry {
  const factory StocktakeEntry({
    required String itemId,
    required String itemName,
    required String sku,
    required String warehouseId,
    required int systemCount,
    required int actualCount,
    required int variance,     // actualCount - systemCount
  }) = _StocktakeEntry;
}
```

## API Endpoints Used

```
GET  /api/v1/items?search=<barcode>          - Look up item by barcode/SKU/part number
GET  /api/v1/items/:id                       - Get item detail (after barcode match)
GET  /api/v1/inventory/stock/:itemId         - Get current stock levels for stocktake comparison
POST /api/v1/inventory/adjustments/bulk      - Submit batch stocktake adjustments
GET  /api/v1/warehouses                      - List warehouses for stocktake warehouse selection
```

## Permissions Required

| Permission | Platform | Purpose |
|-----------|----------|---------|
| Camera | iOS + Android | Barcode scanning via device camera |

## Accessibility

- The scanner screen SHALL announce "Barcode scanner active" via screen reader when opened
- Scan success SHALL be announced: "Item found: [item name]"
- Scan failure SHALL be announced: "Item not found for barcode [value]"
- The flashlight toggle SHALL have a semantic label: "Toggle flashlight"
- All buttons SHALL have accessible labels
