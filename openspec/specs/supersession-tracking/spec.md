# Part Supersession Tracking

## Overview
Track when a part number is superseded (replaced) by a newer part. In the auto parts industry, manufacturers regularly discontinue part numbers and replace them with updated versions. Staff need to know when a customer asks for an old part that the new replacement exists, and the system should guide them through the chain of supersessions to the current active part.

## Scope
- **In Scope**: PartSupersession model, supersession chain traversal, supersession banner on item detail, search redirect for superseded parts, supersession management UI
- **Out of Scope**: Automatic supersession data import from manufacturer feeds, pricing adjustments on supersession

## Requirements

### SS-001: PartSupersession Data Model
- **Priority**: P0
- **Description**: Model to track part supersession relationships
- **Acceptance Criteria**:
  - PartSupersession: id, oldItemId, newItemId, effectiveDate, reason, createdById, organizationId
  - Self-referencing through Item model (oldItemId -> Item, newItemId -> Item)
  - An item can be superseded by exactly one item (one-to-one for the "latest" supersession)
  - An item can supersede multiple old items (many old items point to one new item)
  - effectiveDate indicates when the supersession takes effect
  - reason field explains why (e.g., "Manufacturer update", "Design improvement", "Regulatory change")
  - organizationId for multi-tenant isolation

### SS-002: Supersede Item API
- **Priority**: P0
- **Description**: API to mark one item as superseding another
- **Acceptance Criteria**:
  - POST /items/:id/supersede with body { newItemId, effectiveDate?, reason }
  - :id is the OLD item being superseded
  - newItemId is the NEW replacement item
  - Cannot supersede an item with itself
  - Cannot create circular supersession chains (A->B->C->A)
  - Both items must belong to the same organization
  - Both items must exist and be in the same organization
  - If old item already has a supersession, update it (not create a second)
  - Returns the created PartSupersession record

### SS-003: Supersession Chain API
- **Priority**: P0
- **Description**: Retrieve the full chain of supersessions for an item
- **Acceptance Criteria**:
  - GET /items/:id/supersession-chain
  - Returns the complete chain from earliest to latest
  - If item is in the middle of a chain, return the full chain (both predecessors and successors)
  - Each entry includes: item summary (id, sku, name, partNumber, status), effectiveDate, reason
  - Indicate which item in the chain is the "current" (latest active) part
  - Indicate which item was queried
  - Handle chains up to 20 levels deep (prevent infinite loops)
  - Chain direction: follow both supersededBy and supersedes relationships

### SS-004: Supersession Banner on Item Detail
- **Priority**: P0
- **Description**: Display a prominent banner when viewing a superseded item
- **Acceptance Criteria**:
  - If the viewed item HAS BEEN superseded (there exists a PartSupersession where oldItemId = this item):
    - Show warning banner: "This part has been superseded by [NEW PART SKU - NAME]"
    - Include link to the new item
    - Show effective date and reason
    - If the new item is also superseded, show "Latest version: [LATEST PART]"
  - If the viewed item SUPERSEDES another item:
    - Show info banner: "This part supersedes [OLD PART SKU - NAME]"
    - Include link to the old item
  - Banners use Ant Design Alert component with appropriate type (warning/info)

### SS-005: SupersessionChain Component
- **Priority**: P1
- **Description**: Visual display of the full supersession chain
- **Acceptance Criteria**:
  - New tab "Supersession" on item detail page (only shown if item is part of a chain)
  - Timeline or steps component showing the chain
  - Each step shows: SKU, name, part number, effective date, reason, status
  - Current item is highlighted
  - Latest/active item is marked with a badge
  - Clickable items link to their detail pages
  - Show arrow direction from old to new

### SS-006: Search Redirect for Superseded Parts
- **Priority**: P1
- **Description**: When searching for a superseded part, inform the user and offer redirect
- **Acceptance Criteria**:
  - When item search returns a superseded item, show indicator next to it
  - Tag: "Superseded" in orange/red
  - Optional auto-redirect toggle in organization settings
  - When auto-redirect is enabled and search returns exactly one superseded item, show modal:
    "This part has been superseded by [NEW PART]. Would you like to view the replacement?"
    with "View Replacement" and "View Original" buttons
  - In items list, superseded items show a small arrow icon linking to their replacement

### SS-007: Manage Supersessions
- **Priority**: P1
- **Description**: UI to create and manage supersession relationships
- **Acceptance Criteria**:
  - "Supersede" action button on item detail page (in the more/dropdown menu)
  - Opens SupersedeItemModal with:
    - Current item displayed (read-only)
    - New item selector (searchable Select, filters to same organization)
    - Effective date picker (defaults to today)
    - Reason input (text area)
  - "Remove Supersession" option to break a supersession link
  - Confirmation dialog for both actions
  - Only ADMIN and MANAGER roles can manage supersessions

