## ADDED Requirements

### Requirement: Create item group
The system SHALL allow users to create item groups for managing product variants.

#### Scenario: Successful group creation
- **WHEN** a user creates an item group with name and attribute definitions
- **THEN** the system SHALL create the group with configurable attributes (e.g., Size, Color, Grade)

#### Scenario: Attribute definition
- **WHEN** defining group attributes
- **THEN** each attribute SHALL have name and array of possible values

### Requirement: List item groups
The system SHALL provide a list of item groups with their variants.

#### Scenario: List groups
- **WHEN** a user requests GET /api/v1/items/groups
- **THEN** the system SHALL return all groups with item count for each

#### Scenario: Get group details
- **WHEN** a user requests GET /api/v1/items/groups/:id
- **THEN** the system SHALL return the group with all variant items

### Requirement: Add item to group
The system SHALL allow adding items as variants to a group.

#### Scenario: Add variant
- **WHEN** a user adds an item to a group with attribute values
- **THEN** the system SHALL link the item to the group and store the attribute combination

#### Scenario: Duplicate attribute combination
- **WHEN** a user attempts to add a variant with the same attribute combination
- **THEN** the system SHALL return 409 Conflict

### Requirement: Update item group
The system SHALL allow updating group name and attributes.

#### Scenario: Update group name
- **WHEN** a user updates the group name
- **THEN** the system SHALL update and return the updated group

#### Scenario: Add attribute value
- **WHEN** a user adds a new value to an existing attribute
- **THEN** the system SHALL update the attribute options

### Requirement: Delete item group
The system SHALL allow deleting item groups.

#### Scenario: Delete group
- **WHEN** a user deletes an item group
- **THEN** the system SHALL delete the group but keep the items (unlink them)
- **AND** return 204 No Content
