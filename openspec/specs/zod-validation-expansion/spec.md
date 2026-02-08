# Zod Validation Schema Expansion Specification

## Purpose
Expand the existing Zod validation schema coverage from the current 6 schema files (item, contact, sales-order, invoice, purchase-order, common) to cover ALL forms in the application, ensuring consistent client-side validation, type safety, and error messaging across every data entry surface.

## Architecture

### Target Directory
- All schemas: `apps/web/src/lib/validations/`
- Integration: Forms using either `zodResolver` from `@hookform/resolvers/zod` (for React Hook Form) or manual `schema.safeParse()` calls with Ant Design Form

### Existing Coverage
| File | Schemas |
|------|---------|
| `common.ts` | phoneSchema, emailSchema, postcodeSchema, currencySchema, priceSchema, quantitySchema, skuSchema, nameSchema, descriptionSchema, percentageSchema, taxRateSchema, sstNumberSchema, businessRegNoSchema, addressDataSchema, discountSchema |
| `item.ts` | createItemSchema, updateItemSchema |
| `contact.ts` | createContactSchema, updateContactSchema, createCustomerSchema, createVendorSchema |
| `sales-order.ts` | salesOrderItemSchema, createSalesOrderSchema, updateSalesOrderSchema |
| `invoice.ts` | invoiceItemSchema, createInvoiceSchema, updateInvoiceSchema |
| `purchase-order.ts` | purchaseOrderItemSchema, createPurchaseOrderSchema, updatePurchaseOrderSchema |
| `index.ts` | Barrel re-export |

### Design Principles
- Reuse common schemas (`nameSchema`, `priceSchema`, `quantitySchema`, `descriptionSchema`, etc.) from `common.ts` wherever possible.
- Export both the Zod schema and the inferred TypeScript type from each file.
- Use consistent error message patterns suitable for future i18n key extraction (e.g., `'Batch number is required'` rather than cryptic codes).
- Every schema file SHALL follow the naming convention: `create<Entity>Schema`, `update<Entity>Schema` (partial of create), and `<EntityName>Input` type aliases.

---

## Requirements

### Requirement: Batch validation schemas
The system SHALL provide Zod schemas for batch create/edit forms in `apps/web/src/lib/validations/batch.ts`.

#### Scenario: Create batch schema
- **WHEN** `createBatchSchema` is used to validate batch creation data
- **THEN** it SHALL enforce:
  - `batchNumber`: required string, min 1 character, max 50 characters, trimmed
  - `itemId`: required string, min 1 character (`'Item is required'`)
  - `warehouseId`: required string, min 1 character (`'Warehouse is required'`)
  - `quantity`: positive number using `quantitySchema` from common (`> 0`)
  - `expiryDate`: optional string (ISO date format) or null; if provided, must be a valid date string and must be in the future (`'Expiry date must be in the future'`)
  - `manufacturingDate`: optional string (ISO date format) or null
  - `supplier`: optional string, max 200 characters, or empty/null
  - `notes`: optional, reuse `descriptionSchema`

#### Scenario: Update batch schema
- **WHEN** `updateBatchSchema` is used
- **THEN** it SHALL be `createBatchSchema.partial()` (all fields optional)

#### Scenario: Date cross-validation
- **WHEN** both `manufacturingDate` and `expiryDate` are provided
- **THEN** the schema SHALL validate via `.refine()` that `expiryDate > manufacturingDate` with message `'Expiry date must be after manufacturing date'`

---

### Requirement: Serial number validation schemas
The system SHALL provide Zod schemas for serial number registration in `apps/web/src/lib/validations/serial.ts`.

#### Scenario: Single serial registration schema
- **WHEN** `createSerialSchema` is used
- **THEN** it SHALL enforce:
  - `serialNumber`: required string, min 1, max 100, trimmed (`'Serial number is required'`)
  - `itemId`: required string, min 1 (`'Item is required'`)
  - `warehouseId`: required string, min 1 (`'Warehouse is required'`)
  - `batchId`: optional string or null
  - `status`: optional enum `['AVAILABLE', 'COMMITTED', 'SOLD', 'RETURNED', 'DAMAGED']`, default `'AVAILABLE'`
  - `notes`: optional, reuse `descriptionSchema`

