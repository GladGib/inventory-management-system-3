## ADDED Requirements

### Requirement: Inventory Adjustments List
The system SHALL provide a list view for inventory adjustments.

#### Scenario: View adjustments list
- **WHEN** user navigates to `/inventory/adjustments`
- **THEN** system SHALL display adjustments in a table
- **AND** show adjustment number, date, warehouse, item count, and created by

#### Scenario: Filter by warehouse
- **WHEN** user selects a warehouse filter
- **THEN** system SHALL show only adjustments for that warehouse

#### Scenario: Filter by date range
- **WHEN** user selects a date range
- **THEN** system SHALL show only adjustments within that range

#### Scenario: Search adjustments
- **WHEN** user enters search text
- **THEN** system SHALL filter by adjustment number or notes

#### Scenario: View adjustment detail
- **WHEN** user clicks on an adjustment row
- **THEN** system SHALL navigate to the adjustment detail page

### Requirement: Inventory Adjustment Create Form
The system SHALL provide a form to create inventory adjustments.

#### Scenario: Access create form
- **WHEN** user navigates to `/inventory/adjustments/new`
- **THEN** system SHALL display the adjustment creation form

#### Scenario: Warehouse selection
- **WHEN** user opens the warehouse dropdown
- **THEN** system SHALL display list of active warehouses
- **AND** require selection before adding items

#### Scenario: Add adjustment items
- **WHEN** user adds items to adjust
- **THEN** system SHALL allow selecting items from inventory
- **AND** display current stock level for selected warehouse
- **AND** allow entering adjustment quantity (positive or negative)
- **AND** require reason code selection

#### Scenario: Reason codes
- **WHEN** user selects reason for adjustment
- **THEN** system SHALL display options: OPENING_STOCK, DAMAGE, LOSS, RETURN, FOUND, CORRECTION, OTHER

#### Scenario: Notes field
- **WHEN** user wants to add details
- **THEN** system SHALL allow entering notes for the adjustment

#### Scenario: Submit valid form
- **WHEN** user submits form with warehouse and at least one item
- **THEN** system SHALL create the adjustment
- **AND** update stock levels immediately
- **AND** redirect to the adjustment detail page

#### Scenario: Insufficient stock validation
- **WHEN** negative adjustment would result in negative stock
- **THEN** system SHALL display validation error
- **AND** NOT submit the form

### Requirement: Inventory Adjustment Detail Page
The system SHALL provide a detail view for adjustments.

#### Scenario: View adjustment details
- **WHEN** user navigates to `/inventory/adjustments/[id]`
- **THEN** system SHALL display adjustment header (number, date, warehouse, created by)
- **AND** display items with quantity adjustments and reasons
- **AND** display notes if present

#### Scenario: Immutable record
- **WHEN** viewing an adjustment
- **THEN** system SHALL NOT show edit or delete options
- **AND** display message that adjustments cannot be modified