## API Endpoints

```
POST   /api/items/:id/supersede               - Mark item as superseded
DELETE /api/items/:id/supersede               - Remove supersession from item
GET    /api/items/:id/supersession-chain       - Get full supersession chain
GET    /api/items/:id/supersession             - Get direct supersession info (supersededBy + supersedes)
```

## Database Schema

```prisma
model PartSupersession {
  id             String   @id @default(cuid())
  oldItemId      String
  oldItem        Item     @relation("SupersededItem", fields: [oldItemId], references: [id], onDelete: Cascade)
  newItemId      String
  newItem        Item     @relation("SupersedingItem", fields: [newItemId], references: [id], onDelete: Cascade)
  effectiveDate  DateTime @default(now())
  reason         String?  // "Manufacturer update", "Design improvement", etc.
  createdById    String?
  organizationId String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([oldItemId])  // An item can only be superseded once (to one new item)
  @@index([oldItemId])
  @@index([newItemId])
  @@index([organizationId])
}
```

### Changes to Existing Models

```prisma
// Add to Item model relations:
model Item {
  // ... existing fields ...
  supersededBy    PartSupersession?  @relation("SupersededItem")   // This item was replaced by...
  supersedes      PartSupersession[] @relation("SupersedingItem")  // This item replaces these items...
}
```

## DTOs

### SupersedeItemDto
```typescript
import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SupersedeItemDto {
  @ApiProperty({ description: 'ID of the new replacement item' })
  @IsString()
  newItemId: string;

  @ApiPropertyOptional({ description: 'Date supersession takes effect' })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional({ description: 'Reason for supersession', example: 'Manufacturer update' })
  @IsOptional()
  @IsString()
  reason?: string;
}
```

## NestJS Module Structure

```
apps/api/src/modules/items/
├── supersession/
│   ├── supersession.controller.ts
│   ├── supersession.service.ts
│   └── dto/
│       └── supersede-item.dto.ts
├── items.controller.ts
├── items.module.ts                 - Register SupersessionController
└── items.service.ts
```

## Controller Implementation

```typescript
// apps/api/src/modules/items/supersession/supersession.controller.ts
@ApiTags('Part Supersession')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('items')
export class SupersessionController {
  constructor(private readonly supersessionService: SupersessionService) {}

  @Post(':id/supersede')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Mark item as superseded by another item' })
  @ApiResponse({ status: 201, description: 'Supersession created' })
  @ApiResponse({ status: 400, description: 'Validation error (circular chain, same item, etc.)' })
  async supersede(
    @Param('id') oldItemId: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SupersedeItemDto
  ) {
    return this.supersessionService.supersede(oldItemId, organizationId, userId, dto);
  }

  @Delete(':id/supersede')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove supersession from item' })
  async removeSupersession(
    @Param('id') oldItemId: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.supersessionService.removeSupersession(oldItemId, organizationId);
  }

  @Get(':id/supersession-chain')
  @ApiOperation({ summary: 'Get full supersession chain for an item' })
  async getChain(
    @Param('id') itemId: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.supersessionService.getSupersessionChain(itemId, organizationId);
  }

  @Get(':id/supersession')
  @ApiOperation({ summary: 'Get direct supersession info for an item' })
  async getSupersession(
    @Param('id') itemId: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.supersessionService.getDirectSupersession(itemId, organizationId);
  }
}
```

## Service Implementation

