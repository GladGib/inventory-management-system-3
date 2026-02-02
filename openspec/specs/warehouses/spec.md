## ADDED Requirements

### Requirement: List warehouses
The system SHALL provide a list of warehouses for the organization.

#### Scenario: List all warehouses
- **WHEN** a user requests GET /api/v1/warehouses
- **THEN** the system SHALL return all warehouses with stock summary

#### Scenario: Include stock count
- **WHEN** listing warehouses
- **THEN** each warehouse SHALL include totalItems and totalStockValue

### Requirement: Create warehouse
The system SHALL allow users to create new warehouses.

#### Scenario: Successful creation
- **WHEN** a user creates a warehouse with name and code
- **THEN** the system SHALL create the warehouse and return it

#### Scenario: Duplicate code
- **WHEN** a user creates a warehouse with a code that already exists
- **THEN** the system SHALL return 409 Conflict

#### Scenario: Required fields
- **WHEN** creating a warehouse
- **THEN** the system SHALL require name and code

### Requirement: Warehouse details
The system SHALL store warehouse location and contact information.

#### Scenario: Address fields
- **WHEN** creating or updating a warehouse
- **THEN** the system SHALL accept address object (line1, line2, city, state, postcode, country)

#### Scenario: Contact fields
- **WHEN** creating or updating a warehouse
- **THEN** the system SHALL accept contactPerson, phone, and email

### Requirement: Default warehouse
The system SHALL support designating one warehouse as default.

#### Scenario: Set default warehouse
- **WHEN** a user sets a warehouse as default
- **THEN** the system SHALL unset any existing default and set the new one

#### Scenario: Default for new items
- **WHEN** creating an item with opening stock but no warehouseId
- **THEN** the system SHALL use the default warehouse

#### Scenario: Require one default
- **WHEN** unsetting the only default warehouse
- **THEN** the system SHALL return 400 Bad Request with message "At least one default warehouse required"

### Requirement: Update warehouse
The system SHALL allow users to update warehouse details.

#### Scenario: Update warehouse
- **WHEN** a user updates warehouse name, code, or address
- **THEN** the system SHALL update the warehouse and return it

#### Scenario: Code change validation
- **WHEN** changing warehouse code to one that exists
- **THEN** the system SHALL return 409 Conflict

### Requirement: Delete warehouse
The system SHALL allow users to delete empty warehouses.

#### Scenario: Delete empty warehouse
- **WHEN** a user deletes a warehouse with no stock
- **THEN** the system SHALL delete the warehouse and return 204 No Content

#### Scenario: Delete warehouse with stock
- **WHEN** a user attempts to delete a warehouse that has stock
- **THEN** the system SHALL return 400 Bad Request with message "Cannot delete warehouse with stock"

#### Scenario: Delete default warehouse
- **WHEN** a user attempts to delete the default warehouse
- **THEN** the system SHALL return 400 Bad Request with message "Cannot delete default warehouse"

### Requirement: Warehouse status
The system SHALL support warehouse activation/deactivation.

#### Scenario: Deactivate warehouse
- **WHEN** a user deactivates a warehouse
- **THEN** the warehouse SHALL not appear in dropdowns for new transactions
- **BUT** existing stock and history SHALL remain accessible

#### Scenario: Reactivate warehouse
- **WHEN** a user reactivates a warehouse
- **THEN** the warehouse SHALL appear in dropdowns again
