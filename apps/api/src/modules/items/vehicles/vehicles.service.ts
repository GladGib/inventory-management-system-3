import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMakeDto, UpdateMakeDto } from './dto/create-make.dto';
import { CreateModelDto, UpdateModelDto } from './dto/create-model.dto';
import { CreateCompatibilityDto } from './dto/create-compatibility.dto';
import { VehicleSearchQueryDto } from './dto/vehicle-search-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // VEHICLE MAKES
  // ==========================================

  async findAllMakes(organizationId: string) {
    const makes = await this.prisma.vehicleMake.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { models: true, compatibilities: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return makes.map((make) => ({
      ...make,
      modelCount: make._count.models,
      compatibilityCount: make._count.compatibilities,
      _count: undefined,
    }));
  }

  async createMake(organizationId: string, dto: CreateMakeDto) {
    // Check for duplicate name within organization
    const existing = await this.prisma.vehicleMake.findFirst({
      where: { organizationId, name: { equals: dto.name, mode: 'insensitive' } },
    });

    if (existing) {
      throw new ConflictException('Vehicle make with this name already exists');
    }

    return this.prisma.vehicleMake.create({
      data: {
        name: dto.name,
        country: dto.country,
        organizationId,
      },
    });
  }

  async updateMake(id: string, organizationId: string, dto: UpdateMakeDto) {
    const make = await this.prisma.vehicleMake.findFirst({
      where: { id, organizationId },
    });

    if (!make) {
      throw new NotFoundException('Vehicle make not found');
    }

    // Check for duplicate name if name is being changed
    if (dto.name && dto.name !== make.name) {
      const existing = await this.prisma.vehicleMake.findFirst({
        where: {
          organizationId,
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException('Vehicle make with this name already exists');
      }
    }

    return this.prisma.vehicleMake.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.country !== undefined && { country: dto.country }),
      },
    });
  }

  async deleteMake(id: string, organizationId: string) {
    const make = await this.prisma.vehicleMake.findFirst({
      where: { id, organizationId },
    });

    if (!make) {
      throw new NotFoundException('Vehicle make not found');
    }

    // Cascade delete will remove models and their compatibilities
    await this.prisma.vehicleMake.delete({ where: { id } });
  }

  // ==========================================
  // VEHICLE MODELS
  // ==========================================

  async findModelsByMake(makeId: string, organizationId: string) {
    // Verify make exists and belongs to organization
    const make = await this.prisma.vehicleMake.findFirst({
      where: { id: makeId, organizationId },
    });

    if (!make) {
      throw new NotFoundException('Vehicle make not found');
    }

    const models = await this.prisma.vehicleModel.findMany({
      where: { makeId, organizationId },
      include: {
        _count: {
          select: { compatibilities: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return models.map((model) => ({
      ...model,
      compatibilityCount: model._count.compatibilities,
      _count: undefined,
    }));
  }

  async createModel(makeId: string, organizationId: string, dto: CreateModelDto) {
    // Verify make exists and belongs to organization
    const make = await this.prisma.vehicleMake.findFirst({
      where: { id: makeId, organizationId },
    });

    if (!make) {
      throw new NotFoundException('Vehicle make not found');
    }

    // Check for duplicate model name within make
    const existing = await this.prisma.vehicleModel.findFirst({
      where: {
        makeId,
        name: { equals: dto.name, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException('Vehicle model with this name already exists for this make');
    }

    return this.prisma.vehicleModel.create({
      data: {
        name: dto.name,
        makeId,
        organizationId,
      },
    });
  }

  async updateModel(id: string, organizationId: string, dto: UpdateModelDto) {
    const model = await this.prisma.vehicleModel.findFirst({
      where: { id, organizationId },
    });

    if (!model) {
      throw new NotFoundException('Vehicle model not found');
    }

    // Check for duplicate name if name is being changed
    if (dto.name && dto.name !== model.name) {
      const existing = await this.prisma.vehicleModel.findFirst({
        where: {
          makeId: model.makeId,
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException('Vehicle model with this name already exists for this make');
      }
    }

    return this.prisma.vehicleModel.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
      },
    });
  }

  async deleteModel(id: string, organizationId: string) {
    const model = await this.prisma.vehicleModel.findFirst({
      where: { id, organizationId },
    });

    if (!model) {
      throw new NotFoundException('Vehicle model not found');
    }

    await this.prisma.vehicleModel.delete({ where: { id } });
  }

  // ==========================================
  // ITEM VEHICLE COMPATIBILITY
  // ==========================================

  async findItemCompatibilities(itemId: string, organizationId: string) {
    // Verify item exists
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, organizationId },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    return this.prisma.itemVehicleCompatibility.findMany({
      where: { itemId, organizationId },
      include: {
        vehicleMake: true,
        vehicleModel: true,
      },
      orderBy: [
        { vehicleMake: { name: 'asc' } },
        { vehicleModel: { name: 'asc' } },
        { yearFrom: 'asc' },
      ],
    });
  }

  async addCompatibility(
    itemId: string,
    organizationId: string,
    dto: CreateCompatibilityDto,
  ) {
    // Verify item exists
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, organizationId },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    // Verify make exists
    const make = await this.prisma.vehicleMake.findFirst({
      where: { id: dto.vehicleMakeId, organizationId },
    });

    if (!make) {
      throw new BadRequestException('Vehicle make not found');
    }

    // Verify model if provided
    if (dto.vehicleModelId) {
      const model = await this.prisma.vehicleModel.findFirst({
        where: { id: dto.vehicleModelId, makeId: dto.vehicleMakeId },
      });

      if (!model) {
        throw new BadRequestException('Vehicle model not found or does not belong to the specified make');
      }
    }

    // Validate year range
    if (dto.yearFrom && dto.yearTo && dto.yearFrom > dto.yearTo) {
      throw new BadRequestException('Year from cannot be greater than year to');
    }

    return this.prisma.itemVehicleCompatibility.create({
      data: {
        itemId,
        vehicleMakeId: dto.vehicleMakeId,
        vehicleModelId: dto.vehicleModelId,
        yearFrom: dto.yearFrom,
        yearTo: dto.yearTo,
        notes: dto.notes,
        organizationId,
      },
      include: {
        vehicleMake: true,
        vehicleModel: true,
      },
    });
  }

  async removeCompatibility(id: string, organizationId: string) {
    const compatibility = await this.prisma.itemVehicleCompatibility.findFirst({
      where: { id, organizationId },
    });

    if (!compatibility) {
      throw new NotFoundException('Vehicle compatibility record not found');
    }

    await this.prisma.itemVehicleCompatibility.delete({ where: { id } });
  }

  // ==========================================
  // VEHICLE SEARCH
  // ==========================================

  async searchItemsByVehicle(
    organizationId: string,
    query: VehicleSearchQueryDto,
  ) {
    const { makeId, modelId, year, page = 1, limit = 25 } = query;

    if (!makeId) {
      throw new BadRequestException('makeId is required for vehicle search');
    }

    const compatibilityWhere: Prisma.ItemVehicleCompatibilityWhereInput = {
      organizationId,
      vehicleMakeId: makeId,
      ...(modelId && { vehicleModelId: modelId }),
    };

    // Add year filtering
    if (year) {
      compatibilityWhere.AND = [
        {
          OR: [
            { yearFrom: null },
            { yearFrom: { lte: year } },
          ],
        },
        {
          OR: [
            { yearTo: null },
            { yearTo: { gte: year } },
          ],
        },
      ];
    }

    // Find matching item IDs from compatibilities
    const compatibilities = await this.prisma.itemVehicleCompatibility.findMany({
      where: compatibilityWhere,
      select: { itemId: true },
      distinct: ['itemId'],
    });

    const itemIds = compatibilities.map((c) => c.itemId);

    if (itemIds.length === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          page,
          limit,
          hasMore: false,
        },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.item.findMany({
        where: {
          id: { in: itemIds },
          organizationId,
          status: 'ACTIVE',
        },
        include: {
          category: { select: { id: true, name: true } },
          stockLevels: {
            select: {
              stockOnHand: true,
              committedStock: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.item.count({
        where: {
          id: { in: itemIds },
          organizationId,
          status: 'ACTIVE',
        },
      }),
    ]);

    const itemsWithStock = items.map((item) => {
      const totalStockOnHand = item.stockLevels.reduce(
        (sum, sl) => sum + Number(sl.stockOnHand),
        0,
      );
      const totalCommittedStock = item.stockLevels.reduce(
        (sum, sl) => sum + Number(sl.committedStock),
        0,
      );

      return {
        ...item,
        stockOnHand: totalStockOnHand,
        committedStock: totalCommittedStock,
        availableStock: totalStockOnHand - totalCommittedStock,
        stockLevels: undefined,
      };
    });

    return {
      data: itemsWithStock,
      meta: {
        total,
        page,
        limit,
        hasMore: page * limit < total,
      },
    };
  }
}