```typescript
@Injectable()
export class SupersessionService {
  constructor(private readonly prisma: PrismaService) {}

  async supersede(oldItemId: string, organizationId: string, userId: string, dto: SupersedeItemDto) {
    const { newItemId, effectiveDate, reason } = dto;

    // Validate: not same item
    if (oldItemId === newItemId) {
      throw new BadRequestException('An item cannot supersede itself');
    }

    // Validate: both items exist in same org
    const [oldItem, newItem] = await Promise.all([
      this.prisma.item.findFirst({ where: { id: oldItemId, organizationId } }),
      this.prisma.item.findFirst({ where: { id: newItemId, organizationId } }),
    ]);
    if (!oldItem) throw new NotFoundException('Old item not found');
    if (!newItem) throw new NotFoundException('New item not found');

    // Validate: no circular chain
    await this.validateNoCircularChain(newItemId, oldItemId, organizationId);

    // Upsert: if old item already has supersession, update it
    return this.prisma.partSupersession.upsert({
      where: { oldItemId },
      create: {
        oldItemId,
        newItemId,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        reason,
        createdById: userId,
        organizationId,
      },
      update: {
        newItemId,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
        reason,
      },
      include: {
        oldItem: { select: { id: true, sku: true, name: true, partNumber: true } },
        newItem: { select: { id: true, sku: true, name: true, partNumber: true } },
      },
    });
  }

  async getSupersessionChain(itemId: string, organizationId: string) {
    // Traverse backwards to find the root (earliest) item
    // Then traverse forward to build the complete chain
    // Limit to 20 hops to prevent infinite loops

    const chain: Array<{
      item: { id: string; sku: string; name: string; partNumber: string | null; status: string };
      effectiveDate: Date | null;
      reason: string | null;
      isCurrent: boolean;
      isQueried: boolean;
    }> = [];

    // Find root (traverse backwards from the queried item)
    let currentId = itemId;
    const visited = new Set<string>();
    let hops = 0;

    // Go backwards: find items that this item supersedes
    while (hops < 20) {
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const supersession = await this.prisma.partSupersession.findFirst({
        where: { newItemId: currentId, organizationId },
        include: { oldItem: { select: { id: true, sku: true, name: true, partNumber: true, status: true } } },
      });

      if (!supersession) break;
      currentId = supersession.oldItemId;
      hops++;
    }

    // currentId is now the root. Traverse forward.
    let rootId = currentId;
    visited.clear();
    hops = 0;

    while (hops < 20) {
      if (visited.has(rootId)) break;
      visited.add(rootId);

      const item = await this.prisma.item.findFirst({
        where: { id: rootId, organizationId },
        select: { id: true, sku: true, name: true, partNumber: true, status: true },
      });
      if (!item) break;

      const supersession = await this.prisma.partSupersession.findFirst({
        where: { oldItemId: rootId, organizationId },
      });

      chain.push({
        item,
        effectiveDate: supersession?.effectiveDate || null,
        reason: supersession?.reason || null,
        isCurrent: !supersession, // Last in chain = current
        isQueried: rootId === itemId,
      });

      if (!supersession) break;
      rootId = supersession.newItemId;
      hops++;
    }

    return { chain, queriedItemId: itemId };
  }

  private async validateNoCircularChain(
    startId: string,
    targetId: string,
    organizationId: string
  ) {
    // Follow the chain from startId forward.
    // If we encounter targetId, it would create a cycle.
    let currentId = startId;
    const visited = new Set<string>();
    let hops = 0;

    while (hops < 20) {
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const supersession = await this.prisma.partSupersession.findFirst({
        where: { oldItemId: currentId, organizationId },
      });

      if (!supersession) break;
      if (supersession.newItemId === targetId) {
        throw new BadRequestException(
          'Cannot create supersession: this would create a circular chain'
        );
      }
      currentId = supersession.newItemId;
      hops++;
    }
  }
}
```

## Frontend Components

### File Structure
```
apps/web/src/
├── app/(dashboard)/items/[id]/
│   └── page.tsx                         - Add supersession banner + tab
├── components/items/
│   ├── SupersessionBanner.tsx           - Warning/info banner at top of item detail
│   ├── SupersessionChain.tsx            - Timeline visualization of chain
│   ├── SupersedeItemModal.tsx           - Modal to create supersession
│   └── SupersessionTag.tsx              - Small tag for items list
├── hooks/
│   └── use-supersession.ts              - React Query hooks
└── lib/
    └── supersession.ts                  - API client functions
```

### SupersessionBanner Component
```tsx
// apps/web/src/components/items/SupersessionBanner.tsx
'use client';
import { Alert, Button, Space, Typography } from 'antd';
import { ArrowRightOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useDirectSupersession } from '@/hooks/use-supersession';
import dayjs from 'dayjs';

const { Text } = Typography;

interface Props {
  itemId: string;
}

export function SupersessionBanner({ itemId }: Props) {
  const { data: supersession, isLoading } = useDirectSupersession(itemId);

  if (isLoading || !supersession) return null;

  // Item has been superseded
  if (supersession.supersededBy) {
    const newItem = supersession.supersededBy.newItem;
    return (
      <Alert
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        message="This part has been superseded"
        description={
          <Space direction="vertical">
            <Text>
              Replaced by{' '}
              <Link href={`/items/${newItem.id}`}>
                <Text strong>{newItem.sku} - {newItem.name}</Text>
              </Link>
            </Text>
            {supersession.supersededBy.effectiveDate && (
              <Text type="secondary">
                Effective: {dayjs(supersession.supersededBy.effectiveDate).format('DD MMM YYYY')}
              </Text>
            )}
            {supersession.supersededBy.reason && (
              <Text type="secondary">Reason: {supersession.supersededBy.reason}</Text>
            )}
          </Space>
        }
        action={
          <Link href={`/items/${newItem.id}`}>
            <Button type="primary" size="small" icon={<ArrowRightOutlined />}>
              View Replacement
            </Button>
          </Link>
        }
        style={{ marginBottom: 16 }}
      />
    );
  }

  // Item supersedes other items
  if (supersession.supersedes?.length > 0) {
    return (
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message={`This part supersedes ${supersession.supersedes.length} item(s)`}
        description={
          <Space>
            {supersession.supersedes.map((s) => (
              <Link key={s.oldItem.id} href={`/items/${s.oldItem.id}`}>
                <Text>{s.oldItem.sku}</Text>
              </Link>
            ))}
          </Space>
        }
        style={{ marginBottom: 16 }}
      />
    );
  }

  return null;
}
```