#### Scenario: Bulk serial registration schema
- **WHEN** `createBulkSerialsSchema` is used for generating multiple serials at once
- **THEN** it SHALL enforce:
  - `itemId`: required string, min 1
  - `warehouseId`: required string, min 1
  - `count`: required integer, min 1, max 1000 (`'Count must be between 1 and 1000'`)
  - `prefix`: optional string, max 20 characters, matching pattern `/^[A-Za-z0-9\-_]*$/` (`'Prefix can only contain letters, numbers, hyphens, and underscores'`)
  - `startNumber`: optional positive integer, default 1
  - `batchId`: optional string or null
  - `notes`: optional, reuse `descriptionSchema`

#### Scenario: Update serial schema
- **WHEN** `updateSerialSchema` is used
- **THEN** it SHALL allow updating only `status`, `warehouseId`, and `notes` (not `serialNumber` or `itemId`)

---

### Requirement: Composite item / BOM validation schemas
The system SHALL provide Zod schemas for BOM (Bill of Materials) management in `apps/web/src/lib/validations/composite.ts`.

#### Scenario: BOM component schema
- **WHEN** `bomComponentSchema` is used to validate a single BOM component entry
- **THEN** it SHALL enforce:
  - `componentItemId`: required string, min 1 (`'Component item is required'`)
  - `quantity`: positive number using `quantitySchema` (`> 0`)
  - `wastagePercent`: number, min 0, max 100, default 0 (`'Wastage must be between 0% and 100%'`), reuse `percentageSchema`
  - `notes`: optional, reuse `descriptionSchema`
  - `sortOrder`: optional non-negative integer, default 0

#### Scenario: Create composite item schema
- **WHEN** `createCompositeSchema` is used
- **THEN** it SHALL enforce:
  - `itemId`: required string, min 1 (`'Item is required'`)
  - `assemblyMethod`: optional enum `['MANUAL', 'AUTOMATIC']`, default `'MANUAL'`
  - `components`: required array of `bomComponentSchema`, min 1 item (`'At least one component is required'`)

#### Scenario: Update BOM schema
- **WHEN** `updateBOMSchema` is used
- **THEN** it SHALL enforce:
  - `components`: required array of `bomComponentSchema`, min 1 (`'At least one component is required'`)

#### Scenario: Self-referencing component guard
- **WHEN** `createCompositeSchema` is validated
- **THEN** a `.refine()` SHALL verify that no component in `components` has `componentItemId` equal to `itemId` with message `'A composite item cannot be a component of itself'`

#### Scenario: Assembly create schema
- **WHEN** `createAssemblySchema` is used to validate an assembly/disassembly operation
- **THEN** it SHALL enforce:
  - `compositeItemId`: required string, min 1
  - `warehouseId`: required string, min 1
  - `quantity`: positive number using `quantitySchema`
  - `type`: enum `['ASSEMBLY', 'DISASSEMBLY']`
  - `notes`: optional, reuse `descriptionSchema`

---

### Requirement: Reorder settings validation schemas
The system SHALL provide Zod schemas for reorder configuration in `apps/web/src/lib/validations/reorder.ts`.

#### Scenario: Update reorder settings schema
- **WHEN** `updateReorderSettingsSchema` is used
- **THEN** it SHALL enforce:
  - `reorderPoint`: number >= 0 using `nonNegativeQuantitySchema` (`'Reorder point cannot be negative'`)
  - `reorderQty`: positive number > 0 using `quantitySchema` (`'Reorder quantity must be greater than 0'`)
  - `leadTimeDays`: integer >= 0 (`'Lead time cannot be negative'`), max 365
  - `warehouseId`: optional string or null (null means organization-wide default)
  - `preferredVendorId`: optional string or null
  - `autoCreatePO`: optional boolean, default `false`

#### Scenario: Bulk reorder settings schema
- **WHEN** `bulkReorderSettingsSchema` is used to update multiple items' reorder settings at once
- **THEN** it SHALL enforce:
  - `items`: required array of objects, min 1, each containing:
    - `itemId`: required string, min 1
    - `reorderPoint`: number >= 0
    - `reorderQty`: number > 0
    - `leadTimeDays`: integer >= 0

#### Scenario: Reorder quantity exceeds reorder point logic
- **WHEN** both `reorderPoint` and `reorderQty` are provided
- **THEN** a `.refine()` SHALL validate that `reorderQty >= 1` (reorder quantity must be meaningful, but no strict relationship to reorder point is enforced since business logic varies)

---

### Requirement: E-Invoice settings validation schemas
The system SHALL provide Zod schemas for Malaysian MyInvois e-invoice configuration in `apps/web/src/lib/validations/einvoice.ts`.

