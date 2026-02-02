## ADDED Requirements

### Requirement: List customers
The system SHALL provide a paginated list of customer contacts.

#### Scenario: List customers
- **WHEN** a user requests GET /api/v1/customers or GET /api/v1/contacts?type=CUSTOMER
- **THEN** the system SHALL return contacts where type is CUSTOMER or BOTH

#### Scenario: Search customers
- **WHEN** a user searches with keyword
- **THEN** the system SHALL match against companyName, displayName, email, and phone

#### Scenario: Filter by status
- **WHEN** a user requests customers with status filter
- **THEN** the system SHALL return only customers with matching status

### Requirement: Create customer
The system SHALL allow users to create customer contacts.

#### Scenario: Successful creation
- **WHEN** a user creates a customer with required fields
- **THEN** the system SHALL create the contact with type CUSTOMER

#### Scenario: Required fields
- **WHEN** creating a customer
- **THEN** the system SHALL require companyName and displayName

#### Scenario: Duplicate check
- **WHEN** creating a customer with same companyName and email as existing
- **THEN** the system SHALL create the customer (duplicates allowed with warning)

### Requirement: Customer details
The system SHALL store comprehensive customer information.

#### Scenario: Contact information
- **WHEN** creating or updating a customer
- **THEN** the system SHALL accept: companyName, displayName, email, phone, mobile, website

#### Scenario: Billing address
- **WHEN** creating or updating a customer
- **THEN** the system SHALL accept billingAddress object

#### Scenario: Shipping address
- **WHEN** creating or updating a customer
- **THEN** the system SHALL accept shippingAddress object (can differ from billing)

#### Scenario: Tax number
- **WHEN** creating or updating a customer
- **THEN** the system SHALL accept taxNumber for SST purposes

### Requirement: Customer credit management
The system SHALL support credit limits and payment terms.

#### Scenario: Credit limit
- **WHEN** setting customer creditLimit
- **THEN** the system SHALL store the maximum credit amount

#### Scenario: Payment terms
- **WHEN** setting customer paymentTermId
- **THEN** the system SHALL link to a PaymentTerm record

#### Scenario: Price list
- **WHEN** setting customer priceListId
- **THEN** the system SHALL link to a PriceList for customer-specific pricing

### Requirement: Customer balance tracking
The system SHALL track outstanding balance for customers.

#### Scenario: Get customer balance
- **WHEN** a user requests GET /api/v1/contacts/:id/balance
- **THEN** the system SHALL return totalReceivable, totalReceived, and outstandingBalance

#### Scenario: Balance calculation
- **WHEN** calculating balance
- **THEN** outstandingBalance SHALL equal sum of unpaid invoice amounts

### Requirement: Update customer
The system SHALL allow users to update customer information.

#### Scenario: Update customer
- **WHEN** a user updates customer fields
- **THEN** the system SHALL update and return the customer

#### Scenario: Type change to BOTH
- **WHEN** a customer is also used as vendor
- **THEN** the system SHALL allow changing type to BOTH

### Requirement: Delete customer
The system SHALL allow soft-deleting customers.

#### Scenario: Delete customer
- **WHEN** a user deletes a customer
- **THEN** the system SHALL set status to INACTIVE

#### Scenario: Customer with outstanding balance
- **WHEN** deleting a customer with outstanding balance > 0
- **THEN** the system SHALL warn but allow deletion (soft delete preserves history)
