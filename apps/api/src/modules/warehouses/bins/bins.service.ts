import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateZoneDto, UpdateZoneDto } from './dto/create-zone.dto';
import { CreateBinDto, UpdateBinDto } from './dto/create-bin.dto';
import { BinStockActionDto } from './dto/bin-stock-action.dto';
import { BinQueryDto } from './dto/bin-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BinsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============ Zones ============

  async findAllZones(warehouseId: string, organizationId: string) {
    // Verify warehouse belongs to org
    await this.verifyWarehouse(warehouseId, organizationId);

    return this.prisma.warehouseZone.findMany({
      where: { warehouseId, organizationId },
      include: {
        _count: {
          select: { bins: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createZone(
    warehouseId: string,
    organizationId: string,
    dto: CreateZoneDto,
  ) {
    await this.verifyWarehouse(warehouseId, organizationId);

    // Check for duplicate zone name in warehouse
    const existing = await this.prisma.warehouseZone.findFirst({
      where: { warehouseId, name: dto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Zone "${dto.name}" already exists in this warehouse`,
      );
    }

    return this.prisma.warehouseZone.create({
      data: {
        warehouseId,
        organizationId,
        name: dto.name,
        description: dto.description,
      },
      include: {
        _count: {
          select: { bins: true },
        },
      },
    });
  }

  async updateZone(
    zoneId: string,
    organizationId: string,
    dto: UpdateZoneDto,
  ) {
    const zone = await this.prisma.warehouseZone.findFirst({
      where: { id: zoneId, organizationId },
    });

    if (!zone) {
      throw new NotFoundException('Zone not found');
    }

    // Check for name conflict
    if (dto.name && dto.name !== zone.name) {
      const existing = await this.prisma.warehouseZone.findFirst({
        where: {
          warehouseId: zone.warehouseId,
          name: dto.name,
          NOT: { id: zoneId },
        },
      });
      if (existing) {
        throw new ConflictException(
          `Zone "${dto.name}" already exists in this warehouse`,
        );
      }
    }

    return this.prisma.warehouseZone.update({
      where: { id: zoneId },
      data: {
        name: dto.name,
        description: dto.description,
      },
      include: {
        _count: {
          select: { bins: true },
        },
      },
    });
  }

  async deleteZone(zoneId: string, organizationId: string) {
    const zone = await this.prisma.warehouseZone.findFirst({
      where: { id: zoneId, organizationId },
      include: {
        _count: { select: { bins: true } },
      },
    });

    if (!zone) {
      throw new NotFoundException('Zone not found');
    }

    if (zone._count.bins > 0) {
      throw new BadRequestException(
        'Cannot delete zone that contains bins. Remove or reassign bins first.',
      );
    }

    await this.prisma.warehouseZone.delete({
      where: { id: zoneId },
    });
  }

  // ============ Bins ============

  async findAllBins(
    warehouseId: string,
    organizationId: string,
    query: BinQueryDto,
  ) {
    await this.verifyWarehouse(warehouseId, organizationId);

    const where: Prisma.BinWhereInput = {
      warehouseId,
      organizationId,
    };

    if (query.warehouseZoneId) {
      where.warehouseZoneId = query.warehouseZoneId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const bins = await this.prisma.bin.findMany({
      where,
      include: {
        warehouseZone: {
          select: { id: true, name: true },
        },
        _count: {
          select: { binStocks: true },
        },
        binStocks: {
          select: {
            quantity: true,
          },
        },
      },
      orderBy: [{ code: 'asc' }],
    });

    // Compute total quantity in each bin
    return bins.map((bin) => {
      const totalQuantity = bin.binStocks.reduce(
        (sum, bs) => sum + Number(bs.quantity),
        0,
      );
      return {
        ...bin,
        totalQuantity,
        itemCount: bin._count.binStocks,
        binStocks: undefined,
        _count: undefined,
      };
    });
  }

  async createBin(
    warehouseId: string,
    organizationId: string,
    dto: CreateBinDto,
  ) {
    await this.verifyWarehouse(warehouseId, organizationId);

    // Check for duplicate code in warehouse
    const existing = await this.prisma.bin.findFirst({
      where: { warehouseId, code: dto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Bin code "${dto.code}" already exists in this warehouse`,
      );
    }

    // Verify zone belongs to warehouse if provided
    if (dto.warehouseZoneId) {
      const zone = await this.prisma.warehouseZone.findFirst({
        where: { id: dto.warehouseZoneId, warehouseId },
      });
      if (!zone) {
        throw new BadRequestException(
          'Zone does not belong to this warehouse',
        );
      }
    }

    return this.prisma.bin.create({
      data: {
        warehouseId,
        organizationId,
        code: dto.code,
        name: dto.name,
        type: dto.type || 'STORAGE',
        maxCapacity: dto.maxCapacity,
        warehouseZoneId: dto.warehouseZoneId,
        isActive: dto.isActive ?? true,
      },
      include: {
        warehouseZone: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async updateBin(
    binId: string,
    organizationId: string,
    dto: UpdateBinDto,
  ) {
    const bin = await this.prisma.bin.findFirst({
      where: { id: binId, organizationId },
    });

    if (!bin) {
      throw new NotFoundException('Bin not found');
    }

    // Check for code conflict
    if (dto.code && dto.code !== bin.code) {
      const existing = await this.prisma.bin.findFirst({
        where: {
          warehouseId: bin.warehouseId,
          code: dto.code,
          NOT: { id: binId },
        },
      });
      if (existing) {
        throw new ConflictException(
          `Bin code "${dto.code}" already exists in this warehouse`,
        );
      }
    }

    // Verify zone if being changed
    if (dto.warehouseZoneId) {
      const zone = await this.prisma.warehouseZone.findFirst({
        where: { id: dto.warehouseZoneId, warehouseId: bin.warehouseId },
      });
      if (!zone) {
        throw new BadRequestException(
          'Zone does not belong to this warehouse',
        );
      }
    }

    return this.prisma.bin.update({
      where: { id: binId },
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type,
        maxCapacity: dto.maxCapacity,
        warehouseZoneId: dto.warehouseZoneId,
        isActive: dto.isActive,
      },
      include: {
        warehouseZone: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async deleteBin(binId: string, organizationId: string) {
    const bin = await this.prisma.bin.findFirst({
      where: { id: binId, organizationId },
      include: {
        binStocks: {
          where: { quantity: { gt: 0 } },
        },
      },
    });

    if (!bin) {
      throw new NotFoundException('Bin not found');
    }

    if (bin.binStocks.length > 0) {
      throw new BadRequestException(
        'Cannot delete bin that contains stock. Empty the bin first.',
      );
    }

    // Delete any zero-quantity bin stocks first
    await this.prisma.binStock.deleteMany({
      where: { binId },
    });

    await this.prisma.bin.delete({
      where: { id: binId },
    });
  }

  // ============ Bin Stock ============

  async getBinStock(binId: string, organizationId: string) {
    const bin = await this.prisma.bin.findFirst({
      where: { id: binId, organizationId },
    });

    if (!bin) {
      throw new NotFoundException('Bin not found');
    }

    const binStocks = await this.prisma.binStock.findMany({
      where: { binId },
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            name: true,
            unit: true,
            costPrice: true,
          },
        },
      },
      orderBy: { item: { name: 'asc' } },
    });

    return {
      bin: {
        id: bin.id,
        code: bin.code,
        name: bin.name,
        type: bin.type,
        maxCapacity: bin.maxCapacity ? Number(bin.maxCapacity) : null,
        isActive: bin.isActive,
        warehouseId: bin.warehouseId,
        warehouseZoneId: bin.warehouseZoneId,
      },
      stocks: binStocks.map((bs) => ({
        id: bs.id,
        itemId: bs.itemId,
        item: {
          ...bs.item,
          costPrice: Number(bs.item.costPrice),
        },
        quantity: Number(bs.quantity),
        batchId: bs.batchId,
        updatedAt: bs.updatedAt,
      })),
      totalQuantity: binStocks.reduce(
        (sum, bs) => sum + Number(bs.quantity),
        0,
      ),
      totalItems: binStocks.filter((bs) => Number(bs.quantity) > 0).length,
    };
  }

  async putAway(organizationId: string, dto: BinStockActionDto) {
    // Verify bin belongs to org
    const bin = await this.prisma.bin.findFirst({
      where: { id: dto.binId, organizationId },
    });

    if (!bin) {
      throw new NotFoundException('Bin not found');
    }

    if (!bin.isActive) {
      throw new BadRequestException('Cannot put away into an inactive bin');
    }

    // Verify item belongs to org
    const item = await this.prisma.item.findFirst({
      where: { id: dto.itemId, organizationId },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    // Check capacity if set
    if (bin.maxCapacity) {
      const currentTotal = await this.prisma.binStock.aggregate({
        where: { binId: dto.binId },
        _sum: { quantity: true },
      });
      const currentQty = Number(currentTotal._sum.quantity || 0);
      if (currentQty + dto.quantity > Number(bin.maxCapacity)) {
        throw new BadRequestException(
          `Bin capacity exceeded. Current: ${currentQty}, Adding: ${dto.quantity}, Max: ${Number(bin.maxCapacity)}`,
        );
      }
    }

    // Upsert bin stock
    const existing = await this.prisma.binStock.findFirst({
      where: {
        binId: dto.binId,
        itemId: dto.itemId,
        batchId: dto.batchId ?? null,
      },
    });

    if (existing) {
      return this.prisma.binStock.update({
        where: { id: existing.id },
        data: {
          quantity: { increment: dto.quantity },
        },
        include: {
          item: {
            select: { id: true, sku: true, name: true, unit: true },
          },
          bin: {
            select: { id: true, code: true, name: true },
          },
        },
      });
    }

    return this.prisma.binStock.create({
      data: {
        binId: dto.binId,
        itemId: dto.itemId,
        quantity: dto.quantity,
        batchId: dto.batchId,
        organizationId,
      },
      include: {
        item: {
          select: { id: true, sku: true, name: true, unit: true },
        },
        bin: {
          select: { id: true, code: true, name: true },
        },
      },
    });
  }

  async pick(organizationId: string, dto: BinStockActionDto) {
    // Verify bin belongs to org
    const bin = await this.prisma.bin.findFirst({
      where: { id: dto.binId, organizationId },
    });

    if (!bin) {
      throw new NotFoundException('Bin not found');
    }

    // Find bin stock
    const binStock = await this.prisma.binStock.findFirst({
      where: {
        binId: dto.binId,
        itemId: dto.itemId,
        batchId: dto.batchId ?? null,
      },
    });

    if (!binStock) {
      throw new NotFoundException('Item not found in this bin');
    }

    const currentQty = Number(binStock.quantity);
    if (dto.quantity > currentQty) {
      throw new BadRequestException(
        `Insufficient stock in bin. Available: ${currentQty}, Requested: ${dto.quantity}`,
      );
    }

    const newQty = currentQty - dto.quantity;

    if (newQty === 0) {
      // Remove the record if quantity reaches zero
      await this.prisma.binStock.delete({
        where: { id: binStock.id },
      });

      return {
        id: binStock.id,
        binId: dto.binId,
        itemId: dto.itemId,
        quantity: 0,
        batchId: dto.batchId ?? null,
        message: 'Item fully picked from bin',
      };
    }

    return this.prisma.binStock.update({
      where: { id: binStock.id },
      data: {
        quantity: { decrement: dto.quantity },
      },
      include: {
        item: {
          select: { id: true, sku: true, name: true, unit: true },
        },
        bin: {
          select: { id: true, code: true, name: true },
        },
      },
    });
  }

  // ============ Helpers ============

  private async verifyWarehouse(
    warehouseId: string,
    organizationId: string,
  ) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, organizationId },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return warehouse;
  }
}