#### Scenario: E-invoice settings schema
- **WHEN** `updateEInvoiceSettingsSchema` is used
- **THEN** it SHALL enforce:
  - `tin`: required string, 12 to 14 characters, matching pattern `/^[A-Z0-9]+$/` (`'TIN must be 12-14 alphanumeric characters'`)
  - `brn`: required string, min 5, max 30 characters (`'Business Registration Number is required'`)
  - `isProduction`: boolean, default `false`
  - `clientId`: optional string; required when `isProduction` is `true` (conditional refinement)
  - `clientSecret`: optional string; required when `isProduction` is `true`
  - `autoSubmit`: optional boolean, default `false`
  - `msicCode`: optional string, max 10 characters
  - `businessActivityDescription`: optional string, max 300 characters
  - `ssmRegNo`: optional string

#### Scenario: Production mode requires API credentials
- **WHEN** `isProduction` is set to `true`
- **THEN** a `.refine()` SHALL validate that both `clientId` and `clientSecret` are non-empty strings with message `'API credentials are required for production mode'`

#### Scenario: Sandbox mode does not require credentials
- **WHEN** `isProduction` is set to `false`
- **THEN** `clientId` and `clientSecret` MAY be empty or omitted

---

### Requirement: Warehouse validation schemas
The system SHALL provide Zod schemas for warehouse create/edit in `apps/web/src/lib/validations/warehouse.ts`.

#### Scenario: Create warehouse schema
- **WHEN** `createWarehouseSchema` is used
- **THEN** it SHALL enforce:
  - `name`: required, reuse `nameSchema` (min 1, max 200)
  - `code`: required string, min 2, max 10, matching pattern `/^[A-Z0-9\-]+$/` (`'Code must be 2-10 uppercase alphanumeric characters with optional hyphens'`)
  - `address`: optional, reuse `optionalAddressDataSchema`
  - `phone`: optional, reuse `optionalPhoneSchema`
  - `email`: optional, reuse `optionalEmailSchema`
  - `isDefault`: optional boolean, default `false`

#### Scenario: Update warehouse schema
- **WHEN** `updateWarehouseSchema` is used
- **THEN** it SHALL be `createWarehouseSchema.partial()`

---

### Requirement: Tax rate validation schemas
The system SHALL provide Zod schemas for tax rate management in `apps/web/src/lib/validations/tax-rate.ts`.

#### Scenario: Create tax rate schema
- **WHEN** `createTaxRateSchema` is used
- **THEN** it SHALL enforce:
  - `name`: required, reuse `nameSchema`
  - `code`: required string, min 1, max 20, matching pattern `/^[A-Z0-9\-_]+$/` (`'Code must be uppercase alphanumeric'`)
  - `rate`: required, reuse `taxRateSchema` from common (0-100, 2 decimal places)
  - `type`: required enum `['SST', 'SERVICE_TAX', 'SALES_TAX', 'EXEMPT', 'ZERO_RATED', 'CUSTOM']` (`'Tax type is required'`)
  - `description`: optional, reuse `descriptionSchema`
  - `isDefault`: optional boolean, default `false`
  - `isActive`: optional boolean, default `true`

#### Scenario: Update tax rate schema
- **WHEN** `updateTaxRateSchema` is used
- **THEN** it SHALL be `createTaxRateSchema.partial()`

---

### Requirement: Payment term validation schemas
The system SHALL provide Zod schemas for payment term configuration in `apps/web/src/lib/validations/payment-term.ts`.

#### Scenario: Create payment term schema
- **WHEN** `createPaymentTermSchema` is used
- **THEN** it SHALL enforce:
  - `name`: required, reuse `nameSchema` (`'Payment term name is required'`)
  - `days`: required integer >= 0, max 365 (`'Days must be between 0 and 365'`)
  - `description`: optional, reuse `descriptionSchema`
  - `isDefault`: optional boolean, default `false`

#### Scenario: Update payment term schema
- **WHEN** `updatePaymentTermSchema` is used
- **THEN** it SHALL be `createPaymentTermSchema.partial()`

---

### Requirement: Price list validation schemas
The system SHALL provide Zod schemas for price list management in `apps/web/src/lib/validations/price-list.ts`.

#### Scenario: Price list item entry schema
- **WHEN** `priceListItemSchema` is used for a single item within a price list
- **THEN** it SHALL enforce:
  - `itemId`: required string, min 1 (`'Item is required'`)
  - `unitPrice`: number >= 0, reuse `priceSchema` (`'Unit price must be 0 or greater'`)
  - `minQuantity`: optional positive number, default 1
  - `maxQuantity`: optional positive number or null

