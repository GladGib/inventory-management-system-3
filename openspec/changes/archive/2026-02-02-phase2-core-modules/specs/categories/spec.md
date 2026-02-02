## ADDED Requirements

### Requirement: List categories as tree
The system SHALL provide categories in a hierarchical tree structure.

#### Scenario: Full category tree
- **WHEN** a user requests GET /api/v1/categories
- **THEN** the system SHALL return all categories with nested children structure

#### Scenario: Flat list option
- **WHEN** a user requests GET /api/v1/categories?flat=true
- **THEN** the system SHALL return categories as a flat list with parentId references

### Requirement: Create category
The system SHALL allow users to create categories with optional parent.

#### Scenario: Root category creation
- **WHEN** a user creates a category without parentId
- **THEN** the system SHALL create a root-level category

#### Scenario: Child category creation
- **WHEN** a user creates a category with valid parentId
- **THEN** the system SHALL create the category as a child of the specified parent

#### Scenario: Invalid parent
- **WHEN** a user creates a category with non-existent parentId
- **THEN** the system SHALL return 400 Bad Request

#### Scenario: Duplicate name in same level
- **WHEN** a user creates a category with a name that exists at the same level
- **THEN** the system SHALL return 409 Conflict

### Requirement: Update category
The system SHALL allow users to update category name and parent.

#### Scenario: Rename category
- **WHEN** a user updates category name
- **THEN** the system SHALL update the name and return the updated category

#### Scenario: Move category
- **WHEN** a user updates category parentId
- **THEN** the system SHALL move the category and all its children to the new parent

#### Scenario: Circular reference prevention
- **WHEN** a user attempts to set parentId to the category itself or its descendant
- **THEN** the system SHALL return 400 Bad Request with message "Circular reference not allowed"

### Requirement: Delete category
The system SHALL allow users to delete empty categories.

#### Scenario: Delete empty category
- **WHEN** a user deletes a category with no items and no children
- **THEN** the system SHALL delete the category and return 204 No Content

#### Scenario: Delete category with items
- **WHEN** a user attempts to delete a category that has items assigned
- **THEN** the system SHALL return 400 Bad Request with message "Cannot delete category with items"

#### Scenario: Delete category with children
- **WHEN** a user attempts to delete a category that has child categories
- **THEN** the system SHALL return 400 Bad Request with message "Cannot delete category with children"

### Requirement: Category item count
The system SHALL provide item counts for categories.

#### Scenario: Include item count
- **WHEN** retrieving categories
- **THEN** each category SHALL include itemCount showing number of items in that category
