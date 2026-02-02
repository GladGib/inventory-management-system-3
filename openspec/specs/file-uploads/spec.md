## ADDED Requirements

### Requirement: Upload item image
The system SHALL allow users to upload images for items.

#### Scenario: Request upload URL
- **WHEN** a user requests POST /api/v1/items/:id/images with filename and contentType
- **THEN** the system SHALL return a presigned upload URL for MinIO/S3

#### Scenario: Confirm upload
- **WHEN** a user completes upload and confirms with the image path
- **THEN** the system SHALL add the image path to item's images array

#### Scenario: Upload limit
- **WHEN** an item already has 5 images
- **THEN** the system SHALL return 400 Bad Request with message "Maximum 5 images per item"

### Requirement: Image validation
The system SHALL validate uploaded images.

#### Scenario: File type validation
- **WHEN** requesting upload URL
- **THEN** the system SHALL only accept contentType: image/jpeg, image/png, image/webp

#### Scenario: File size limit
- **WHEN** generating presigned URL
- **THEN** the URL SHALL enforce maximum file size of 2MB

### Requirement: Delete item image
The system SHALL allow users to delete item images.

#### Scenario: Delete image
- **WHEN** a user requests DELETE /api/v1/items/:id/images/:imageId
- **THEN** the system SHALL remove the image path from item's images array
- **AND** delete the file from storage

### Requirement: Image ordering
The system SHALL support ordering images for items.

#### Scenario: First image as primary
- **WHEN** an item has multiple images
- **THEN** the first image in the array SHALL be the primary/thumbnail image

#### Scenario: Reorder images
- **WHEN** a user updates item with reordered images array
- **THEN** the system SHALL save the new order

### Requirement: Image URLs
The system SHALL provide accessible URLs for images.

#### Scenario: Get image URL
- **WHEN** retrieving item details
- **THEN** images SHALL be returned as full URLs (presigned for private buckets)

#### Scenario: Thumbnail URL
- **WHEN** listing items
- **THEN** the system MAY return a thumbnail URL for the primary image

### Requirement: Storage organization
The system SHALL organize files by organization and entity.

#### Scenario: File path structure
- **WHEN** storing an image
- **THEN** the path SHALL follow: {organizationId}/items/{itemId}/{filename}

#### Scenario: Unique filenames
- **WHEN** uploading a file
- **THEN** the system SHALL generate a unique filename to prevent overwrites