#### Scenario: Create price list schema
- **WHEN** `createPriceListSchema` is used
- **THEN** it SHALL enforce:
  - `name`: required, reuse `nameSchema` (`'Price list name is required'`)
  - `description`: optional, reuse `descriptionSchema`
  - `currency`: optional string, default `'MYR'`, max 3 characters
  - `isActive`: optional boolean, default `true`
  - `validFrom`: optional string (ISO date) or null
  - `validTo`: optional string (ISO date) or null
  - `items`: required array of `priceListItemSchema`, min 0 (empty list is allowed for initial creation)

#### Scenario: Date range validation
- **WHEN** both `validFrom` and `validTo` are provided
- **THEN** a `.refine()` SHALL validate that `validTo >= validFrom` with message `'End date must be on or after start date'`

#### Scenario: Min/max quantity validation
- **WHEN** both `minQuantity` and `maxQuantity` are provided on a `priceListItemSchema`
- **THEN** a `.refine()` SHALL validate that `maxQuantity >= minQuantity` with message `'Maximum quantity must be greater than or equal to minimum quantity'`

#### Scenario: Update price list schema
- **WHEN** `updatePriceListSchema` is used
- **THEN** it SHALL be `createPriceListSchema.partial()`

---

### Requirement: Inventory transfer validation schemas
The system SHALL provide Zod schemas for inventory transfers in `apps/web/src/lib/validations/transfer.ts`.

#### Scenario: Transfer item schema
- **WHEN** `transferItemSchema` is used for a single line item in a transfer
- **THEN** it SHALL enforce:
  - `itemId`: required string, min 1 (`'Item is required'`)
  - `quantity`: positive number using `quantitySchema` (`> 0`)
  - `notes`: optional, reuse `descriptionSchema`

#### Scenario: Create transfer schema
- **WHEN** `createTransferSchema` is used
- **THEN** it SHALL enforce:
  - `sourceWarehouseId`: required string, min 1 (`'Source warehouse is required'`)
  - `destinationWarehouseId`: required string, min 1 (`'Destination warehouse is required'`)
  - `transferDate`: required string, min 1 (`'Transfer date is required'`)
  - `referenceNumber`: optional string, max 100, or empty/null
  - `notes`: optional, reuse `descriptionSchema`
  - `items`: required array of `transferItemSchema`, min 1 (`'At least one item is required'`)

#### Scenario: Source and destination warehouse must differ
- **WHEN** `createTransferSchema` is validated
- **THEN** a `.refine()` SHALL verify that `sourceWarehouseId !== destinationWarehouseId` with message `'Source and destination warehouses must be different'`

---

### Requirement: Inventory adjustment validation schemas
The system SHALL provide Zod schemas for inventory adjustments in `apps/web/src/lib/validations/adjustment.ts`.

#### Scenario: Adjustment item schema
- **WHEN** `adjustmentItemSchema` is used for a single item in an adjustment
- **THEN** it SHALL enforce:
  - `itemId`: required string, min 1 (`'Item is required'`)
  - `quantity`: required number, must not be 0 (`'Adjustment quantity cannot be zero'`); positive for increase, negative for decrease; bounded by `max(99999999999.9999)` and `min(-99999999999.9999)`
  - `reason`: optional string, max 500 characters

#### Scenario: Create adjustment schema
- **WHEN** `createAdjustmentSchema` is used
- **THEN** it SHALL enforce:
  - `warehouseId`: required string, min 1 (`'Warehouse is required'`)
  - `adjustmentDate`: required string, min 1 (`'Adjustment date is required'`)
  - `reason`: required string, min 1, max 500 (`'Reason is required'`)
  - `type`: required enum `['INCREASE', 'DECREASE', 'DAMAGE', 'LOSS', 'CORRECTION', 'OPENING_STOCK']` (`'Adjustment type is required'`)
  - `referenceNumber`: optional string, max 100, or empty/null
  - `notes`: optional, reuse `descriptionSchema`
  - `items`: required array of `adjustmentItemSchema`, min 1 (`'At least one item is required'`)

---

### Requirement: Quote validation schemas
The system SHALL provide Zod schemas for quick quotes in `apps/web/src/lib/validations/quote.ts`.

