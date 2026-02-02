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
import { Prisma } from '@prisma/client';

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
}
