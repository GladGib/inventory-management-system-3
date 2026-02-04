# Item Images Upload UI

## Overview
Frontend interface for uploading, managing, and displaying item images.

## Requirements

### IMG-001: Image Upload Component
- **Priority**: P1
- **Description**: Drag-and-drop image upload for items
- **Acceptance Criteria**:
  - Ant Design Upload component with drag area
  - Support JPEG, PNG, WebP formats
  - Max file size 2MB validation
  - Progress indicator during upload
  - Preview thumbnail after upload
  - Error messages for invalid files

### IMG-002: Image Gallery Display
- **Priority**: P1
- **Description**: Display item images in gallery format
- **Acceptance Criteria**:
  - Grid layout for multiple images
  - First image marked as primary/thumbnail
  - Lightbox preview on click
  - Zoom capability in lightbox

### IMG-003: Image Management
- **Priority**: P1
- **Description**: Manage uploaded images
- **Acceptance Criteria**:
  - Delete image with confirmation
  - Drag-and-drop reordering
  - Set primary image (first position)
  - Maximum 5 images per item

### IMG-004: Item Form Integration
- **Priority**: P1
- **Description**: Integrate images into item create/edit form
- **Acceptance Criteria**:
  - Images section in item form
  - Upload during item creation
  - Modify images during edit
  - Show current images count

### IMG-005: Item List Thumbnail
- **Priority**: P2
- **Description**: Show thumbnail in item list
- **Acceptance Criteria**:
  - Small thumbnail in list view
  - Placeholder for items without images
  - Lazy loading for performance

## UI Components

### ImageUploader Component
```tsx
interface ImageUploaderProps {
  itemId?: string;
  images: ItemImage[];
  maxImages?: number;
  onChange: (images: ItemImage[]) => void;
  disabled?: boolean;
}

interface ItemImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  order: number;
}
```

### Upload Flow
1. User drops/selects file
2. Validate file type and size client-side
3. Request presigned URL: `POST /api/items/:id/images`
4. Upload to presigned URL (direct to storage)
5. Confirm upload: `PUT /api/items/:id/images/:imageId/confirm`
6. Update local state with new image

### ImageGallery Component
```tsx
interface ImageGalleryProps {
  images: ItemImage[];
  editable?: boolean;
  onReorder?: (images: ItemImage[]) => void;
  onDelete?: (imageId: string) => void;
}
```

## API Integration

```typescript
// services/items.ts
export const itemImageApi = {
  requestUploadUrl: (itemId: string, filename: string, contentType: string) =>
    api.post(`/items/${itemId}/images`, { filename, contentType }),

  confirmUpload: (itemId: string, imageId: string) =>
    api.put(`/items/${itemId}/images/${imageId}/confirm`),

  deleteImage: (itemId: string, imageId: string) =>
    api.delete(`/items/${itemId}/images/${imageId}`),

  reorderImages: (itemId: string, imageIds: string[]) =>
    api.put(`/items/${itemId}/images/reorder`, { imageIds }),
};
```

## Styling

- Use Ant Design Image component for gallery
- Sortable grid using @dnd-kit/sortable
- Consistent thumbnail sizes (100x100 for list, 200x200 for form)
- Hover overlay with delete button
- Primary image badge indicator