#### Scenario: Quote item schema
- **WHEN** `quoteItemSchema` is used for a line item in a quote
- **THEN** it SHALL enforce:
  - `itemId`: required string, min 1 (`'Item is required'`)
  - `description`: optional, reuse `descriptionSchema`
  - `quantity`: positive number using `quantitySchema`
  - `unit`: required string, min 1, max 20
  - `rate`: non-negative number using `priceSchema`
  - `discountType`: enum `['PERCENTAGE', 'FIXED']`, default `'PERCENTAGE'`
  - `discountValue`: number >= 0, default 0
  - `taxRateId`: optional string or null
  - `sortOrder`: optional non-negative integer, default 0

#### Scenario: Create quote schema
- **WHEN** `createQuoteSchema` is used
- **THEN** it SHALL enforce:
  - `customerId`: optional string or null (null/empty allowed for walk-in customers)
  - `quoteDate`: required string, min 1 (`'Quote date is required'`)
  - `validUntil`: required string, min 1 (`'Valid until date is required'`)
  - `referenceNumber`: optional string, max 100, or empty/null
  - `salesPersonId`: optional string or null
  - `shippingAddress`: optional, reuse `optionalAddressDataSchema`
  - `discountType`: enum `['PERCENTAGE', 'FIXED']`, default `'PERCENTAGE'`
  - `discountValue`: number >= 0, default 0
  - `shippingCharges`: number >= 0, default 0
  - `notes`: optional, reuse `descriptionSchema`
  - `termsConditions`: optional, reuse `descriptionSchema`
  - `items`: required array of `quoteItemSchema`, min 1 (`'At least one line item is required'`)

#### Scenario: Valid until date must be on or after quote date
- **WHEN** `createQuoteSchema` is validated with both `quoteDate` and `validUntil`
- **THEN** a `.refine()` SHALL validate that `new Date(validUntil) >= new Date(quoteDate)` with message `'Valid until date must be on or after the quote date'`

#### Scenario: Update quote schema
- **WHEN** `updateQuoteSchema` is used
- **THEN** it SHALL be `createQuoteSchema.partial()` with items remaining min 1 when provided

---

### Requirement: Update index barrel export
The system SHALL update `apps/web/src/lib/validations/index.ts` to re-export all new schema files.

#### Scenario: Complete barrel export
- **WHEN** `index.ts` is imported
- **THEN** it SHALL re-export from all schema files:
  - `common`, `item`, `contact`, `sales-order`, `invoice`, `purchase-order` (existing)
  - `batch`, `serial`, `composite`, `reorder`, `einvoice`, `warehouse`, `tax-rate`, `payment-term`, `price-list`, `transfer`, `adjustment`, `quote` (new)

---

### Requirement: Wire schemas into forms
The system SHALL integrate the new Zod schemas into their corresponding form components.

#### Scenario: React Hook Form integration
- **GIVEN** forms that use React Hook Form with `useForm()`
- **WHEN** the form is initialized
- **THEN** the `resolver` option SHALL use `zodResolver(createEntitySchema)` from `@hookform/resolvers/zod`
- **AND** form field errors SHALL be automatically populated from Zod validation results

#### Scenario: Ant Design Form integration
- **GIVEN** forms that use Ant Design `Form` component without React Hook Form
- **WHEN** the form is submitted
- **THEN** the submit handler SHALL call `schema.safeParse(formValues)` before calling the mutation
- **AND** if validation fails, field-level errors SHALL be set via `form.setFields()` mapping Zod issue paths to Ant Design field names
- **AND** the first error message SHALL be scrolled into view

#### Scenario: Consistent error message format
- **WHEN** a validation error is displayed
- **THEN** the message SHALL be a human-readable English string (not a key or code)
- **AND** the message format SHALL be suitable for future i18n extraction (e.g., `'Batch number is required'`, `'Quantity must be greater than 0'`, `'Source and destination warehouses must be different'`)

---

## File Manifest

### New Files

