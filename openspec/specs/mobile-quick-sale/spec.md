# Mobile Quick Sale / Invoice Specification

> **Implementation Note (2026-02-10):** The actual implementation uses **React Native with Expo** instead of Flutter. The behavioral requirements below remain valid; Dart/Flutter code examples should be mapped to TypeScript/React Native equivalents.

## Purpose
Provide a streamlined, mobile-first sale flow for counter and walk-in sales, enabling users to add items (via search or barcode scan), adjust quantities and discounts, select customers, calculate taxes (SST), generate invoices, accept payments, and share receipts via Bluetooth printing or PDF sharing. Integrates with the existing backend sales and invoice endpoints.

## Requirements

### Requirement: Quick sale initiation
The app SHALL provide multiple entry points for starting a new sale.

#### Scenario: New Sale from dashboard
- **WHEN** the user taps "New Sale" on the dashboard quick actions
- **THEN** the app SHALL navigate to `/sales/new` with an empty sale cart

#### Scenario: New Sale from scanner
- **WHEN** the user has scanned items in "Sale Scan" mode and taps "Checkout"
- **THEN** the app SHALL navigate to `/sales/new` with the scanned items pre-populated in the cart

#### Scenario: New Sale from navigation
- **WHEN** the user taps "New Sale" from the bottom navigation or app drawer
- **THEN** the app SHALL navigate to `/sales/new` with an empty sale cart

### Requirement: Add items to sale
The app SHALL allow adding items to the sale via search or barcode scan.

#### Scenario: Search to add
- **WHEN** the sale screen is displayed
- **THEN** a search bar at the top SHALL allow searching items by name, SKU, or part number
- **AND** search results SHALL appear in a dropdown below the search bar
- **AND** tapping a result SHALL add the item to the cart with quantity 1

#### Scenario: Scan to add
- **WHEN** the user taps a barcode icon button next to the search bar
- **THEN** the app SHALL open the barcode scanner in sale-scan mode
- **AND** scanned items SHALL be added to the cart
- **AND** the user can return to the sale screen at any time

#### Scenario: Duplicate item add
- **WHEN** an item that is already in the cart is added again (via search or scan)
- **THEN** the existing line item quantity SHALL be incremented by 1
- **AND** the line total SHALL be recalculated

#### Scenario: Add item from recent
- **WHEN** the search field is focused with no text entered
- **THEN** the app SHALL display a "Recent Items" section below showing the last 10 items added to sales

### Requirement: Line item management
The app SHALL display and allow editing of individual line items in the sale.

#### Scenario: Line item display
- **WHEN** items are in the cart
- **THEN** each line item SHALL display:
  - Item name (primary text)
  - SKU (secondary text, gray)
  - Unit price (formatted as RM)
  - Quantity stepper: minus button, quantity value, plus button
  - Line total (quantity * unit price - line discount)
  - Swipe-left to delete (or delete icon button)

#### Scenario: Quantity stepper
- **WHEN** the user taps the "+" button on a line item
- **THEN** the quantity SHALL increment by 1 and the line total SHALL recalculate

#### Scenario: Quantity decrease
- **WHEN** the user taps the "-" button on a line item
- **THEN** the quantity SHALL decrement by 1
- **AND** if quantity reaches 0, the app SHALL show a confirmation: "Remove this item?"

#### Scenario: Manual quantity entry
- **WHEN** the user taps the quantity value between the +/- buttons
- **THEN** a numeric input dialog SHALL appear for entering a specific quantity
- **AND** the quantity SHALL accept decimal values for items sold by weight/measure

#### Scenario: Line item price edit
- **WHEN** the user taps the unit price on a line item
- **THEN** a numeric input dialog SHALL appear for overriding the unit price
- **AND** the overridden price SHALL display a visual indicator (e.g., italic or different color)

#### Scenario: Line item discount
- **WHEN** the user taps a line item to expand it (or taps a discount icon)
- **THEN** an inline discount entry SHALL appear with:
  - Toggle: "%" (percentage) or "RM" (fixed amount)
  - Input field for the discount value
  - The line total SHALL recalculate reflecting the discount

#### Scenario: Remove line item
- **WHEN** the user swipes left on a line item or taps the delete button
- **THEN** the item SHALL be removed from the cart
- **AND** totals SHALL recalculate
- **AND** an undo snackbar SHALL appear briefly

#### Scenario: Empty cart
- **WHEN** all items are removed from the cart
- **THEN** the screen SHALL display an empty state: "Add items to start a sale"
- **AND** the search/scan area SHALL be prominently displayed

### Requirement: Customer selection
The app SHALL allow selecting a customer for the sale, defaulting to a walk-in customer.

