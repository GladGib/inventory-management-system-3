## ADDED Requirements

### Requirement: View stock levels
The system SHALL provide current stock levels per item per warehouse.

#### Scenario: Stock summary list
- **WHEN** a user requests GET /api/v1/inventory/stock
- **THEN** the system SHALL return stock levels with item details, warehouse, stockOnHand, committedStock, and availableStock

#### Scenario: Filter by warehouse
- **WHEN** a user requests stock with warehouseId filter
- **THEN** the system SHALL return stock levels only for the specified warehouse

#### Scenario: Filter by item
- **WHEN** a user requests GET /api/v1/inventory/stock/:itemId
- **THEN** the system SHALL return stock levels for that item across all warehouses

### Requirement: Calculate available stock
The system SHALL calculate available stock as stockOnHand minus committedStock.

#### Scenario: Available stock calculation
- **WHEN** retrieving stock levels
- **THEN** availableStock SHALL equal stockOnHand - committedStock

#### Scenario: Negative available stock
- **WHEN** committedStock exceeds stockOnHand
- **THEN** availableStock SHALL be negative (indicating over-commitment)

### Requirement: Low stock alerts
The system SHALL identify items below reorder level.

#### Scenario: List low stock items
- **WHEN** a user requests GET /api/v1/items/low-stock
- **THEN** the system SHALL return items where total stockOnHand is below reorderLevel

#### Scenario: Low stock indicator
- **WHEN** retrieving item details
- **THEN** the response SHALL include isLowStock boolean

### Requirement: Stock valuation
The system SHALL track stock value based on cost price.

#### Scenario: Item stock value
- **WHEN** retrieving item stock
- **THEN** the response SHALL include stockValue (stockOnHand * costPrice)

#### Scenario: Total inventory value
- **WHEN** requesting inventory summary
- **THEN** the system SHALL provide total value of all stock

### Requirement: Stock on hand initialization
The system SHALL allow setting initial stock when creating items.

#### Scenario: Create item with opening stock
- **WHEN** creating an item with openingStock and warehouseId
- **THEN** the system SHALL create a StockLevel record with the specified quantity
- **AND** create an adjustment record with reason "Opening Stock"

#### Scenario: Default to zero stock
- **WHEN** creating an item without openingStock
- **THEN** the system SHALL NOT create a StockLevel record (stock is zero)