| File Path | Schemas Exported |
|-----------|-----------------|
| `apps/web/src/lib/validations/batch.ts` | createBatchSchema, updateBatchSchema, CreateBatchInput, UpdateBatchInput |
| `apps/web/src/lib/validations/serial.ts` | createSerialSchema, createBulkSerialsSchema, updateSerialSchema, CreateSerialInput, CreateBulkSerialsInput, UpdateSerialInput |
| `apps/web/src/lib/validations/composite.ts` | bomComponentSchema, createCompositeSchema, updateBOMSchema, createAssemblySchema, BOMComponentInput, CreateCompositeInput, UpdateBOMInput, CreateAssemblyInput |
| `apps/web/src/lib/validations/reorder.ts` | updateReorderSettingsSchema, bulkReorderSettingsSchema, UpdateReorderSettingsInput, BulkReorderSettingsInput |
| `apps/web/src/lib/validations/einvoice.ts` | updateEInvoiceSettingsSchema, UpdateEInvoiceSettingsInput |
| `apps/web/src/lib/validations/warehouse.ts` | createWarehouseSchema, updateWarehouseSchema, CreateWarehouseInput, UpdateWarehouseInput |
| `apps/web/src/lib/validations/tax-rate.ts` | createTaxRateSchema, updateTaxRateSchema, CreateTaxRateInput, UpdateTaxRateInput |
| `apps/web/src/lib/validations/payment-term.ts` | createPaymentTermSchema, updatePaymentTermSchema, CreatePaymentTermInput, UpdatePaymentTermInput |
| `apps/web/src/lib/validations/price-list.ts` | priceListItemSchema, createPriceListSchema, updatePriceListSchema, PriceListItemInput, CreatePriceListInput, UpdatePriceListInput |
| `apps/web/src/lib/validations/transfer.ts` | transferItemSchema, createTransferSchema, TransferItemInput, CreateTransferInput |
| `apps/web/src/lib/validations/adjustment.ts` | adjustmentItemSchema, createAdjustmentSchema, AdjustmentItemInput, CreateAdjustmentInput |
| `apps/web/src/lib/validations/quote.ts` | quoteItemSchema, createQuoteSchema, updateQuoteSchema, QuoteItemInput, CreateQuoteInput, UpdateQuoteInput |

### Modified Files

| File Path | Change Description |
|-----------|-------------------|
| `apps/web/src/lib/validations/index.ts` | Add re-exports for all 12 new schema files |
| `apps/web/src/components/batch/*.tsx` | Wire createBatchSchema via zodResolver or safeParse |
| `apps/web/src/components/serial/*.tsx` | Wire createSerialSchema, createBulkSerialsSchema |
| `apps/web/src/components/composite/*.tsx` | Wire createCompositeSchema, createAssemblySchema |
| `apps/web/src/components/reorder/*.tsx` | Wire updateReorderSettingsSchema |
| `apps/web/src/components/einvoice/*.tsx` | Wire updateEInvoiceSettingsSchema |
| `apps/web/src/components/inventory/*.tsx` | Wire createTransferSchema, createAdjustmentSchema |
| `apps/web/src/components/tax/*.tsx` | Wire createTaxRateSchema |
| `apps/web/src/components/price-list/*.tsx` | Wire createPriceListSchema |
| `apps/web/src/components/sales/*.tsx` | Wire createQuoteSchema (for QuickQuote form) |

---

## Implementation Notes

1. **Reuse common schemas aggressively**: Every new schema file SHALL import shared validators from `./common` rather than redefining rules. For example, `quantitySchema`, `priceSchema`, `nameSchema`, `descriptionSchema`, `percentageSchema`, and `optionalAddressDataSchema` are already defined.

2. **Zod `.refine()` for cross-field validation**: Use `.refine()` or `.superRefine()` at the object level for constraints that span multiple fields (e.g., source != destination warehouse, expiry > manufacturing date, validUntil >= quoteDate). These produce path-level errors that integrate cleanly with form field error display.

3. **Enum values**: Enum values in Zod schemas SHALL match the Prisma enum values exactly (e.g., `'INCREASE'`, `'DECREASE'`, `'SST'`, `'MANUAL'`, `'AUTOMATIC'`). Refer to `apps/api/prisma/schema.prisma` for canonical enum definitions.

4. **Decimal handling**: The Prisma schema uses `Decimal(15, 4)` for monetary and quantity fields. Zod schemas operate on JavaScript `number` type. Ensure `.multipleOf()` constraints match the backend precision where applicable (e.g., currency at 2 decimal places, unit price at 4 decimal places).

5. **Optional-or-empty pattern**: Follow the existing pattern for optional string fields: `.optional().or(z.literal('')).nullable()` to handle empty form inputs, null values, and omitted fields uniformly.

6. **No runtime i18n yet**: Error messages are currently hardcoded English strings. The messages are written in a format that facilitates future extraction into i18n key files (descriptive, no interpolation of technical identifiers). Do not introduce an i18n library dependency at this stage.
