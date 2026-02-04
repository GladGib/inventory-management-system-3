## ADDED Requirements

### Requirement: Purchase Order Create Form
The system SHALL provide a form to create new purchase orders.

#### Scenario: Access create form
- **WHEN** user navigates to `/purchases/orders/new`
- **THEN** system SHALL display the purchase order creation form

#### Scenario: Vendor selection
- **WHEN** user opens the vendor dropdown
- **THEN** system SHALL display searchable list of active vendors
- **AND** allow selection of a single vendor

#### Scenario: Add line items
- **WHEN** user adds items to the order
- **THEN** system SHALL allow selecting items from inventory
- **AND** entering quantity and unit price
- **AND** calculating line totals automatically

#### Scenario: Order dates
- **WHEN** user fills the form
- **THEN** system SHALL require order date
- **AND** allow optional expected delivery date

#### Scenario: Submit valid form
- **WHEN** user submits form with vendor and at least one line item
- **THEN** system SHALL create the purchase order in DRAFT status
- **AND** redirect to the order detail page

#### Scenario: Validation errors
- **WHEN** user submits form without required fields
- **THEN** system SHALL display validation errors inline
- **AND** NOT submit the form

### Requirement: Purchase Order Edit Form
The system SHALL provide a form to edit draft purchase orders.

#### Scenario: Access edit form
- **WHEN** user navigates to `/purchases/orders/[id]/edit`
- **THEN** system SHALL load and display the existing order data

#### Scenario: Edit draft order
- **WHEN** user modifies a DRAFT order
- **THEN** system SHALL allow changes to all fields
- **AND** save updates on submit

#### Scenario: Non-draft restriction
- **WHEN** user attempts to edit a non-DRAFT order
- **THEN** system SHALL display read-only view or redirect to detail page

### Requirement: Purchase Order Detail Page
The system SHALL provide a detail view for purchase orders.

#### Scenario: View order details
- **WHEN** user navigates to `/purchases/orders/[id]`
- **THEN** system SHALL display order header (vendor, dates, status)
- **AND** display line items with quantities and amounts
- **AND** display order totals

#### Scenario: Action buttons by status
- **WHEN** viewing a DRAFT order
- **THEN** system SHALL show Edit, Issue, and Delete buttons

#### Scenario: Issue action
- **WHEN** user clicks Issue on a DRAFT order
- **THEN** system SHALL confirm the action
- **AND** change status to ISSUED on confirmation

#### Scenario: Cancel action
- **WHEN** user clicks Cancel on a DRAFT or ISSUED order
- **THEN** system SHALL confirm the action
- **AND** change status to CANCELLED on confirmation