### SupersessionChain Component
```tsx
// apps/web/src/components/items/SupersessionChain.tsx
'use client';
import { Steps, Tag, Typography, Space } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useSupersessionChain } from '@/hooks/use-supersession';
import dayjs from 'dayjs';

const { Text } = Typography;

interface Props {
  itemId: string;
}

export function SupersessionChain({ itemId }: Props) {
  const { data, isLoading } = useSupersessionChain(itemId);

  if (isLoading || !data?.chain?.length) return null;

  return (
    <Steps
      direction="vertical"
      current={data.chain.findIndex((c) => c.isCurrent)}
      items={data.chain.map((entry, index) => ({
        title: (
          <Space>
            <Link href={`/items/${entry.item.id}`}>
              <Text strong={entry.isQueried}>{entry.item.sku} - {entry.item.name}</Text>
            </Link>
            {entry.isCurrent && <Tag color="green">Current</Tag>}
            {entry.isQueried && <Tag color="blue">Viewing</Tag>}
            {entry.item.status === 'INACTIVE' && <Tag color="red">Inactive</Tag>}
          </Space>
        ),
        description: entry.effectiveDate ? (
          <Space direction="vertical" size={0}>
            <Text type="secondary">
              Superseded on {dayjs(entry.effectiveDate).format('DD MMM YYYY')}
            </Text>
            {entry.reason && <Text type="secondary">Reason: {entry.reason}</Text>}
          </Space>
        ) : null,
        status: entry.isCurrent ? 'finish' : index < data.chain.findIndex((c) => c.isCurrent) ? 'finish' : 'wait',
      }))}
    />
  );
}
```

### SupersedeItemModal Component
```tsx
// Modal to create a supersession from item detail "More" menu
// Fields:
// - Current item (read-only display)
// - New Item (searchable Select, loads items from same org, excludes current item)
// - Effective Date (DatePicker, defaults to today)
// - Reason (TextArea)
// On submit: POST /items/:id/supersede
```

### Integration with Item Detail Page
```tsx
// Add to items/[id]/page.tsx:

// 1. Add SupersessionBanner above the stats row:
<SupersessionBanner itemId={id} />

// 2. Add "Supersession" tab (conditionally shown if item is part of a chain):
{
  key: 'supersession',
  label: 'Supersession',
  children: <SupersessionChain itemId={id} />,
}

// 3. Add "Supersede" option to the more menu:
{
  key: 'supersede',
  icon: <SwapOutlined />,
  label: 'Supersede This Item',
  onClick: () => setShowSupersedeModal(true),
}
```

### React Query Hooks
```typescript
// apps/web/src/hooks/use-supersession.ts
export function useDirectSupersession(itemId: string) {
  return useQuery({
    queryKey: ['supersession', itemId],
    queryFn: () => apiClient.get(`/items/${itemId}/supersession`).then(r => r.data),
    enabled: !!itemId,
  });
}

export function useSupersessionChain(itemId: string) {
  return useQuery({
    queryKey: ['supersession-chain', itemId],
    queryFn: () => apiClient.get(`/items/${itemId}/supersession-chain`).then(r => r.data),
    enabled: !!itemId,
  });
}

export function useSupersede(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SupersedeItemDto) =>
      apiClient.post(`/items/${itemId}/supersede`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supersession'] });
      queryClient.invalidateQueries({ queryKey: ['supersession-chain'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
```

## Business Logic and Validation Rules

1. **No self-supersession**: An item cannot supersede itself.
2. **No circular chains**: Before creating a supersession A->B, traverse the chain forward from B. If A is encountered, reject the operation.
3. **Single supersession per old item**: Each item can only be superseded by one new item. The @@unique([oldItemId]) constraint enforces this. Creating a new supersession for an already-superseded item updates the existing record.
4. **Many-to-one allowed**: Multiple old items can point to the same new item (consolidation).
5. **Chain depth limit**: Chain traversal is limited to 20 hops to prevent performance issues.
6. **Cross-organization isolation**: Supersession relationships only exist within an organization.
7. **Soft delete awareness**: Superseded items are NOT automatically set to INACTIVE. The business may still want to sell remaining stock of old parts. Inactivation is a separate decision.
8. **Search integration**: Items list search results should indicate superseded items visually (tag or icon) so users can quickly identify discontinued parts.
