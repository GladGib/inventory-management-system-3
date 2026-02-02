# organization-management Specification

## Purpose
TBD - created by archiving change phase1-foundation-implementation. Update Purpose after archive.
## Requirements
### Requirement: Get current organization
The system SHALL provide an endpoint to retrieve the current user's organization details.

#### Scenario: Successful retrieval
- **WHEN** an authenticated user requests GET /organizations/current
- **THEN** the system SHALL return the organization details including counts of users, warehouses, items, and contacts

#### Scenario: Organization not found
- **WHEN** the user's organizationId references a non-existent organization
- **THEN** the system SHALL return 404 Not Found

### Requirement: Update organization
The system SHALL allow ADMIN users to update their organization details.

#### Scenario: Successful update
- **WHEN** an ADMIN user submits valid update data to PUT /organizations/current
- **THEN** the system SHALL update the organization and return the updated details

#### Scenario: Non-admin update attempt
- **WHEN** a non-ADMIN user attempts to update the organization
- **THEN** the system SHALL return 403 Forbidden

#### Scenario: Partial update
- **WHEN** an ADMIN submits a partial update with only some fields
- **THEN** the system SHALL update only the provided fields, leaving others unchanged

### Requirement: Organization fields
The system SHALL support the following organization fields for Malaysian compliance.

#### Scenario: Basic information fields
- **WHEN** creating or updating an organization
- **THEN** the system SHALL support: name, industry, baseCurrency, timezone

#### Scenario: Malaysian tax fields
- **WHEN** creating or updating an organization
- **THEN** the system SHALL support: sstNumber (SST registration), businessRegNo (SSM registration), tin (Tax Identification Number)

#### Scenario: Contact fields
- **WHEN** creating or updating an organization
- **THEN** the system SHALL support: email, phone, website, address (with line1, line2, city, state, postcode, country)

### Requirement: Industry types
The system SHALL support industry classification for auto parts, hardware, and spare parts market.

#### Scenario: Valid industry values
- **WHEN** setting organization industry
- **THEN** the system SHALL accept: AUTO_PARTS, HARDWARE, SPARE_PARTS, GENERAL

#### Scenario: Invalid industry value
- **WHEN** an invalid industry value is submitted
- **THEN** the system SHALL return 400 Bad Request with validation error

### Requirement: Organization settings
The system SHALL support a flexible JSON settings field for organization preferences.

#### Scenario: Get settings
- **WHEN** an authenticated user requests GET /organizations/current/settings
- **THEN** the system SHALL return the organization's settings JSON object

#### Scenario: Update settings
- **WHEN** an ADMIN user submits settings to PUT /organizations/current/settings
- **THEN** the system SHALL merge the new settings with existing settings
- **AND** return the updated settings

### Requirement: Dashboard statistics
The system SHALL provide dashboard statistics for the current organization.

#### Scenario: Get dashboard stats
- **WHEN** an authenticated user requests GET /organizations/current/dashboard
- **THEN** the system SHALL return aggregated counts including:
  - inventory: totalItems, lowStockItems
  - contacts: totalCustomers, totalVendors
  - sales: pendingSalesOrders, unpaidInvoices
  - purchases: pendingPurchaseOrders, unpaidBills

#### Scenario: Stats reflect organization scope
- **WHEN** dashboard stats are calculated
- **THEN** all counts SHALL be scoped to the user's organization only

