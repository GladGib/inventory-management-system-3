## ADDED Requirements

### Requirement: List vendors
The system SHALL provide a paginated list of vendor contacts.

#### Scenario: List vendors
- **WHEN** a user requests GET /api/v1/vendors or GET /api/v1/contacts?type=VENDOR
- **THEN** the system SHALL return contacts where type is VENDOR or BOTH

#### Scenario: Search vendors
- **WHEN** a user searches with keyword
- **THEN** the system SHALL match against companyName, displayName, email, and phone

### Requirement: Create vendor
The system SHALL allow users to create vendor contacts.

#### Scenario: Successful creation
- **WHEN** a user creates a vendor with required fields
- **THEN** the system SHALL create the contact with type VENDOR

#### Scenario: Required fields
- **WHEN** creating a vendor
- **THEN** the system SHALL require companyName and displayName

### Requirement: Vendor details
The system SHALL store comprehensive vendor information.

#### Scenario: Contact information
- **WHEN** creating or updating a vendor
- **THEN** the system SHALL accept: companyName, displayName, email, phone, mobile, website

#### Scenario: Address
- **WHEN** creating or updating a vendor
- **THEN** the system SHALL accept billingAddress for vendor's address

#### Scenario: Tax number
- **WHEN** creating or updating a vendor
- **THEN** the system SHALL accept taxNumber for vendor's SST registration

### Requirement: Vendor purchase settings
The system SHALL support vendor-specific purchase settings.

#### Scenario: Payment terms
- **WHEN** setting vendor paymentTermId
- **THEN** the system SHALL link to a PaymentTerm record for bill due dates

#### Scenario: Lead time
- **WHEN** creating or updating a vendor
- **THEN** the system SHALL accept leadTimeDays for expected delivery time

#### Scenario: Minimum order
- **WHEN** creating or updating a vendor
- **THEN** the system SHALL accept minimumOrderAmount

### Requirement: Vendor balance tracking
The system SHALL track outstanding balance for vendors.

#### Scenario: Get vendor balance
- **WHEN** a user requests GET /api/v1/contacts/:id/balance
- **THEN** the system SHALL return totalPayable, totalPaid, and outstandingBalance

#### Scenario: Balance calculation
- **WHEN** calculating vendor balance
- **THEN** outstandingBalance SHALL equal sum of unpaid bill amounts

### Requirement: Update vendor
The system SHALL allow users to update vendor information.

#### Scenario: Update vendor
- **WHEN** a user updates vendor fields
- **THEN** the system SHALL update and return the vendor

#### Scenario: Type change to BOTH
- **WHEN** a vendor is also used as customer
- **THEN** the system SHALL allow changing type to BOTH

### Requirement: Delete vendor
The system SHALL allow soft-deleting vendors.

#### Scenario: Delete vendor
- **WHEN** a user deletes a vendor
- **THEN** the system SHALL set status to INACTIVE

#### Scenario: Vendor with outstanding balance
- **WHEN** deleting a vendor with outstanding balance > 0
- **THEN** the system SHALL warn but allow deletion (soft delete preserves history)

### Requirement: Vendor items
The system SHALL track which items are supplied by which vendors.

#### Scenario: Link item to vendor
- **WHEN** specifying vendor for an item
- **THEN** the system SHALL store preferredVendorId on the item

#### Scenario: Vendor catalog
- **WHEN** viewing vendor details
- **THEN** the system SHALL show items where this vendor is preferred
