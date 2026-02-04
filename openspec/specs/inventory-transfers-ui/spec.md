## ADDED Requirements

### Requirement: Inventory Transfers List
The system SHALL provide a list view for inventory transfers.

#### Scenario: View transfers list
- **WHEN** user navigates to `/inventory/transfers`
- **THEN** system SHALL display transfers in a table
- **AND** show transfer number, date, source, destination, status, and item count

#### Scenario: Filter by status
- **WHEN** user selects a status filter
- **THEN** system SHALL show only transfers with that status

#### Scenario: Filter by warehouse
- **WHEN** user selects a warehouse filter
- **THEN** system SHALL show transfers where warehouse is source OR destination

#### Scenario: Search transfers
- **WHEN** user enters search text
- **THEN** system SHALL filter by transfer number or notes

#### Scenario: View transfer detail
- **WHEN** user clicks on a transfer row
- **THEN** system SHALL navigate to the transfer detail page

### Requirement: Inventory Transfer Create Form
The system SHALL provide a form to create inventory transfers.

#### Scenario: Access create form
- **WHEN** user navigates to `/inventory/transfers/new`
- **THEN** system SHALL display the transfer creation form

#### Scenario: Source warehouse selection
- **WHEN** user opens the source warehouse dropdown
- **THEN** system SHALL display list of active warehouses

#### Scenario: Destination warehouse selection
- **WHEN** user opens the destination warehouse dropdown
- **THEN** system SHALL display list of active warehouses
- **AND** exclude the selected source warehouse

#### Scenario: Same warehouse validation
- **WHEN** user selects same warehouse for source and destination
- **THEN** system SHALL display validation error

#### Scenario: Add transfer items
- **WHEN** user adds items to transfer
- **THEN** system SHALL allow selecting items with stock at source warehouse
- **AND** display available stock at source warehouse
- **AND** allow entering transfer quantity

#### Scenario: Notes field
- **WHEN** user wants to add details
- **THEN** system SHALL allow entering notes for the transfer

#### Scenario: Submit valid form
- **WHEN** user submits form with warehouses and at least one item
- **THEN** system SHALL create the transfer in DRAFT status
- **AND** redirect to the transfer detail page

### Requirement: Inventory Transfer Detail Page
The system SHALL provide a detail view for transfers.

#### Scenario: View transfer details
- **WHEN** user navigates to `/inventory/transfers/[id]`
- **THEN** system SHALL display transfer header (number, date, source, destination, status)
- **AND** display items with quantities
- **AND** display notes if present

#### Scenario: Action buttons by status
- **WHEN** viewing a DRAFT transfer
- **THEN** system SHALL show Edit, Issue, and Cancel buttons

#### Scenario: Issue action
- **WHEN** user clicks Issue on a DRAFT transfer
- **THEN** system SHALL confirm the action
- **AND** change status to IN_TRANSIT
- **AND** decrease stock at source warehouse

#### Scenario: Receive action
- **WHEN** user clicks Receive on an IN_TRANSIT transfer
- **THEN** system SHALL confirm received quantities
- **AND** change status to COMPLETED
- **AND** increase stock at destination warehouse

#### Scenario: Cancel action
- **WHEN** user clicks Cancel on a DRAFT or IN_TRANSIT transfer
- **THEN** system SHALL confirm the action
- **AND** change status to CANCELLED
- **AND** restore stock if previously issued
