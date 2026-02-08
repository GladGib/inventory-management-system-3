import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateCompositeDto } from './dto/create-composite.dto';
import { UpdateBOMDto } from './dto/update-bom.dto';
import { CreateAssemblyDto, CreateDisassemblyDto } from './dto/create-assembly.dto';

@Injectable()
export class CompositeService {
  constructor(private readonly prisma: PrismaService) {}

  // ============ Composite Item / BOM ============

  async createCompositeItem(organizationId: string, dto: CreateCompositeDto) {
    // Validate the item exists and belongs to org
    const item = await this.prisma.item.findFirst({
      where: { id: dto.itemId, organizationId },
    });
    if (!item) {
      throw new NotFoundException('Item not found');
    }

    // Check if already composite
    const existing = await this.prisma.compositeItem.findUnique({
      where: { itemId: dto.itemId },
    });
    if (existing) {
      throw new BadRequestException('Item is already marked as composite');
    }

    // Validate all component items exist and are not the same as the composite item
    for (const comp of dto.components) {
      if (comp.componentItemId === dto.itemId) {
        throw new BadRequestException('A composite item cannot be a component of itself');
      }
      const componentItem = await this.prisma.item.findFirst({
        where: { id: comp.componentItemId, organizationId },
      });
      if (!componentItem) {
        throw new NotFoundException(`Component item ${comp.componentItemId} not found`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Update item type to COMPOSITE
      await tx.item.update({
        where: { id: dto.itemId },
        data: { type: 'COMPOSITE' },
      });

      // Create composite item with components
      const compositeItem = await tx.compositeItem.create({
        data: {
          itemId: dto.itemId,
          assemblyMethod: dto.assemblyMethod || 'MANUAL',
          organizationId,
          components: {
            create: dto.components.map((comp, index) => ({
              componentItemId: comp.componentItemId,
              quantity: comp.quantity,
              notes: comp.notes,
              sortOrder: comp.sortOrder ?? index,
            })),
          },
        },
        include: {
          item: {
            select: { id: true, sku: true, name: true, costPrice: true, sellingPrice: true },
          },
          components: {
            include: {
              componentItem: {
                select: { id: true, sku: true, name: true, unit: true, costPrice: true },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      return compositeItem;
    });
  }

  async getCompositeItem(itemId: string, organizationId: string) {
    const compositeItem = await this.prisma.compositeItem.findFirst({
      where: { itemId, organizationId },
      include: {
        item: {
          select: { id: true, sku: true, name: true, costPrice: true, sellingPrice: true, unit: true },
        },
        components: {
          include: {
            componentItem: {
              select: { id: true, sku: true, name: true, unit: true, costPrice: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!compositeItem) {
      throw new NotFoundException('Composite item not found');
    }

    return compositeItem;
  }

  async updateBOM(itemId: string, organizationId: string, dto: UpdateBOMDto) {
    const compositeItem = await this.prisma.compositeItem.findFirst({
      where: { itemId, organizationId },
    });
    if (!compositeItem) {
      throw new NotFoundException('Composite item not found');
    }

    // Validate all component items
    for (const comp of dto.components) {
      if (comp.componentItemId === itemId) {
        throw new BadRequestException('A composite item cannot be a component of itself');
      }
      const componentItem = await this.prisma.item.findFirst({
        where: { id: comp.componentItemId, organizationId },
      });
      if (!componentItem) {
        throw new NotFoundException(`Component item ${comp.componentItemId} not found`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Update assembly method if provided
      if (dto.assemblyMethod) {
        await tx.compositeItem.update({
          where: { id: compositeItem.id },
          data: { assemblyMethod: dto.assemblyMethod },
        });
      }

      // Delete existing components and replace
      await tx.bOMComponent.deleteMany({
        where: { compositeItemId: compositeItem.id },
      });

      // Create new components
      await tx.bOMComponent.createMany({
        data: dto.components.map((comp, index) => ({
          compositeItemId: compositeItem.id,
          componentItemId: comp.componentItemId,
          quantity: comp.quantity,
          notes: comp.notes,
          sortOrder: comp.sortOrder ?? index,
        })),
      });

      // Return updated composite item
      return tx.compositeItem.findUnique({
        where: { id: compositeItem.id },
        include: {
          item: {
            select: { id: true, sku: true, name: true, costPrice: true, sellingPrice: true, unit: true },
          },
          components: {
            include: {
              componentItem: {
                select: { id: true, sku: true, name: true, unit: true, costPrice: true },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });
  }

  async calculateAvailability(itemId: string, organizationId: string, warehouseId?: string) {
    const compositeItem = await this.prisma.compositeItem.findFirst({
      where: { itemId, organizationId },
      include: {
        components: {
          include: {
            componentItem: {
              select: { id: true, sku: true, name: true, unit: true },
            },
          },
        },
      },
    });

    if (!compositeItem) {
      throw new NotFoundException('Composite item not found');
    }

    if (compositeItem.components.length === 0) {
      return { availableQty: 0, limitingComponent: null, components: [] };
    }

    const componentAvailability = [];
    let minAvailable = Infinity;
    let limitingComponent = null;

    for (const comp of compositeItem.components) {
      const stockWhere: any = { itemId: comp.componentItemId };
      if (warehouseId) {
        stockWhere.warehouseId = warehouseId;
      }

      const stockLevels = await this.prisma.stockLevel.findMany({
        where: stockWhere,
      });

      const totalAvailable = stockLevels.reduce(
        (sum, sl) => sum + (Number(sl.stockOnHand) - Number(sl.committedStock)),
        0,
      );

      const requiredPerUnit = Number(comp.quantity);
      const canBuild = requiredPerUnit > 0 ? Math.floor(totalAvailable / requiredPerUnit) : 0;

      componentAvailability.push({
        componentItemId: comp.componentItemId,
        componentItem: comp.componentItem,
        requiredPerUnit,
        availableStock: totalAvailable,
        canBuild,
      });

      if (canBuild < minAvailable) {
        minAvailable = canBuild;
        limitingComponent = comp.componentItem;
      }
    }

    return {
      availableQty: minAvailable === Infinity ? 0 : minAvailable,
      limitingComponent,
      components: componentAvailability,
    };
  }

  async calculateComponentCost(itemId: string, organizationId: string) {
    const compositeItem = await this.prisma.compositeItem.findFirst({
      where: { itemId, organizationId },
      include: {
        item: {
          select: { id: true, sku: true, name: true, sellingPrice: true },
        },
        components: {
          include: {
            componentItem: {
              select: { id: true, sku: true, name: true, costPrice: true, unit: true },
            },
          },
        },
      },
    });

    if (!compositeItem) {
      throw new NotFoundException('Composite item not found');
    }

    const componentCosts = compositeItem.components.map((comp) => {
      const unitCost = Number(comp.componentItem.costPrice);
      const qty = Number(comp.quantity);
      return {
        componentItemId: comp.componentItemId,
        componentItem: comp.componentItem,
        quantity: qty,
        unitCost,
        totalCost: unitCost * qty,
      };
    });

    const totalComponentCost = componentCosts.reduce((sum, c) => sum + c.totalCost, 0);
    const sellingPrice = Number(compositeItem.item.sellingPrice);
    const margin = sellingPrice > 0 ? ((sellingPrice - totalComponentCost) / sellingPrice) * 100 : 0;

    return {
      componentCosts,
      totalComponentCost,
      sellingPrice,
      margin,
    };
  }

  // ============ Assembly ============

  async createAssembly(organizationId: string, userId: string, dto: CreateAssemblyDto) {
    // Validate composite item
    const compositeItem = await this.prisma.compositeItem.findFirst({
      where: { itemId: dto.compositeItemId, organizationId },
      include: {
        components: {
          include: {
            componentItem: {
              select: { id: true, sku: true, name: true, costPrice: true },
            },
          },
        },
      },
    });

    if (!compositeItem) {
      throw new NotFoundException('Composite item not found');
    }

    if (compositeItem.components.length === 0) {
      throw new BadRequestException('Composite item has no components defined');
    }

    // Validate warehouse
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, organizationId },
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    // Check component availability
    for (const comp of compositeItem.components) {
      const stockLevel = await this.prisma.stockLevel.findUnique({
        where: {
          itemId_warehouseId: {
            itemId: comp.componentItemId,
            warehouseId: dto.warehouseId,
          },
        },
      });

      const available = stockLevel
        ? Number(stockLevel.stockOnHand) - Number(stockLevel.committedStock)
        : 0;
      const required = Number(comp.quantity) * dto.quantity;

      if (available < required) {
        throw new BadRequestException(
          `Insufficient stock for component ${comp.componentItem.sku}. Required: ${required}, Available: ${available}`,
        );
      }
    }

    // Generate assembly number
    const lastAssembly = await this.prisma.assembly.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { assemblyNumber: true },
    });
    const nextNum = lastAssembly
      ? parseInt(lastAssembly.assemblyNumber.split('-')[1]) + 1
      : 1;
    const assemblyNumber = `ASM-${String(nextNum).padStart(6, '0')}`;

    // Calculate total cost
    let totalCost = 0;
    const assemblyItems = compositeItem.components.map((comp) => {
      const unitCost = Number(comp.componentItem.costPrice);
      const requiredQty = Number(comp.quantity) * dto.quantity;
      const itemTotalCost = unitCost * requiredQty;
      totalCost += itemTotalCost;

      return {
        itemId: comp.componentItemId,
        requiredQty,
        consumedQty: 0,
        unitCost,
        totalCost: itemTotalCost,
      };
    });

    return this.prisma.assembly.create({
      data: {
        assemblyNumber,
        compositeItemId: compositeItem.id,
        quantity: dto.quantity,
        warehouseId: dto.warehouseId,
        status: 'DRAFT',
        assemblyDate: dto.assemblyDate || new Date(),
        totalCost,
        notes: dto.notes,
        organizationId,
        createdById: userId,
        items: {
          create: assemblyItems,
        },
      },
      include: {
        compositeItem: {
          include: {
            item: { select: { id: true, sku: true, name: true } },
          },
        },
        items: true,
      },
    });
  }

  async completeAssembly(assemblyId: string, organizationId: string) {
    const assembly = await this.prisma.assembly.findFirst({
      where: { id: assemblyId, organizationId },
      include: {
        compositeItem: {
          include: {
            item: { select: { id: true } },
          },
        },
        items: true,
      },
    });

    if (!assembly) {
      throw new NotFoundException('Assembly not found');
    }

    if (assembly.status === 'COMPLETED') {
      throw new BadRequestException('Assembly is already completed');
    }

    if (assembly.status === 'CANCELLED') {
      throw new BadRequestException('Cannot complete a cancelled assembly');
    }

    return this.prisma.$transaction(async (tx) => {
      // Consume components (decrease stock)
      for (const item of assembly.items) {
        const stockLevel = await tx.stockLevel.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: item.itemId,
              warehouseId: assembly.warehouseId,
            },
          },
        });

        if (!stockLevel) {
          throw new BadRequestException(`No stock found for component item ${item.itemId}`);
        }

        const available = Number(stockLevel.stockOnHand) - Number(stockLevel.committedStock);
        if (available < Number(item.requiredQty)) {
          throw new BadRequestException(
            `Insufficient stock for component item ${item.itemId}`,
          );
        }

        await tx.stockLevel.update({
          where: { id: stockLevel.id },
          data: {
            stockOnHand: { decrement: Number(item.requiredQty) },
          },
        });

        // Update consumed qty
        await tx.assemblyItem.update({
          where: { id: item.id },
          data: { consumedQty: Number(item.requiredQty) },
        });
      }

      // Produce composite item (increase stock)
      const compositeItemId = assembly.compositeItem.item.id;
      const existingStock = await tx.stockLevel.findUnique({
        where: {
          itemId_warehouseId: {
            itemId: compositeItemId,
            warehouseId: assembly.warehouseId,
          },
        },
      });

      if (existingStock) {
        await tx.stockLevel.update({
          where: { id: existingStock.id },
          data: {
            stockOnHand: { increment: Number(assembly.quantity) },
          },
        });
      } else {
        await tx.stockLevel.create({
          data: {
            itemId: compositeItemId,
            warehouseId: assembly.warehouseId,
            stockOnHand: Number(assembly.quantity),
            committedStock: 0,
            incomingStock: 0,
          },
        });
      }

      // Update assembly status
      return tx.assembly.update({
        where: { id: assemblyId },
        data: { status: 'COMPLETED' },
        include: {
          compositeItem: {
            include: {
              item: { select: { id: true, sku: true, name: true } },
            },
          },
          items: true,
        },
      });
    });
  }

  async cancelAssembly(assemblyId: string, organizationId: string) {
    const assembly = await this.prisma.assembly.findFirst({
      where: { id: assemblyId, organizationId },
    });

    if (!assembly) {
      throw new NotFoundException('Assembly not found');
    }

    if (assembly.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed assembly');
    }

    if (assembly.status === 'CANCELLED') {
      throw new BadRequestException('Assembly is already cancelled');
    }

    return this.prisma.assembly.update({
      where: { id: assemblyId },
      data: { status: 'CANCELLED' },
      include: {
        compositeItem: {
          include: {
            item: { select: { id: true, sku: true, name: true } },
          },
        },
        items: true,
      },
    });
  }

  async createDisassembly(organizationId: string, userId: string, dto: CreateDisassemblyDto) {
    // Validate composite item
    const compositeItem = await this.prisma.compositeItem.findFirst({
      where: { itemId: dto.compositeItemId, organizationId },
      include: {
        item: { select: { id: true, sku: true, name: true, costPrice: true } },
        components: {
          include: {
            componentItem: {
              select: { id: true, sku: true, name: true, costPrice: true },
            },
          },
        },
      },
    });

    if (!compositeItem) {
      throw new NotFoundException('Composite item not found');
    }

    // Check composite item stock
    const stockLevel = await this.prisma.stockLevel.findUnique({
      where: {
        itemId_warehouseId: {
          itemId: dto.compositeItemId,
          warehouseId: dto.warehouseId,
        },
      },
    });

    const available = stockLevel
      ? Number(stockLevel.stockOnHand) - Number(stockLevel.committedStock)
      : 0;

    if (available < dto.quantity) {
      throw new BadRequestException(
        `Insufficient composite item stock. Required: ${dto.quantity}, Available: ${available}`,
      );
    }

    // Generate assembly number for disassembly
    const lastAssembly = await this.prisma.assembly.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { assemblyNumber: true },
    });
    const nextNum = lastAssembly
      ? parseInt(lastAssembly.assemblyNumber.split('-')[1]) + 1
      : 1;
    const assemblyNumber = `DIS-${String(nextNum).padStart(6, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      // Decrease composite item stock
      await tx.stockLevel.update({
        where: {
          itemId_warehouseId: {
            itemId: dto.compositeItemId,
            warehouseId: dto.warehouseId,
          },
        },
        data: {
          stockOnHand: { decrement: dto.quantity },
        },
      });

      // Increase component stocks
      let totalCost = 0;
      const assemblyItems = [];

      for (const comp of compositeItem.components) {
        const restoreQty = Number(comp.quantity) * dto.quantity;
        const unitCost = Number(comp.componentItem.costPrice);
        const itemTotalCost = unitCost * restoreQty;
        totalCost += itemTotalCost;

        assemblyItems.push({
          itemId: comp.componentItemId,
          requiredQty: restoreQty,
          consumedQty: restoreQty, // Already consumed (reversed)
          unitCost,
          totalCost: itemTotalCost,
        });

        const existingStock = await tx.stockLevel.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: comp.componentItemId,
              warehouseId: dto.warehouseId,
            },
          },
        });

        if (existingStock) {
          await tx.stockLevel.update({
            where: { id: existingStock.id },
            data: {
              stockOnHand: { increment: restoreQty },
            },
          });
        } else {
          await tx.stockLevel.create({
            data: {
              itemId: comp.componentItemId,
              warehouseId: dto.warehouseId,
              stockOnHand: restoreQty,
              committedStock: 0,
              incomingStock: 0,
            },
          });
        }
      }

      // Create assembly record (with COMPLETED status, as disassembly is instant)
      return tx.assembly.create({
        data: {
          assemblyNumber,
          compositeItemId: compositeItem.id,
          quantity: -dto.quantity, // Negative to indicate disassembly
          warehouseId: dto.warehouseId,
          status: 'COMPLETED',
          assemblyDate: new Date(),
          totalCost,
          notes: dto.notes || 'Disassembly',
          organizationId,
          createdById: userId,
          items: {
            create: assemblyItems,
          },
        },
        include: {
          compositeItem: {
            include: {
              item: { select: { id: true, sku: true, name: true } },
            },
          },
          items: true,
        },
      });
    });
  }

  async listAssemblies(
    organizationId: string,
    filters?: {
      status?: string;
      compositeItemId?: string;
      fromDate?: Date;
      toDate?: Date;
      page?: number;
      limit?: number;
    },
  ) {
    const { status, compositeItemId, fromDate, toDate, page = 1, limit = 25 } = filters || {};

    const where: any = {
      organizationId,
      ...(status && { status }),
      ...(compositeItemId && {
        compositeItem: { itemId: compositeItemId },
      }),
      ...(fromDate || toDate
        ? {
            assemblyDate: {
              ...(fromDate && { gte: fromDate }),
              ...(toDate && { lte: toDate }),
            },
          }
        : {}),
    };

    const [assemblies, total] = await Promise.all([
      this.prisma.assembly.findMany({
        where,
        include: {
          compositeItem: {
            include: {
              item: { select: { id: true, sku: true, name: true } },
            },
          },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.assembly.count({ where }),
    ]);

    return {
      data: assemblies,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAssembly(assemblyId: string, organizationId: string) {
    const assembly = await this.prisma.assembly.findFirst({
      where: { id: assemblyId, organizationId },
      include: {
        compositeItem: {
          include: {
            item: { select: { id: true, sku: true, name: true, unit: true } },
          },
        },
        items: true,
      },
    });

    if (!assembly) {
      throw new NotFoundException('Assembly not found');
    }

    return assembly;
  }
}
