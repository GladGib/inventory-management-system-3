## ADDED Requirements

### Requirement: Create stock adjustment
The system SHALL allow users to adjust stock quantities with reason codes.

#### Scenario: Positive adjustment
- **WHEN** a user creates an adjustment with positive quantity
- **THEN** the system SHALL increase stockOnHand by the specified amount
- **AND** create an adjustment record with timestamp and user

#### Scenario: Negative adjustment
- **WHEN** a user creates an adjustment with negative quantity
- **THEN** the system SHALL decrease stockOnHand by the specified amount

#### Scenario: Insufficient stock
- **WHEN** a negative adjustment would result in stockOnHand below zero
- **THEN** the system SHALL return 400 Bad Request with message "Insufficient stock"

#### Scenario: Required fields
- **WHEN** creating an adjustment
- **THEN** the system SHALL require: itemId, warehouseId, quantity, reason

### Requirement: Adjustment reason codes
The system SHALL support predefined and custom adjustment reasons.

#### Scenario: Predefined reasons
- **WHEN** creating an adjustment
- **THEN** the system SHALL accept reasons: OPENING_STOCK, DAMAGE, LOSS, RETURN, FOUND, CORRECTION, OTHER

#### Scenario: Custom notes
- **WHEN** creating an adjustment
- **THEN** the system SHALL accept optional notes field for additional details

### Requirement: List adjustments
The system SHALL provide adjustment history with filtering.

#### Scenario: List all adjustments
- **WHEN** a user requests GET /api/v1/inventory/adjustments
- **THEN** the system SHALL return adjustments ordered by date descending

#### Scenario: Filter by item
- **WHEN** a user requests adjustments with itemId filter
- **THEN** the system SHALL return adjustments only for that item

#### Scenario: Filter by date range
- **WHEN** a user requests adjustments with fromDate and toDate
- **THEN** the system SHALL return adjustments within the date range

#### Scenario: Filter by warehouse
- **WHEN** a user requests adjustments with warehouseId filter
- **THEN** the system SHALL return adjustments only for that warehouse

### Requirement: Adjustment audit trail
The system SHALL maintain complete audit trail for adjustments.

#### Scenario: Record creator
- **WHEN** an adjustment is created
- **THEN** the record SHALL include createdBy userId

#### Scenario: Record timestamp
- **WHEN** an adjustment is created
- **THEN** the record SHALL include adjustmentDate (can be backdated) and createdAt

#### Scenario: Immutable records
- **WHEN** an adjustment is created
- **THEN** it SHALL NOT be editable or deletable (corrections require new adjustment)

### Requirement: Bulk adjustment
The system SHALL support adjusting multiple items at once.

#### Scenario: Bulk adjustment creation
- **WHEN** a user submits multiple adjustments in single request
- **THEN** the system SHALL process all adjustments in a single transaction
- **AND** return success only if all adjustments succeed

#### Scenario: Bulk adjustment failure
- **WHEN** any adjustment in a bulk request fails
- **THEN** the system SHALL rollback all adjustments and return errors
