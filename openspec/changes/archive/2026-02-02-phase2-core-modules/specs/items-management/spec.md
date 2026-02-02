## ADDED Requirements

### Requirement: List items with pagination
The system SHALL provide a paginated list of items for the current organization.

#### Scenario: Default item list
- **WHEN** a user requests GET /api/v1/items without parameters
- **THEN** the system SHALL return the first 25 items ordered by createdAt descending
- **AND** include pagination meta (total, page, limit, hasMore)

#### Scenario: Filtered item list
- **WHEN** a user requests GET /api/v1/items with query parameters (status, categoryId, type)
- **THEN** the system SHALL return only items matching all provided filters

#### Scenario: Search items
- **WHEN** a user requests GET /api/v1/items?search=keyword
- **THEN** the system SHALL return items where SKU, name, or partNumber contains the keyword

### Requirement: Create item
The system SHALL allow users to create new inventory items.

#### Scenario: Successful item creation
- **WHEN** a user submits valid item data to POST /api/v1/items
- **THEN** the system SHALL create the item with the provided data
- **AND** return the created item with id and timestamps

#### Scenario: Duplicate SKU
- **WHEN** a user attempts to create an item with an SKU that already exists in the organization
- **THEN** the system SHALL return 409 Conflict with message "SKU already exists"

#### Scenario: Required fields validation
- **WHEN** a user submits item data missing required fields (sku, name, unit, costPrice, sellingPrice)
- **THEN** the system SHALL return 400 Bad Request with validation errors

### Requirement: Get item details
The system SHALL provide detailed item information including stock levels.

#### Scenario: Successful retrieval
- **WHEN** a user requests GET /api/v1/items/:id with a valid item ID
- **THEN** the system SHALL return the item with all fields including category and stockLevels

#### Scenario: Item not found
- **WHEN** a user requests an item ID that doesn't exist or belongs to another organization
- **THEN** the system SHALL return 404 Not Found

### Requirement: Update item
The system SHALL allow users to update existing items.

#### Scenario: Successful update
- **WHEN** a user submits valid update data to PUT /api/v1/items/:id
- **THEN** the system SHALL update only the provided fields
- **AND** return the updated item

#### Scenario: SKU change conflict
- **WHEN** a user attempts to change SKU to one that already exists
- **THEN** the system SHALL return 409 Conflict

### Requirement: Delete item
The system SHALL allow users to soft-delete items.

#### Scenario: Successful deletion
- **WHEN** a user requests DELETE /api/v1/items/:id
- **THEN** the system SHALL set item status to INACTIVE
- **AND** return 204 No Content

#### Scenario: Item with stock
- **WHEN** a user attempts to delete an item that has stock on hand > 0
- **THEN** the system SHALL return 400 Bad Request with message "Cannot delete item with stock"

### Requirement: Item fields for auto parts industry
The system SHALL support auto parts industry-specific fields.

#### Scenario: Part number storage
- **WHEN** creating or updating an item
- **THEN** the system SHALL accept partNumber field for OEM/aftermarket part numbers

#### Scenario: Cross-references storage
- **WHEN** creating or updating an item
- **THEN** the system SHALL accept crossReferences as an array of alternative part numbers

#### Scenario: Vehicle compatibility
- **WHEN** creating or updating an item
- **THEN** the system SHALL accept vehicleModels as an array of compatible vehicle makes/models

#### Scenario: Search by part number
- **WHEN** a user searches with a part number
- **THEN** the system SHALL match against partNumber and crossReferences fields

### Requirement: Item pricing
The system SHALL track cost and selling prices with tax settings.

#### Scenario: Price fields
- **WHEN** creating an item
- **THEN** the system SHALL require costPrice and sellingPrice as decimal values

#### Scenario: Tax settings
- **WHEN** creating an item
- **THEN** the system SHALL accept taxable (boolean) and taxRateId (optional) fields

#### Scenario: Margin calculation
- **WHEN** retrieving an item
- **THEN** the response MAY include calculated margin percentage

### Requirement: Item type classification
The system SHALL support different item types for inventory tracking purposes.

#### Scenario: Inventory item
- **WHEN** item type is INVENTORY
- **THEN** the system SHALL track stock levels and apply inventory rules

#### Scenario: Service item
- **WHEN** item type is SERVICE
- **THEN** the system SHALL NOT track stock levels

#### Scenario: Non-inventory item
- **WHEN** item type is NON_INVENTORY
- **THEN** the system SHALL NOT track stock but allow in transactions

### Requirement: Bilingual item names
The system SHALL support item names in English and Bahasa Malaysia.

#### Scenario: Malay name storage
- **WHEN** creating or updating an item
- **THEN** the system SHALL accept optional nameMalay field

#### Scenario: Malay name in response
- **WHEN** retrieving items
- **THEN** the response SHALL include nameMalay when available
