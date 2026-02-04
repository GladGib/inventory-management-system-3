import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateItemGroupDto, AttributeDto } from './dto/create-item-group.dto';
import { UpdateItemGroupDto } from './dto/update-item-group.dto';
import { ItemGroupQueryDto } from './dto/item-group-query.dto';
import { GenerateVariantsDto } from './dto/generate-variants.dto';

@Injectable()
export class ItemGroupsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, query: ItemGroupQueryDto) {
    const { search, status, page = 1, limit = 25 } = query;

    const where: any = { organizationId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [groups, total] = await Promise.all([
      this.prisma.itemGroup.findMany({
        where,
        include: {
          _count: {
            select: { items: true },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.itemGroup.count({ where }),
    ]);

    return {
      data: groups.map((g) => ({
        ...g,
        itemCount: g._count.items,
        _count: undefined,
      })),
      meta: {
        total,
        page,
        limit,
        hasMore: page * limit < total,
      },
    };
  }

  async findById(id: string, organizationId: string) {
    const group = await this.prisma.itemGroup.findFirst({
      where: { id, organizationId },
      include: {
        items: {
          orderBy: { sku: 'asc' },
          include: {
            stockLevels: {
              select: {
                stockOnHand: true,
                warehouseId: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Item group not found');
    }

    // Calculate total stock for each item
    const itemsWithStock = group.items.map((item) => ({
      ...item,
      totalStock: item.stockLevels.reduce(
        (sum, sl) => sum + Number(sl.stockOnHand),
        0
      ),
    }));

    return {
      ...group,
      items: itemsWithStock,
      itemCount: group.items.length,
    };
  }

  async create(organizationId: string, dto: CreateItemGroupDto) {
    // Check for duplicate name
    const existing = await this.prisma.itemGroup.findFirst({
      where: { organizationId, name: dto.name },
    });

    if (existing) {
      throw new ConflictException('Item group with this name already exists');
    }

    return this.prisma.itemGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
        attributes: dto.attributes as any,
        organizationId,
      },
    });
  }

  async update(id: string, organizationId: string, dto: UpdateItemGroupDto) {
    await this.findById(id, organizationId);

    // Check for duplicate name if name is being changed
    if (dto.name) {
      const existing = await this.prisma.itemGroup.findFirst({
        where: { organizationId, name: dto.name, id: { not: id } },
      });

      if (existing) {
        throw new ConflictException('Item group with this name already exists');
      }
    }

    return this.prisma.itemGroup.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        attributes: dto.attributes as any,
        status: dto.status,
      },
    });
  }

  async delete(id: string, organizationId: string) {
    const group = await this.findById(id, organizationId);

    // Check if has items
    if ((group as any).itemCount > 0) {
      throw new BadRequestException(
        `Cannot delete item group. It has ${(group as any).itemCount} associated item(s).`
      );
    }

    await this.prisma.itemGroup.delete({ where: { id } });
  }

  async generateVariants(
    groupId: string,
    organizationId: string,
    dto: GenerateVariantsDto
  ) {
    const group = await this.findById(groupId, organizationId);
    const attributes = group.attributes as unknown as AttributeDto[];

    if (!attributes || attributes.length === 0) {
      throw new BadRequestException('Item group has no attributes defined');
    }

    // Generate all combinations
    const combinations = this.generateCombinations(attributes);
    const createdItems: any[] = [];

    for (const combo of combinations) {
      // Generate SKU from base SKU and attribute values
      const sku = this.generateVariantSku(dto.baseSku, combo);

      // Check if SKU already exists
      const existingItem = await this.prisma.item.findFirst({
        where: { organizationId, sku },
      });

      if (!existingItem) {
        // Generate name from base name and attribute values
        const name = this.generateVariantName(dto.baseName, combo);

        const item = await this.prisma.item.create({
          data: {
            sku,
            name,
            description: dto.description,
            type: 'INVENTORY',
            unit: dto.unit || 'pcs',
            costPrice: dto.baseCostPrice || 0,
            sellingPrice: dto.baseSellingPrice || 0,
            trackInventory: true,
            itemGroupId: groupId,
            organizationId,
            categoryId: dto.categoryId,
          },
        });

        createdItems.push(item);
      }
    }

    return {
      created: createdItems.length,
      skipped: combinations.length - createdItems.length,
      items: createdItems,
    };
  }

  async removeVariant(
    groupId: string,
    variantId: string,
    organizationId: string
  ) {
    const group = await this.findById(groupId, organizationId);

    // Find the variant
    const variant = group.items.find((i: any) => i.id === variantId);
    if (!variant) {
      throw new NotFoundException('Variant not found in this item group');
    }

    // Remove from group (don't delete the item, just unlink)
    await this.prisma.item.update({
      where: { id: variantId },
      data: { itemGroupId: null },
    });
  }

  async bulkUpdateVariants(
    groupId: string,
    organizationId: string,
    updates: Array<{ variantId: string; costPrice?: number; sellingPrice?: number }>
  ) {
    await this.findById(groupId, organizationId);

    const results = await Promise.all(
      updates.map(async (update) => {
        return this.prisma.item.update({
          where: { id: update.variantId },
          data: {
            costPrice: update.costPrice,
            sellingPrice: update.sellingPrice,
          },
        });
      })
    );

    return { updated: results.length, items: results };
  }

  private generateCombinations(
    attributes: AttributeDto[]
  ): Record<string, string>[] {
    if (attributes.length === 0) return [{}];

    const [first, ...rest] = attributes;
    const restCombinations = this.generateCombinations(rest);

    const combinations: Record<string, string>[] = [];
    for (const value of first.values) {
      for (const restCombo of restCombinations) {
        combinations.push({ [first.name]: value, ...restCombo });
      }
    }

    return combinations;
  }

  private generateVariantSku(
    baseSku: string,
    attributes: Record<string, string>
  ): string {
    const suffix = Object.values(attributes)
      .map((v) => v.toUpperCase().replace(/\s+/g, '').substring(0, 5))
      .join('-');
    return `${baseSku}-${suffix}`;
  }

  private generateVariantName(
    baseName: string,
    attributes: Record<string, string>
  ): string {
    const suffix = Object.entries(attributes)
      .map(([key, value]) => `${value}`)
      .join(' / ');
    return `${baseName} (${suffix})`;
  }
}
