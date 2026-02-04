## ADDED Requirements

### Requirement: Bill Create Form
The system SHALL provide a form to create vendor bills.

#### Scenario: Access create form
- **WHEN** user navigates to `/purchases/bills/new`
- **THEN** system SHALL display the bill creation form

#### Scenario: Vendor selection
- **WHEN** user opens the vendor dropdown
- **THEN** system SHALL display searchable list of active vendors
- **AND** allow selection of a single vendor

#### Scenario: Bill reference
- **WHEN** user fills the form
- **THEN** system SHALL allow entering vendor bill number/reference
- **AND** require bill date and due date

#### Scenario: Add line items
- **WHEN** user adds items to the bill
- **THEN** system SHALL allow selecting items or entering descriptions
- **AND** entering quantity and unit price
- **AND** calculating line totals automatically

#### Scenario: Link to purchase order
- **WHEN** user selects a vendor with open purchase orders
- **THEN** system SHALL allow linking bill to a purchase order
- **AND** pre-populate line items from the PO

#### Scenario: Submit valid form
- **WHEN** user submits form with vendor and at least one line item
- **THEN** system SHALL create the bill in DRAFT status
- **AND** redirect to the bill detail page

### Requirement: Bill Edit Form
The system SHALL provide a form to edit draft bills.

#### Scenario: Access edit form
- **WHEN** user navigates to `/purchases/bills/[id]/edit`
- **THEN** system SHALL load and display the existing bill data

#### Scenario: Edit draft bill
- **WHEN** user modifies a DRAFT bill
- **THEN** system SHALL allow changes to all fields
- **AND** save updates on submit

#### Scenario: Non-draft restriction
- **WHEN** user attempts to edit a non-DRAFT bill
- **THEN** system SHALL display read-only view or redirect to detail page

### Requirement: Bill Detail Page
The system SHALL provide a detail view for bills.

#### Scenario: View bill details
- **WHEN** user navigates to `/purchases/bills/[id]`
- **THEN** system SHALL display bill header (vendor, dates, status)
- **AND** display line items with quantities and amounts
- **AND** display payment status and balance due

#### Scenario: Action buttons by status
- **WHEN** viewing a DRAFT bill
- **THEN** system SHALL show Edit, Approve, and Delete buttons

#### Scenario: Record payment action
- **WHEN** viewing an OPEN or PARTIALLY_PAID bill
- **THEN** system SHALL show Record Payment button
- **AND** link to payment form with bill pre-selected

#### Scenario: Void action
- **WHEN** user clicks Void on a bill
- **THEN** system SHALL confirm the action
- **AND** change status to VOID on confirmation
