## ADDED Requirements

### Requirement: Create inventory transfer
The system SHALL allow users to transfer stock between warehouses.

#### Scenario: Successful transfer creation
- **WHEN** a user creates a transfer with source warehouse, destination warehouse, and items
- **THEN** the system SHALL create a transfer record in DRAFT status

#### Scenario: Transfer items
- **WHEN** creating a transfer
- **THEN** each line item SHALL include itemId and quantity

#### Scenario: Same warehouse rejection
- **WHEN** source and destination warehouses are the same
- **THEN** the system SHALL return 400 Bad Request

### Requirement: Transfer workflow
The system SHALL support a multi-step transfer workflow.

#### Scenario: Draft status
- **WHEN** a transfer is created
- **THEN** status SHALL be DRAFT and stock levels unchanged

#### Scenario: Issue transfer
- **WHEN** a user issues a transfer (DRAFT → IN_TRANSIT)
- **THEN** the system SHALL decrease stockOnHand at source warehouse
- **AND** the stock is considered "in transit"

#### Scenario: Receive transfer
- **WHEN** a user receives a transfer (IN_TRANSIT → COMPLETED)
- **THEN** the system SHALL increase stockOnHand at destination warehouse

#### Scenario: Cancel transfer
- **WHEN** a user cancels a DRAFT transfer
- **THEN** status SHALL change to CANCELLED with no stock impact

#### Scenario: Cancel in-transit transfer
- **WHEN** a user cancels an IN_TRANSIT transfer
- **THEN** the system SHALL restore stock to source warehouse
- **AND** status SHALL change to CANCELLED

### Requirement: Transfer validation
The system SHALL validate stock availability before transfer.

#### Scenario: Insufficient stock
- **WHEN** issuing a transfer for quantity exceeding available stock
- **THEN** the system SHALL return 400 Bad Request with message "Insufficient stock at source warehouse"

#### Scenario: Partial receive
- **WHEN** receiving less quantity than transferred (damaged in transit)
- **THEN** the system SHALL accept partial quantity and note the discrepancy

### Requirement: List transfers
The system SHALL provide transfer history with filtering.

#### Scenario: List all transfers
- **WHEN** a user requests GET /api/v1/inventory/transfers
- **THEN** the system SHALL return transfers ordered by date descending

#### Scenario: Filter by status
- **WHEN** a user requests transfers with status filter
- **THEN** the system SHALL return only transfers with matching status

#### Scenario: Filter by warehouse
- **WHEN** a user requests transfers with warehouseId filter
- **THEN** the system SHALL return transfers where warehouse is source OR destination

### Requirement: Transfer documentation
The system SHALL generate transfer reference numbers.

#### Scenario: Transfer number
- **WHEN** a transfer is created
- **THEN** the system SHALL generate a unique transferNumber (e.g., TRF-000001)

#### Scenario: Transfer notes
- **WHEN** creating or updating a transfer
- **THEN** the system SHALL accept optional notes field