#### Scenario: Default walk-in customer
- **WHEN** a new sale is started
- **THEN** the customer SHALL default to "Walk-in Customer"
- **AND** a label SHALL display "Walk-in Customer" with a "Change" button

#### Scenario: Select customer
- **WHEN** the user taps "Change" on the customer section
- **THEN** a bottom sheet SHALL display:
  - A search field to search customers by name, company, or phone
  - A list of matching customers from `GET /api/v1/contacts?type=CUSTOMER`
  - "Walk-in Customer" option always available at the top

#### Scenario: Customer price list
- **WHEN** a customer with an assigned price list is selected
- **THEN** the app SHALL apply the customer's price list prices to all line items
- **AND** display a note: "Prices from [Price List Name]"
- **AND** existing line items SHALL have their prices updated (unless manually overridden)

#### Scenario: Customer tax exemption
- **WHEN** a tax-exempt customer is selected
- **THEN** the app SHALL remove tax from all line items
- **AND** display a note: "Tax-exempt customer"

### Requirement: Totals calculation
The app SHALL calculate and display subtotal, discount, tax, and total in real-time.

#### Scenario: Totals section layout
- **WHEN** items are in the cart
- **THEN** a totals section at the bottom of the screen SHALL display:
  - **Subtotal**: sum of all line totals before order-level discount and tax
  - **Discount**: order-level discount amount (if applied)
  - **Tax (SST)**: total tax amount calculated per line item tax settings
  - **Total**: subtotal - discount + tax
  - All values formatted as RM currency

#### Scenario: Order-level discount
- **WHEN** the user taps "Add Discount" in the totals section
- **THEN** a dialog SHALL appear with:
  - Toggle: "%" (percentage) or "RM" (fixed amount)
  - Input field for the discount value
  - "Apply" and "Cancel" buttons
- **AND** the discount SHALL be applied to the subtotal before tax

#### Scenario: Tax calculation
- **WHEN** calculating taxes
- **THEN** the app SHALL:
  1. For each line item, determine the applicable tax rate from the item's `taxRateId`
  2. Calculate tax on the discounted line total: `taxAmount = lineTotal * (taxRate / 100)`
  3. Sum all line-level taxes for the total tax
  4. Respect the organization's tax-inclusive/exclusive setting
  5. Apply Malaysian SST rounding rules per the organization's `roundingMethod`

#### Scenario: Tax-inclusive pricing
- **WHEN** the organization has `taxInclusive: true`
- **THEN** displayed prices SHALL include tax
- **AND** the totals SHALL show: "Prices are tax-inclusive"
- **AND** the tax line in totals SHALL show the tax component extracted from the inclusive prices

#### Scenario: Tax breakdown
- **WHEN** the user taps on the tax amount
- **THEN** a dialog SHALL show the tax breakdown:
  - Each unique tax rate with: tax name, taxable amount, tax amount
  - E.g., "Sales Tax 10%: RM 234.00 on RM 2,340.00"

### Requirement: Sale completion
The app SHALL allow the user to choose between creating an Invoice or a Sales Order.

#### Scenario: Review before completion
- **WHEN** the user taps "Review Sale" (primary button at the bottom)
- **THEN** the app SHALL navigate to a review screen showing:
  - Customer name
  - All line items with quantities and prices
  - Totals breakdown (subtotal, discount, tax, total)
  - Option to add sale notes
  - Two action buttons: "Create Invoice" and "Create Sales Order"

#### Scenario: Create Invoice
- **WHEN** the user taps "Create Invoice"
- **THEN** the app SHALL call `POST /api/sales/invoices` with:
  ```json
  {
    "customerId": "<customer_id>",
    "invoiceDate": "<today>",
    "dueDate": "<based on payment terms>",
    "items": [
      {
        "itemId": "<id>",
        "quantity": <qty>,
        "unitPrice": <price>,
        "discountPercent": <disc%>,
        "taxRateId": "<tax_rate_id>"
      }
    ],
    "discountType": "PERCENTAGE|FIXED",
    "discountValue": <value>,
    "notes": "<optional notes>"
  }
  ```

#### Scenario: Create Sales Order
- **WHEN** the user taps "Create Sales Order"
- **THEN** the app SHALL call `POST /api/sales/orders` with the equivalent payload
- **AND** set status to `CONFIRMED` for immediate sales

#### Scenario: Successful creation
- **WHEN** the invoice or sales order is created successfully
- **THEN** the app SHALL navigate to the receipt screen with the created document details

### Requirement: Payment recording
The app SHALL allow recording payment against the created invoice.

