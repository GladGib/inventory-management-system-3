import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemQueryDto } from './dto/item-query.dto';
import { CreateCrossReferenceDto } from './dto/create-cross-reference.dto';
import { UpdateCrossReferenceDto } from './dto/update-cross-reference.dto';
import { CreateSupersessionDto } from './dto/supersession.dto';
import { Prisma } from '@prisma/client';
import bwipjs from 'bwip-js';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: ItemQueryDto) {
    const { search, type, status, categoryId, brand, page, limit, sortBy, sortOrder } = query;

    const where: Prisma.ItemWhereInput = {
      organizationId,
      ...(type && { type }),
      ...(status && { status }),
      ...(categoryId && { categoryId }),
      ...(brand && { brand }),
      ...(search && {
        OR: [
          { sku: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { partNumber: { contains: search, mode: 'insensitive' } },
          { crossReferences: { has: search } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          taxRate: { select: { id: true, name: true, rate: true } },
          stockLevels: {
            select: {
              warehouseId: true,
              stockOnHand: true,
              committedStock: true,
            },
          },
        },
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
        skip: ((page || 1) - 1) * (limit || 25),
        take: limit || 25,
      }),
      this.prisma.item.count({ where }),
    ]);

    // Calculate total stock and available stock
    const itemsWithStock = items.map((item) => {
      const totalStockOnHand = item.stockLevels.reduce(
        (sum, sl) => sum + Number(sl.stockOnHand),
        0
      );
      const totalCommittedStock = item.stockLevels.reduce(
        (sum, sl) => sum + Number(sl.committedStock),
        0
      );

      return {
        ...item,
        stockOnHand: totalStockOnHand,
        committedStock: totalCommittedStock,
        availableStock: totalStockOnHand - totalCommittedStock,
        isLowStock: item.reorderLevel ? totalStockOnHand <= Number(item.reorderLevel) : false,
        stockLevels: undefined, // Remove detailed stock levels from list view
      };
    });

    return {
      data: itemsWithStock,
      meta: {
        total,
        page: page || 1,
        limit: limit || 25,
        hasMore: ((page || 1) * (limit || 25)) < total,
      },
    };
  }

  async findById(id: string, organizationId: string) {
    const item = await this.prisma.item.findFirst({
      where: { id, organizationId },
      include: {
        category: true,
        taxRate: true,
        itemGroup: true,
        stockLevels: {
          include: {
            warehouse: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    // Calculate totals
    type StockLevelItem = { stockOnHand: unknown; committedStock: unknown };
    const totalStockOnHand = item.stockLevels.reduce(
      (sum: number, sl: StockLevelItem) => sum + Number(sl.stockOnHand),
      0
    );
    const totalCommittedStock = item.stockLevels.reduce(
      (sum: number, sl: StockLevelItem) => sum + Number(sl.committedStock),
      0
    );

    return {
      ...item,
      stockOnHand: totalStockOnHand,
      committedStock: totalCommittedStock,
      availableStock: totalStockOnHand - totalCommittedStock,
      stockValue: totalStockOnHand * Number(item.costPrice),
      isLowStock: item.reorderLevel ? totalStockOnHand <= Number(item.reorderLevel) : false,
    };
  }

  async create(organizationId: string, userId: string, createDto: CreateItemDto) {
    // Check for duplicate SKU
    const existing = await this.prisma.item.findFirst({
      where: { organizationId, sku: createDto.sku },
    });

    if (existing) {
      throw new ConflictException('SKU already exists');
    }

    // Validate category if provided
    if (createDto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: createDto.categoryId, organizationId },
      });
      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }

    // Validate tax rate if provided
    if (createDto.taxRateId) {
      const taxRate = await this.prisma.taxRate.findFirst({
        where: { id: createDto.taxRateId, organizationId },
      });
      if (!taxRate) {
        throw new BadRequestException('Tax rate not found');
      }
    }

    const { openingStock, openingStockWarehouseId, ...itemData } = createDto;

    // Create item and opening stock in transaction
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          ...itemData,
          organizationId,
        },
        include: {
          category: true,
          taxRate: true,
        },
      });

      // Create opening stock if provided
      if (openingStock && openingStock > 0) {
        let warehouseId = openingStockWarehouseId;

        // Use default warehouse if not specified
        if (!warehouseId) {
          const defaultWarehouse = await tx.warehouse.findFirst({
            where: { organizationId, isDefault: true },
          });
          if (!defaultWarehouse) {
            throw new BadRequestException('No default warehouse found. Please specify warehouse for opening stock.');
          }
          warehouseId = defaultWarehouse.id;
        }

        // Create stock level
        await tx.stockLevel.create({
          data: {
            itemId: item.id,
            warehouseId,
            stockOnHand: openingStock,
            committedStock: 0,
            incomingStock: 0,
          },
        });

        // Generate adjustment number
        const lastAdj = await tx.stockAdjustment.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { adjustmentNumber: true },
        });
        const nextNum = lastAdj
          ? parseInt(lastAdj.adjustmentNumber.split('-')[1]) + 1
          : 1;
        const adjustmentNumber = `ADJ-${String(nextNum).padStart(6, '0')}`;

        // Create adjustment record
        await tx.stockAdjustment.create({
          data: {
            adjustmentNumber,
            organizationId,
            warehouseId,
            type: 'INCREASE',
            reason: 'Opening stock for new item',
            date: new Date(),
            status: 'COMPLETED',
            notes: 'Initial opening stock',
            items: {
              create: {
                itemId: item.id,
                quantityAdjusted: openingStock,
                reason: 'Opening stock',
              },
            },
          },
        });
      }

      return item;
    });
  }

  async update(id: string, organizationId: string, updateDto: UpdateItemDto) {
    const item = await this.findById(id, organizationId);

    // Check for SKU conflict if SKU is being changed
    if (updateDto.sku && updateDto.sku !== item.sku) {
      const existing = await this.prisma.item.findFirst({
        where: { organizationId, sku: updateDto.sku, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('SKU already exists');
      }
    }

    // Validate category if provided
    if (updateDto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: updateDto.categoryId, organizationId },
      });
      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }

    return this.prisma.item.update({
      where: { id },
      data: updateDto,
      include: {
        category: true,
        taxRate: true,
      },
    });
  }

  async delete(id: string, organizationId: string) {
    const item = await this.findById(id, organizationId);

    // Check if item has stock
    if (item.stockOnHand > 0) {
      throw new BadRequestException('Cannot delete item with stock');
    }

    // Soft delete by setting status to INACTIVE
    await this.prisma.item.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  async getLowStockItems(organizationId: string) {
    const items = await this.prisma.item.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        type: 'INVENTORY',
        reorderLevel: { gt: 0 },
      },
      include: {
        category: { select: { id: true, name: true } },
        stockLevels: {
          select: {
            stockOnHand: true,
          },
        },
      },
    });

    return items
      .map((item) => {
        const totalStock = item.stockLevels.reduce(
          (sum, sl) => sum + Number(sl.stockOnHand),
          0
        );
        return {
          ...item,
          stockOnHand: totalStock,
          stockLevels: undefined,
        };
      })
      .filter((item) => item.stockOnHand <= Number(item.reorderLevel));
  }

  // ============ Cross-Reference Methods ============

  async getCrossReferences(itemId: string, organizationId: string) {
    // Verify item belongs to organization
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, organizationId },
    });
    if (!item) {
      throw new NotFoundException('Item not found');
    }

    return this.prisma.crossReference.findMany({
      where: { itemId, organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addCrossReference(
    itemId: string,
    dto: CreateCrossReferenceDto,
    organizationId: string,
  ) {
    // Verify item belongs to organization
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, organizationId },
    });
    if (!item) {
      throw new NotFoundException('Item not found');
    }

    return this.prisma.crossReference.create({
      data: {
        itemId,
        organizationId,
        oemNumber: dto.oemNumber,
        aftermarketNumber: dto.aftermarketNumber,
        brand: dto.brand,
        notes: dto.notes,
      },
    });
  }

  async updateCrossReference(
    crossRefId: string,
    dto: UpdateCrossReferenceDto,
    organizationId: string,
  ) {
    const crossRef = await this.prisma.crossReference.findFirst({
      where: { id: crossRefId, organizationId },
    });
    if (!crossRef) {
      throw new NotFoundException('Cross reference not found');
    }

    return this.prisma.crossReference.update({
      where: { id: crossRefId },
      data: {
        ...(dto.oemNumber !== undefined && { oemNumber: dto.oemNumber }),
        ...(dto.aftermarketNumber !== undefined && { aftermarketNumber: dto.aftermarketNumber }),
        ...(dto.brand !== undefined && { brand: dto.brand }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async deleteCrossReference(crossRefId: string, organizationId: string) {
    const crossRef = await this.prisma.crossReference.findFirst({
      where: { id: crossRefId, organizationId },
    });
    if (!crossRef) {
      throw new NotFoundException('Cross reference not found');
    }

    await this.prisma.crossReference.delete({
      where: { id: crossRefId },
    });
  }

  // ============ Part Number Search ============

  async searchByPartNumber(query: string, organizationId: string) {
    if (!query || query.trim().length === 0) {
      return { data: [], meta: { total: 0, matchType: null } };
    }

    const searchTerm = query.trim();

    // Search across item.partNumber, item.crossReferences array,
    // CrossReference.oemNumber, CrossReference.aftermarketNumber
    // Use raw query for ILIKE across multiple sources

    // 1. Find items matching partNumber or crossReferences array
    const directMatches = await this.prisma.item.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        OR: [
          { partNumber: { contains: searchTerm, mode: 'insensitive' } },
          { crossReferences: { has: searchTerm } },
        ],
      },
      include: {
        category: { select: { id: true, name: true } },
        stockLevels: {
          select: {
            stockOnHand: true,
            committedStock: true,
          },
        },
        crossReferenceRecords: true,
      },
    });

    // 2. Find items via CrossReference model matches
    const crossRefMatches = await this.prisma.crossReference.findMany({
      where: {
        organizationId,
        OR: [
          { oemNumber: { contains: searchTerm, mode: 'insensitive' } },
          { aftermarketNumber: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      include: {
        item: {
          include: {
            category: { select: { id: true, name: true } },
            stockLevels: {
              select: {
                stockOnHand: true,
                committedStock: true,
              },
            },
            crossReferenceRecords: true,
          },
        },
      },
    });

    // Merge and deduplicate results
    const itemMap = new Map<string, { item: any; matchedOn: string[] }>();

    for (const item of directMatches) {
      const matchedOn: string[] = [];
      if (item.partNumber && item.partNumber.toLowerCase().includes(searchTerm.toLowerCase())) {
        matchedOn.push(`Part Number: ${item.partNumber}`);
      }
      if (item.crossReferences.includes(searchTerm)) {
        matchedOn.push(`Cross Reference: ${searchTerm}`);
      }
      itemMap.set(item.id, { item, matchedOn });
    }

    for (const crossRef of crossRefMatches) {
      const matchedOn: string[] = [];
      if (crossRef.oemNumber.toLowerCase().includes(searchTerm.toLowerCase())) {
        matchedOn.push(`OEM Number: ${crossRef.oemNumber}${crossRef.brand ? ` (${crossRef.brand})` : ''}`);
      }
      if (crossRef.aftermarketNumber && crossRef.aftermarketNumber.toLowerCase().includes(searchTerm.toLowerCase())) {
        matchedOn.push(`Aftermarket Number: ${crossRef.aftermarketNumber}${crossRef.brand ? ` (${crossRef.brand})` : ''}`);
      }

      if (itemMap.has(crossRef.item.id)) {
        const existing = itemMap.get(crossRef.item.id)!;
        existing.matchedOn.push(...matchedOn);
      } else {
        itemMap.set(crossRef.item.id, { item: crossRef.item, matchedOn });
      }
    }

    // Format results with stock calculations
    const results = Array.from(itemMap.values()).map(({ item, matchedOn }) => {
      const totalStockOnHand = item.stockLevels.reduce(
        (sum: number, sl: { stockOnHand: unknown }) => sum + Number(sl.stockOnHand),
        0,
      );
      const totalCommittedStock = item.stockLevels.reduce(
        (sum: number, sl: { committedStock: unknown }) => sum + Number(sl.committedStock),
        0,
      );

      return {
        ...item,
        stockOnHand: totalStockOnHand,
        committedStock: totalCommittedStock,
        availableStock: totalStockOnHand - totalCommittedStock,
        isLowStock: item.reorderLevel ? totalStockOnHand <= Number(item.reorderLevel) : false,
        matchedOn,
        stockLevels: undefined,
      };
    });

    return {
      data: results,
      meta: { total: results.length },
    };
  }

  // ============ Barcode Generation ============

  async generateBarcode(
    id: string,
    organizationId: string,
    options: { format?: string; width?: number; height?: number } = {},
  ): Promise<string> {
    const item = await this.prisma.item.findFirst({
      where: { id, organizationId },
      select: { sku: true },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    const format = options.format || 'code128';
    const width = options.width || 200;
    const height = options.height || 80;

    try {
      const svg = bwipjs.toSVG({
        bcid: format,
        text: item.sku,
        scale: 2,
        width: Math.round(width / 2),
        height: Math.round(height / 2),
        includetext: true,
        textxalign: 'center',
      });

      return svg;
    } catch (error) {
      throw new BadRequestException(
        `Failed to generate barcode: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async generateBatchBarcodes(
    itemIds: string[],
    organizationId: string,
    options: { format?: string; labelTemplate?: string } = {},
  ): Promise<Array<{ itemId: string; sku: string; name: string; sellingPrice: number; svg: string }>> {
    const items = await this.prisma.item.findMany({
      where: {
        id: { in: itemIds },
        organizationId,
      },
      select: { id: true, sku: true, name: true, sellingPrice: true },
    });

    if (items.length === 0) {
      throw new NotFoundException('No items found');
    }

    const format = options.format || 'code128';

    const results = await Promise.all(
      items.map(async (item) => {
        try {
          const svg = bwipjs.toSVG({
            bcid: format,
            text: item.sku,
            scale: 2,
            width: 100,
            height: 40,
            includetext: true,
            textxalign: 'center',
          });

          return {
            itemId: item.id,
            sku: item.sku,
            name: item.name,
            sellingPrice: Number(item.sellingPrice),
            svg,
          };
        } catch {
          return {
            itemId: item.id,
            sku: item.sku,
            name: item.name,
            sellingPrice: Number(item.sellingPrice),
            svg: '',
          };
        }
      }),
    );

    return results;
  }

  // ============ Supersession Tracking ============

  async supersedeItem(
    id: string,
    organizationId: string,
    dto: CreateSupersessionDto,
  ) {
    // Verify old item exists
    const oldItem = await this.prisma.item.findFirst({
      where: { id, organizationId },
    });
    if (!oldItem) {
      throw new NotFoundException('Item not found');
    }

    // Verify new item exists
    const newItem = await this.prisma.item.findFirst({
      where: { id: dto.newItemId, organizationId },
    });
    if (!newItem) {
      throw new NotFoundException('New item not found');
    }

    // Prevent self-supersession
    if (id === dto.newItemId) {
      throw new BadRequestException('An item cannot supersede itself');
    }

    // Check for existing supersession of this old item to the same new item
    const existing = await this.prisma.partSupersession.findFirst({
      where: {
        oldItemId: id,
        newItemId: dto.newItemId,
        organizationId,
      },
    });
    if (existing) {
      throw new ConflictException('This supersession already exists');
    }

    return this.prisma.partSupersession.create({
      data: {
        oldItemId: id,
        newItemId: dto.newItemId,
        reason: dto.reason,
        organizationId,
      },
      include: {
        oldItem: { select: { id: true, sku: true, name: true } },
        newItem: { select: { id: true, sku: true, name: true } },
      },
    });
  }

  async getSupersessionChain(id: string, organizationId: string) {
    // Verify item exists
    const item = await this.prisma.item.findFirst({
      where: { id, organizationId },
      select: { id: true, sku: true, name: true },
    });
    if (!item) {
      throw new NotFoundException('Item not found');
    }

    // Traverse backward to find the oldest item in the chain
    const chain: Array<{
      id: string;
      sku: string;
      name: string;
      effectiveDate?: string;
      reason?: string | null;
      isCurrent: boolean;
    }> = [];

    // Find all predecessors (items this was superseding)
    const predecessors: typeof chain = [];
    let currentId = id;
    const visitedBack = new Set<string>();

    while (true) {
      if (visitedBack.has(currentId)) break;
      visitedBack.add(currentId);

      const supersession = await this.prisma.partSupersession.findFirst({
        where: { newItemId: currentId, organizationId },
        include: {
          oldItem: { select: { id: true, sku: true, name: true } },
        },
        orderBy: { effectiveDate: 'desc' },
      });

      if (!supersession) break;

      predecessors.unshift({
        id: supersession.oldItem.id,
        sku: supersession.oldItem.sku,
        name: supersession.oldItem.name,
        effectiveDate: supersession.effectiveDate.toISOString(),
        reason: supersession.reason,
        isCurrent: false,
      });

      currentId = supersession.oldItem.id;
    }

    // Add predecessors
    chain.push(...predecessors);

    // Add current item
    chain.push({
      id: item.id,
      sku: item.sku,
      name: item.name,
      isCurrent: true,
    });

    // Find all successors (items that supersede this one)
    currentId = id;
    const visitedFwd = new Set<string>();

    while (true) {
      if (visitedFwd.has(currentId)) break;
      visitedFwd.add(currentId);

      const supersession = await this.prisma.partSupersession.findFirst({
        where: { oldItemId: currentId, organizationId },
        include: {
          newItem: { select: { id: true, sku: true, name: true } },
        },
        orderBy: { effectiveDate: 'desc' },
      });

      if (!supersession) break;

      chain.push({
        id: supersession.newItem.id,
        sku: supersession.newItem.sku,
        name: supersession.newItem.name,
        effectiveDate: supersession.effectiveDate.toISOString(),
        reason: supersession.reason,
        isCurrent: false,
      });

      currentId = supersession.newItem.id;
    }

    // Determine if this item is superseded (has a successor)
    const latestSupersession = await this.prisma.partSupersession.findFirst({
      where: { oldItemId: id, organizationId },
      include: {
        newItem: { select: { id: true, sku: true, name: true } },
      },
      orderBy: { effectiveDate: 'desc' },
    });

    return {
      chain,
      isSuperseded: !!latestSupersession,
      supersededBy: latestSupersession
        ? {
            id: latestSupersession.newItem.id,
            sku: latestSupersession.newItem.sku,
            name: latestSupersession.newItem.name,
          }
        : null,
    };
  }
}
