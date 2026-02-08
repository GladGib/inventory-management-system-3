# Part Number Cross-Reference

## Overview
Manage cross-reference mappings between OEM part numbers, aftermarket part numbers, and internal SKUs. Auto parts wholesalers need to look up items by any manufacturer's part number, not just their own SKU. This feature enables counter staff to find the right part regardless of which number the customer provides.

## Scope
- **In Scope**: CrossReference model, CRUD API, cross-reference search, bulk CSV import, frontend table and modal on item detail, part number search bar on items list
- **Out of Scope**: Automatic cross-reference scraping from external databases, barcode-based lookups (see barcode-support spec)

## Requirements

### XR-001: CrossReference Data Model
- **Priority**: P0
- **Description**: Dedicated model for part number cross-references linked to items
- **Acceptance Criteria**:
  - Separate `CrossReference` model (not the existing `crossReferences` String[] on Item)
  - Fields: oemNumber, aftermarketNumber, brand, notes
  - Each cross-reference belongs to one item and one organization
  - An item can have many cross-references
  - OEM number and aftermarket number are both optional (at least one required)
  - Brand field to identify the manufacturer (e.g., "Denso", "Bosch", "TRW")
  - Notes field for additional context (e.g., "fits only early model", "requires adapter")

### XR-002: CRUD API for Cross-References
- **Priority**: P0
- **Description**: Full API for managing cross-references on an item
- **Acceptance Criteria**:
  - GET /items/:id/cross-references returns all cross-refs for an item
  - POST /items/:id/cross-references creates a new cross-reference
  - PUT /items/cross-references/:id updates an existing cross-reference
  - DELETE /items/cross-references/:id removes a cross-reference
  - Validate that at least one of oemNumber or aftermarketNumber is provided
  - Organization-scoped (only see/modify your own org's data)
  - Include item details in response for context

### XR-003: Cross-Reference Part Number Search
- **Priority**: P0
- **Description**: Search across all part numbers (OEM, aftermarket, cross-references) to find items
- **Acceptance Criteria**:
  - GET /items/search/by-part-number?query=xxx
  - Searches: Item.partNumber, Item.sku, CrossReference.oemNumber, CrossReference.aftermarketNumber
  - Case-insensitive partial matching
  - Returns matching items with the matched cross-reference highlighted
  - Supports pagination
  - Response includes which field matched and the match value
  - Organization-scoped

### XR-004: Bulk Import from CSV
- **Priority**: P1
- **Description**: Import cross-references in bulk from a CSV file
- **Acceptance Criteria**:
  - POST /items/cross-references/import (multipart form with CSV)
  - CSV columns: itemSku (or itemId), oemNumber, aftermarketNumber, brand, notes
  - Match items by SKU within the organization
  - Skip rows with invalid/missing item references and report errors
  - Return summary: imported count, skipped count, error details
  - Maximum 5000 rows per import
  - Duplicate detection (same oemNumber+aftermarketNumber+itemId combination)

### XR-005: CrossReferenceTable Component
- **Priority**: P0
- **Description**: Table displaying all cross-references on the item detail page
- **Acceptance Criteria**:
  - New tab "Cross References" on item detail page tabs
  - Ant Design Table with columns: OEM Number, Aftermarket Number, Brand, Notes, Actions
  - Actions: Edit (opens modal), Delete (confirmation)
  - "Add Cross Reference" button above table
  - Empty state with "No cross-references found" message and add button
  - Sortable by brand column

### XR-006: AddCrossReferenceModal
- **Priority**: P0
- **Description**: Modal form to add/edit a cross-reference
- **Acceptance Criteria**:
  - Ant Design Modal with Form
  - Fields: OEM Number (Input), Aftermarket Number (Input), Brand (Input with AutoComplete from existing brands), Notes (TextArea)
  - Validation: at least one of OEM or aftermarket number required
  - Reusable for both create and edit (pre-fill form on edit)
  - Success toast notification on save
  - Form resets on close

### XR-007: Part Number Search Bar on Items List
- **Priority**: P0
- **Description**: Enhanced search on items list page that searches across all part numbers
- **Acceptance Criteria**:
  - Additional search mode/toggle on items list page: "Search by Part Number"
  - Calls the /items/search/by-part-number endpoint
  - Shows matched part number type (OEM/Aftermarket/SKU) as a tag on each result
  - Integrates with existing items list pagination
  - Search input with clear button and search icon

## API Endpoints

```
GET    /api/items/:id/cross-references              - List cross-references for item
POST   /api/items/:id/cross-references              - Create cross-reference for item
PUT    /api/items/cross-references/:id              - Update cross-reference
DELETE /api/items/cross-references/:id              - Delete cross-reference
GET    /api/items/search/by-part-number?query=xxx   - Search items by any part number
POST   /api/items/cross-references/import           - Bulk import from CSV
```

## Database Schema

```prisma
model CrossReference {
  id                String   @id @default(cuid())
  itemId            String
  item              Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  oemNumber         String?  // OEM part number (e.g., Toyota 90919-02252)
  aftermarketNumber String?  // Aftermarket number (e.g., Denso 234-9060)
  brand             String?  // Brand/manufacturer name (e.g., "Denso", "Bosch")
  notes             String?  // Additional context
  organizationId    String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([itemId])
  @@index([organizationId])
  @@index([oemNumber])
  @@index([aftermarketNumber])
  @@index([brand])
  // Prevent exact duplicates per item
  @@unique([itemId, oemNumber, aftermarketNumber])
}
```

### Changes to Existing Models

```prisma
// Add to Item model relations:
model Item {
  // ... existing fields ...
  crossReferenceRecords CrossReference[]  // New relation
  // Note: Keep existing crossReferences String[] for backward compat during migration
}

// Add to Organization model relations:
model Organization {
  // ... existing fields ...
  // No direct relation needed - cross-references are accessed via items
}
```

## DTOs

### CreateCrossReferenceDto
```typescript
// apps/api/src/modules/items/dto/create-cross-reference.dto.ts
import { IsString, IsOptional, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCrossReferenceDto {
  @ApiPropertyOptional({ description: 'OEM part number', example: '90919-02252' })
  @IsOptional()
  @IsString()
  oemNumber?: string;

  @ApiPropertyOptional({ description: 'Aftermarket part number', example: '234-9060' })
  @IsOptional()
  @IsString()
  aftermarketNumber?: string;

  @ApiPropertyOptional({ description: 'Brand/manufacturer', example: 'Denso' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
// Custom validation: at least one of oemNumber or aftermarketNumber must be provided
```

### UpdateCrossReferenceDto
```typescript
// Extends Partial<CreateCrossReferenceDto>
// Same validation rule applies
```

### PartNumberSearchDto
```typescript
import { IsString, MinLength } from 'class-validator';
import { IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PartNumberSearchDto {
  @ApiProperty({ description: 'Part number search query', example: '90919' })
  @IsString()
  @MinLength(2)
  query: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
```

### BulkImportCrossReferenceDto
```typescript
// CSV file upload - handled via multer/file upload
// CSV format: itemSku, oemNumber, aftermarketNumber, brand, notes
```

## NestJS Module Structure

```
apps/api/src/modules/items/
├── cross-references/
│   ├── cross-references.controller.ts   - Routes for cross-reference CRUD + search
│   ├── cross-references.service.ts      - Business logic
│   └── dto/
│       ├── create-cross-reference.dto.ts
│       ├── update-cross-reference.dto.ts
│       ├── part-number-search.dto.ts
│       └── import-cross-references.dto.ts
├── items.controller.ts                   - Add search/by-part-number route
├── items.module.ts                       - Register CrossReferencesController
├── items.service.ts
└── dto/
```

## Controller Implementation

```typescript
// apps/api/src/modules/items/cross-references/cross-references.controller.ts
@ApiTags('Cross References')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('items')
export class CrossReferencesController {
  constructor(private readonly crossRefsService: CrossReferencesService) {}

  @Get('search/by-part-number')
  @ApiOperation({ summary: 'Search items by any part number (OEM, aftermarket, SKU)' })
  async searchByPartNumber(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: PartNumberSearchDto
  ) {
    return this.crossRefsService.searchByPartNumber(organizationId, query);
  }

  @Get(':id/cross-references')
  @ApiOperation({ summary: 'List cross-references for an item' })
  async findAll(
    @Param('id') itemId: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.crossRefsService.findAllForItem(itemId, organizationId);
  }

  @Post(':id/cross-references')
  @ApiOperation({ summary: 'Add cross-reference to item' })
  async create(
    @Param('id') itemId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateCrossReferenceDto
  ) {
    return this.crossRefsService.create(itemId, organizationId, dto);
  }

  @Put('cross-references/:id')
  @ApiOperation({ summary: 'Update cross-reference' })
  async update(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateCrossReferenceDto
  ) {
    return this.crossRefsService.update(id, organizationId, dto);
  }

  @Delete('cross-references/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete cross-reference' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.crossRefsService.remove(id, organizationId);
  }

  @Post('cross-references/import')
  @ApiOperation({ summary: 'Bulk import cross-references from CSV' })
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.crossRefsService.importFromCsv(organizationId, file);
  }
}
```

## Service Implementation

```typescript
// apps/api/src/modules/items/cross-references/cross-references.service.ts
@Injectable()
export class CrossReferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForItem(itemId: string, organizationId: string) {
    // Verify item belongs to org
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, organizationId },
    });
    if (!item) throw new NotFoundException('Item not found');

    return this.prisma.crossReference.findMany({
      where: { itemId, organizationId },
      orderBy: { brand: 'asc' },
    });
  }

  async create(itemId: string, organizationId: string, dto: CreateCrossReferenceDto) {
    // Validate at least one part number
    if (!dto.oemNumber && !dto.aftermarketNumber) {
      throw new BadRequestException('At least one of oemNumber or aftermarketNumber is required');
    }

    // Verify item belongs to org
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, organizationId },
    });
    if (!item) throw new NotFoundException('Item not found');

    // Check for duplicate
    const existing = await this.prisma.crossReference.findFirst({
      where: {
        itemId,
        oemNumber: dto.oemNumber || null,
        aftermarketNumber: dto.aftermarketNumber || null,
      },
    });
    if (existing) throw new ConflictException('Cross-reference already exists for this item');

    return this.prisma.crossReference.create({
      data: { ...dto, itemId, organizationId },
    });
  }

  async searchByPartNumber(organizationId: string, query: PartNumberSearchDto) {
    const { query: searchTerm, page = 1, limit = 25 } = query;
    const skip = (page - 1) * limit;

    // Search across items and cross-references
    const [items, total] = await Promise.all([
      this.prisma.item.findMany({
        where: {
          organizationId,
          status: 'ACTIVE',
          OR: [
            { sku: { contains: searchTerm, mode: 'insensitive' } },
            { partNumber: { contains: searchTerm, mode: 'insensitive' } },
            {
              crossReferenceRecords: {
                some: {
                  OR: [
                    { oemNumber: { contains: searchTerm, mode: 'insensitive' } },
                    { aftermarketNumber: { contains: searchTerm, mode: 'insensitive' } },
                  ],
                },
              },
            },
          ],
        },
        include: {
          category: { select: { id: true, name: true } },
          crossReferenceRecords: true,
          stockLevels: { select: { stockOnHand: true } },
        },
        skip,
        take: limit,
      }),
      this.prisma.item.count({
        where: {
          organizationId,
          status: 'ACTIVE',
          OR: [
            { sku: { contains: searchTerm, mode: 'insensitive' } },
            { partNumber: { contains: searchTerm, mode: 'insensitive' } },
            {
              crossReferenceRecords: {
                some: {
                  OR: [
                    { oemNumber: { contains: searchTerm, mode: 'insensitive' } },
                    { aftermarketNumber: { contains: searchTerm, mode: 'insensitive' } },
                  ],
                },
              },
            },
          ],
        },
      }),
    ]);

    // Annotate each result with the match source
    const results = items.map((item) => {
      let matchSource = 'sku';
      let matchValue = item.sku;

      if (item.partNumber?.toLowerCase().includes(searchTerm.toLowerCase())) {
        matchSource = 'partNumber';
        matchValue = item.partNumber;
      }

      const matchingRef = item.crossReferenceRecords.find(
        (ref) =>
          ref.oemNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ref.aftermarketNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (matchingRef) {
        if (matchingRef.oemNumber?.toLowerCase().includes(searchTerm.toLowerCase())) {
          matchSource = 'oemNumber';
          matchValue = matchingRef.oemNumber;
        } else {
          matchSource = 'aftermarketNumber';
          matchValue = matchingRef.aftermarketNumber;
        }
      }

      const totalStock = item.stockLevels.reduce(
        (sum, sl) => sum + Number(sl.stockOnHand), 0
      );

      return {
        ...item,
        stockOnHand: totalStock,
        matchSource,
        matchValue,
        stockLevels: undefined,
      };
    });

    return {
      data: results,
      meta: { total, page, limit, hasMore: page * limit < total },
    };
  }

  async importFromCsv(organizationId: string, file: Express.Multer.File) {
    // Parse CSV, validate rows, batch insert
    // Return { imported: number, skipped: number, errors: string[] }
  }
}
```

## Frontend Components

### File Structure
```
apps/web/src/
├── app/(dashboard)/items/[id]/
│   └── page.tsx                          - Add "Cross References" tab
├── components/items/
│   ├── CrossReferenceTable.tsx           - Table component for cross-refs
│   ├── AddCrossReferenceModal.tsx        - Add/edit modal
│   ├── PartNumberSearchBar.tsx           - Search input component
│   └── ImportCrossReferencesModal.tsx    - CSV import modal
├── hooks/
│   └── use-cross-references.ts           - React Query hooks
└── lib/
    └── cross-references.ts               - API client functions
```

### CrossReferenceTable Component
```tsx
// apps/web/src/components/items/CrossReferenceTable.tsx
'use client';
import { Table, Button, Space, Popconfirm, Tag, Empty } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { useCrossReferences, useDeleteCrossReference } from '@/hooks/use-cross-references';
import { AddCrossReferenceModal } from './AddCrossReferenceModal';
import { ImportCrossReferencesModal } from './ImportCrossReferencesModal';

interface Props {
  itemId: string;
}

export function CrossReferenceTable({ itemId }: Props) {
  const { data: crossRefs, isLoading } = useCrossReferences(itemId);
  const deleteMutation = useDeleteCrossReference();
  // State for modals: showAddModal, editingRef, showImportModal

  const columns = [
    { title: 'OEM Number', dataIndex: 'oemNumber', key: 'oemNumber',
      render: (val: string) => val || '-' },
    { title: 'Aftermarket Number', dataIndex: 'aftermarketNumber', key: 'aftermarketNumber',
      render: (val: string) => val || '-' },
    { title: 'Brand', dataIndex: 'brand', key: 'brand', sorter: true,
      render: (val: string) => val ? <Tag>{val}</Tag> : '-' },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', ellipsis: true },
    { title: 'Actions', key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => setEditingRef(record)} />
          <Popconfirm title="Delete this cross-reference?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddModal(true)}>
            Add Cross Reference
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => setShowImportModal(true)}>
            Import CSV
          </Button>
        </Space>
      </div>
      <Table
        columns={columns}
        dataSource={crossRefs}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        locale={{ emptyText: <Empty description="No cross-references found" /> }}
      />
      <AddCrossReferenceModal itemId={itemId} open={showAddModal} editingRef={editingRef} onClose={handleClose} />
      <ImportCrossReferencesModal itemId={itemId} open={showImportModal} onClose={() => setShowImportModal(false)} />
    </div>
  );
}
```

### AddCrossReferenceModal Component
```tsx
// apps/web/src/components/items/AddCrossReferenceModal.tsx
'use client';
import { Modal, Form, Input, AutoComplete, message } from 'antd';
import { useCreateCrossReference, useUpdateCrossReference, useBrandSuggestions } from '@/hooks/use-cross-references';

interface Props {
  itemId: string;
  open: boolean;
  editingRef?: CrossReference | null;
  onClose: () => void;
}

export function AddCrossReferenceModal({ itemId, open, editingRef, onClose }: Props) {
  const [form] = Form.useForm();
  const createMutation = useCreateCrossReference(itemId);
  const updateMutation = useUpdateCrossReference();
  const { data: brandOptions } = useBrandSuggestions();

  // Pre-fill form when editing
  // Custom validator: at least one of oemNumber or aftermarketNumber
  // On submit: create or update based on editingRef presence
  // Reset form on close

  return (
    <Modal
      title={editingRef ? 'Edit Cross Reference' : 'Add Cross Reference'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="oemNumber" label="OEM Part Number">
          <Input placeholder="e.g., 90919-02252" />
        </Form.Item>
        <Form.Item name="aftermarketNumber" label="Aftermarket Part Number">
          <Input placeholder="e.g., 234-9060" />
        </Form.Item>
        <Form.Item name="brand" label="Brand / Manufacturer">
          <AutoComplete options={brandOptions} placeholder="e.g., Denso" filterOption />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={3} placeholder="Additional context..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
```

### PartNumberSearchBar Component
```tsx
// apps/web/src/components/items/PartNumberSearchBar.tsx
'use client';
import { Input, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

// Debounced search input that calls /items/search/by-part-number
// Results show the match source as a colored tag: OEM (blue), Aftermarket (orange), SKU (green)
// Integrates with items list page to replace/augment the standard search
```

### React Query Hooks
```typescript
// apps/web/src/hooks/use-cross-references.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useCrossReferences(itemId: string) {
  return useQuery({
    queryKey: ['cross-references', itemId],
    queryFn: () => apiClient.get(`/items/${itemId}/cross-references`).then(r => r.data),
    enabled: !!itemId,
  });
}

export function useCreateCrossReference(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.post(`/items/${itemId}/cross-references`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cross-references', itemId] });
    },
  });
}

export function useDeleteCrossReference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/items/cross-references/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cross-references'] });
    },
  });
}

export function usePartNumberSearch(query: string, page?: number, limit?: number) {
  return useQuery({
    queryKey: ['part-number-search', query, page, limit],
    queryFn: () => apiClient.get('/items/search/by-part-number', {
      params: { query, page, limit },
    }).then(r => r.data),
    enabled: query.length >= 2,
  });
}
```

## Integration with Item Detail Page

Add a new tab to the existing item detail page at `apps/web/src/app/(dashboard)/items/[id]/page.tsx`:

```tsx
// Add to the Tabs items array:
{
  key: 'crossReferences',
  label: 'Cross References',
  children: <CrossReferenceTable itemId={id} />,
}
```

## Business Logic and Validation Rules

1. **At least one number required**: Every CrossReference must have at least oemNumber or aftermarketNumber populated. The API must reject requests with both blank.
2. **Uniqueness**: The combination of (itemId, oemNumber, aftermarketNumber) must be unique to prevent duplicate entries.
3. **Organization isolation**: All queries must filter by organizationId. Cross-references from other organizations must never be visible.
4. **Cascade delete**: When an Item is deleted, all its CrossReferences are cascade-deleted.
5. **Search ranking**: When searching by part number, exact matches should rank higher than partial matches. SKU matches take priority, then partNumber, then cross-references.
6. **CSV import validation**: Each CSV row is validated independently. Invalid rows do not prevent valid rows from importing. A summary report is always returned.
7. **Backward compatibility**: The existing `crossReferences` String[] field on Item is retained during migration but the new CrossReference model is the source of truth going forward. A migration script should copy existing String[] values into CrossReference records.

## Migration Notes

A data migration is needed to copy values from `Item.crossReferences` (String[]) into the new `CrossReference` model:

```typescript
// For each item with crossReferences entries:
// - Create a CrossReference record with aftermarketNumber = the string value
// - Set brand to null (unknown from legacy data)
// - After migration, the Item.crossReferences field can be deprecated
```