#### Scenario: Payment method selection
- **WHEN** the receipt screen is displayed
- **THEN** it SHALL show payment method options:
  - **Cash**: manual entry of amount received, calculate change
  - **Card**: mark as paid by card (no processing, record only)
  - **FPX/DuitNow**: mark as paid by electronic transfer (if configured)
  - **Skip**: do not record payment now (leave invoice as unpaid)

#### Scenario: Cash payment
- **WHEN** the user selects "Cash"
- **THEN** a dialog SHALL display:
  - Total due amount
  - "Amount Received" input field (numeric, pre-filled with the total)
  - "Change" calculated automatically: `amountReceived - total`
  - Quick amount buttons for common denominations (RM 50, RM 100)
  - "Confirm" button

#### Scenario: Cash payment confirmation
- **WHEN** the user confirms cash payment
- **THEN** the app SHALL call `POST /api/sales/invoices/:id/payment` with:
  ```json
  {
    "amount": <amount_received_up_to_total>,
    "paymentMethod": "CASH",
    "paymentDate": "<now>",
    "reference": "Cash"
  }
  ```

#### Scenario: Card payment
- **WHEN** the user selects "Card"
- **THEN** a dialog SHALL display:
  - Total due amount
  - Optional reference number field (for card transaction reference)
  - "Confirm" button
- **AND** on confirmation, record the payment with `paymentMethod: "CARD"`

#### Scenario: FPX/DuitNow payment
- **WHEN** the user selects "FPX/DuitNow"
- **THEN** a dialog SHALL display:
  - Total due amount
  - Reference number field (required)
  - "Confirm" button
- **AND** on confirmation, record the payment with `paymentMethod: "BANK_TRANSFER"`

### Requirement: Receipt generation and sharing
The app SHALL generate a receipt that can be printed via Bluetooth or shared digitally.

#### Scenario: Receipt screen layout
- **WHEN** the sale is completed (with or without payment)
- **THEN** the receipt screen SHALL display:
  - A success header: "Sale Complete" with green checkmark
  - Invoice/Sales Order number
  - Customer name
  - Line items summary
  - Totals
  - Payment status (Paid / Unpaid / Amount received and change for cash)
  - Action buttons at the bottom

#### Scenario: Share receipt as PDF
- **WHEN** the user taps "Share PDF"
- **THEN** the app SHALL:
  1. Call `GET /api/sales/invoices/:id/pdf` to download the PDF
  2. Open the system share sheet via `share_plus`
  3. Allow sharing to WhatsApp, email, or any installed app
  4. The shared file SHALL be named `INV-XXXXXX.pdf`

#### Scenario: Bluetooth receipt printing
- **WHEN** the user taps "Print Receipt"
- **THEN** the app SHALL:
  1. Search for paired Bluetooth thermal printers
  2. Display a printer selection dialog if multiple printers are found
  3. Format the receipt for ESC/POS thermal printing using `esc_pos_printer` or equivalent
  4. Print the receipt with: company name, invoice number, date, line items, totals, payment info

#### Scenario: Receipt print format
- **WHEN** printing to a thermal printer (58mm or 80mm width)
- **THEN** the receipt SHALL include:
  - Company/organization name (centered, bold)
  - Company address and phone
  - SST registration number (if registered)
  - Separator line
  - Invoice number and date
  - Customer name
  - Separator line
  - Line items: item name, qty x price, total (right-aligned)
  - Separator line
  - Subtotal, Discount (if any), Tax, **Total** (bold)
  - Payment method and amount
  - Change (if cash)
  - Separator line
  - "Thank you for your purchase!" (centered)
  - Optional: QR code for e-Invoice reference

#### Scenario: No printer found
- **WHEN** no Bluetooth printers are found
- **THEN** the app SHALL display: "No printers found. Pair a Bluetooth printer in your device settings."
- **AND** provide a "Share PDF" fallback

#### Scenario: New sale after receipt
- **WHEN** the user taps "New Sale" on the receipt screen
- **THEN** the app SHALL navigate to a fresh sale screen (`/sales/new`) with an empty cart

#### Scenario: Back to dashboard
- **WHEN** the user taps "Done" on the receipt screen
- **THEN** the app SHALL navigate to the dashboard

### Requirement: Price list integration
The app SHALL apply customer-specific price lists when available.

#### Scenario: Customer has price list
- **WHEN** a customer with `priceListId` is selected
- **THEN** the app SHALL fetch the price list via `GET /api/v1/price-lists/:id`
- **AND** for each item in the cart that exists in the price list, override the unit price with the price list value

#### Scenario: Price list override indicator
- **WHEN** a line item's price comes from a price list
- **THEN** the unit price SHALL display with a small label: "Price list"
- **AND** the user SHALL still be able to manually override the price

#### Scenario: No price list
- **WHEN** the customer does not have an assigned price list (or is Walk-in Customer)
- **THEN** item prices SHALL use the default `sellingPrice`

