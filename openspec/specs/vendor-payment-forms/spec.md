## ADDED Requirements

### Requirement: Vendor Payment Create Form
The system SHALL provide a form to record payments to vendors.

#### Scenario: Access create form
- **WHEN** user navigates to `/purchases/payments/new`
- **THEN** system SHALL display the vendor payment form

#### Scenario: Vendor selection
- **WHEN** user opens the vendor dropdown
- **THEN** system SHALL display searchable list of vendors with open bills
- **AND** show outstanding balance for each vendor

#### Scenario: Load open bills
- **WHEN** user selects a vendor
- **THEN** system SHALL display list of unpaid bills for that vendor
- **AND** show bill number, date, due date, and balance for each

#### Scenario: Payment allocation
- **WHEN** user enters payment amount
- **THEN** system SHALL allow allocating amount to specific bills
- **AND** validate that allocations do not exceed payment amount
- **AND** validate that allocations do not exceed bill balances

#### Scenario: Auto-allocate option
- **WHEN** user clicks auto-allocate
- **THEN** system SHALL allocate payment to oldest bills first

#### Scenario: Payment method
- **WHEN** user fills the form
- **THEN** system SHALL require payment method selection
- **AND** allow entering reference number (cheque number, transaction ID)

#### Scenario: Submit valid form
- **WHEN** user submits form with vendor, amount, and at least one allocation
- **THEN** system SHALL create the payment record
- **AND** update bill balances accordingly
- **AND** redirect to the payment detail page

#### Scenario: Advance payment
- **WHEN** payment amount exceeds allocated amount
- **THEN** system SHALL record excess as unallocated/advance payment

### Requirement: Vendor Payment Detail Page
The system SHALL provide a detail view for vendor payments.

#### Scenario: View payment details
- **WHEN** user navigates to `/purchases/payments/[id]`
- **THEN** system SHALL display payment header (vendor, date, amount, method)
- **AND** display bill allocations with amounts
- **AND** show reference number if provided

#### Scenario: View unallocated amount
- **WHEN** payment has unallocated balance
- **THEN** system SHALL display unallocated amount prominently
