import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    const warehouses = await this.prisma.warehouse.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { stockLevels: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    // Calculate total stock value for each warehouse
    const warehousesWithStats = await Promise.all(
      warehouses.map(async (wh) => {
        const stockStats = await this.prisma.stockLevel.aggregate({
          where: { warehouseId: wh.id },
          _sum: { stockOnHand: true },
        });

        // Calculate stock value
        const stockLevels = await this.prisma.stockLevel.findMany({
          where: { warehouseId: wh.id, stockOnHand: { gt: 0 } },
          include: { item: { select: { costPrice: true } } },
        });

        const totalStockValue = stockLevels.reduce(
          (sum, sl) => sum + Number(sl.stockOnHand) * Number(sl.item.costPrice),
          0
        );

        return {
          ...wh,
          totalItems: wh._count.stockLevels,
          totalStockOnHand: Number(stockStats._sum.stockOnHand || 0),
          totalStockValue,
          _count: undefined,
        };
      })
    );

    return warehousesWithStats;
  }

  async findById(id: string, organizationId: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: { stockLevels: true },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return {
      ...warehouse,
      totalItems: warehouse._count.stockLevels,
      _count: undefined,
    };
  }

  async create(organizationId: string, createDto: CreateWarehouseDto) {
    // Check for duplicate code
    const existing = await this.prisma.warehouse.findFirst({
      where: { organizationId, code: createDto.code },
    });

    if (existing) {
      throw new ConflictException('Warehouse code already exists');
    }

    // If setting as default, unset existing default
    if (createDto.isDefault) {
      await this.prisma.warehouse.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const { address, ...rest } = createDto;
    return this.prisma.warehouse.create({
      data: {
        ...rest,
        address: address ? JSON.parse(JSON.stringify(address)) : undefined,
        organizationId,
      },
    });
  }

  async update(id: string, organizationId: string, updateDto: UpdateWarehouseDto) {
    const warehouse = await this.findById(id, organizationId);

    // Check for code conflict
    if (updateDto.code && updateDto.code !== warehouse.code) {
      const existing = await this.prisma.warehouse.findFirst({
        where: { organizationId, code: updateDto.code, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('Warehouse code already exists');
      }
    }

    // If setting as default, unset existing default
    if (updateDto.isDefault) {
      await this.prisma.warehouse.updateMany({
        where: { organizationId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    const { address, ...restUpdate } = updateDto;
    return this.prisma.warehouse.update({
      where: { id },
      data: {
        ...restUpdate,
        address: address ? JSON.parse(JSON.stringify(address)) : undefined,
      },
    });
  }

  async setDefault(id: string, organizationId: string) {
    await this.findById(id, organizationId);

    // Unset existing default
    await this.prisma.warehouse.updateMany({
      where: { organizationId, isDefault: true },
      data: { isDefault: false },
    });

    // Set new default
    return this.prisma.warehouse.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  async delete(id: string, organizationId: string) {
    const warehouse = await this.findById(id, organizationId);

    // Check if warehouse is default
    if (warehouse.isDefault) {
      throw new BadRequestException('Cannot delete default warehouse');
    }

    // Check if warehouse has stock
    const stockCount = await this.prisma.stockLevel.count({
      where: { warehouseId: id, stockOnHand: { gt: 0 } },
    });

    if (stockCount > 0) {
      throw new BadRequestException('Cannot delete warehouse with stock');
    }

    // Delete related stock levels (all zero)
    await this.prisma.stockLevel.deleteMany({
      where: { warehouseId: id },
    });

    await this.prisma.warehouse.delete({
      where: { id },
    });
  }
}