### Requirement: Offline sale support
The app SHALL allow creating sales when offline, with sync on reconnection.

#### Scenario: Offline sale creation
- **WHEN** the device is offline and the user completes a sale
- **THEN** the app SHALL:
  1. Store the complete sale payload in the Hive `offline_queue` box
  2. Generate a temporary local reference number: "DRAFT-XXXXXXXX"
  3. Show success: "Sale saved offline. Invoice will be created when you reconnect."
  4. Navigate to a simplified receipt screen showing the offline sale details

#### Scenario: Offline sale sync
- **WHEN** the device reconnects
- **THEN** the app SHALL process queued sales in order
- **AND** create the invoice/sales order via the API
- **AND** replace the temporary reference with the real invoice/order number
- **AND** show a notification: "Offline sale synced: INV-XXXXXX"

#### Scenario: Offline price data
- **WHEN** the device is offline
- **THEN** the app SHALL use cached item prices from the Hive `items_cache`
- **AND** display a warning: "Using cached prices. Prices may have changed."

## API Endpoints Used

```
GET    /api/v1/items?search=<query>           - Search items for cart
GET    /api/v1/contacts?type=CUSTOMER         - Search customers
GET    /api/v1/price-lists/:id                - Fetch price list for customer
POST   /api/sales/invoices                    - Create invoice
POST   /api/sales/orders                      - Create sales order
POST   /api/sales/invoices/:id/payment        - Record payment
GET    /api/sales/invoices/:id/pdf            - Download invoice PDF
GET    /api/settings/tax-rates                - Get tax rates for calculation
```

## Data Models

```dart
// features/sales/domain/models/sale_draft.dart

@freezed
class SaleDraft with _$SaleDraft {
  const factory SaleDraft({
    @Default([]) List<SaleLineItem> items,
    String? customerId,
    String? customerName,
    String? priceListId,
    String? discountType,         // 'PERCENTAGE', 'FIXED'
    @Default(0) double discountValue,
    @Default(0) double discountAmount,
    String? notes,
  }) = _SaleDraft;
}

@freezed
class SaleLineItem with _$SaleLineItem {
  const factory SaleLineItem({
    required String itemId,
    required String itemName,
    required String sku,
    required String unit,
    required double unitPrice,
    required double quantity,
    @Default('PERCENTAGE') String discountType,
    @Default(0) double discountValue,
    @Default(0) double discountAmount,
    String? taxRateId,
    String? taxRateName,
    @Default(0) double taxRatePercent,
    @Default(0) double taxAmount,
    required double lineTotal,
    bool? priceFromPriceList,
    bool? priceManuallyOverridden,
  }) = _SaleLineItem;
}

@freezed
class PaymentRecord with _$PaymentRecord {
  const factory PaymentRecord({
    required double amount,
    required String paymentMethod,    // 'CASH', 'CARD', 'BANK_TRANSFER'
    required DateTime paymentDate,
    String? reference,
    double? amountReceived,           // For cash (may be more than total)
    double? changeGiven,              // For cash
  }) = _PaymentRecord;
}

@freezed
class SaleResult with _$SaleResult {
  const factory SaleResult({
    required String documentType,     // 'invoice', 'sales_order'
    required String documentId,
    required String documentNumber,   // 'INV-000001' or 'SO-000001'
    required double total,
    String? paymentStatus,
  }) = _SaleResult;
}
```

## Sale Calculation Logic

```dart
// Calculation pseudocode
double calculateLineTotal(SaleLineItem item) {
  double baseTotal = item.unitPrice * item.quantity;
  double discount = item.discountType == 'PERCENTAGE'
      ? baseTotal * (item.discountValue / 100)
      : item.discountValue;
  return baseTotal - discount;
}

double calculateLineTax(SaleLineItem item, bool taxInclusive) {
  double lineTotal = calculateLineTotal(item);
  if (taxInclusive) {
    return lineTotal - (lineTotal / (1 + item.taxRatePercent / 100));
  } else {
    return lineTotal * (item.taxRatePercent / 100);
  }
}

double calculateOrderTotal(SaleDraft draft, bool taxInclusive) {
  double subtotal = draft.items.fold(0, (sum, item) => sum + calculateLineTotal(item));
  double orderDiscount = draft.discountType == 'PERCENTAGE'
      ? subtotal * (draft.discountValue / 100)
      : draft.discountValue;
  double taxableSubtotal = subtotal - orderDiscount;
  double tax = draft.items.fold(0, (sum, item) => sum + calculateLineTax(item, taxInclusive));
  if (taxInclusive) {
    return taxableSubtotal; // Tax is already included
  } else {
    return taxableSubtotal + tax;
  }
}
```
