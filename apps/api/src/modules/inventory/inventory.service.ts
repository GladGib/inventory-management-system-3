import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { CreateBatchDto, UpdateBatchDto, TransferBatchDto } from './dto/batch.dto';
import {
  CreateSerialDto,
  CreateBulkSerialsDto,
  UpdateSerialDto,
  TransferSerialDto,
  TransferBulkSerialsDto,
} from './dto/serial.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ============ Stock Levels ============

  async getStockLevels(organizationId: string, warehouseId?: string, itemId?: string) {
    const where: any = {
      item: { organizationId },
      ...(warehouseId && { warehouseId }),
      ...(itemId && { itemId }),
    };

    const stockLevels = await this.prisma.stockLevel.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            name: true,
            costPrice: true,
            reorderLevel: true,
          },
        },
        warehouse: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: [{ item: { sku: 'asc' } }],
    });

    return stockLevels.map((sl) => ({
      ...sl,
      availableStock: Number(sl.stockOnHand) - Number(sl.committedStock),
      stockValue: Number(sl.stockOnHand) * Number(sl.item.costPrice),
      isLowStock: sl.item.reorderLevel
        ? Number(sl.stockOnHand) <= Number(sl.item.reorderLevel)
        : false,
    }));
  }

  async getItemStock(itemId: string, organizationId: string) {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, organizationId },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    return this.getStockLevels(organizationId, undefined, itemId);
  }

  // ============ Adjustments ============

  async createAdjustment(organizationId: string, userId: string, dto: CreateAdjustmentDto) {
    // Validate item
    const item = await this.prisma.item.findFirst({
      where: { id: dto.itemId, organizationId },
    });
    if (!item) {
      throw new NotFoundException('Item not found');
    }

    // Validate warehouse
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, organizationId },
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    // Get or create stock level
    let stockLevel = await this.prisma.stockLevel.findUnique({
      where: {
        itemId_warehouseId: { itemId: dto.itemId, warehouseId: dto.warehouseId },
      },
    });

    // Check for sufficient stock on negative adjustment
    if (dto.quantity < 0) {
      const currentStock = stockLevel ? Number(stockLevel.stockOnHand) : 0;
      if (currentStock + dto.quantity < 0) {
        throw new BadRequestException('Insufficient stock');
      }
    }

    return this.prisma.$transaction(async (tx) => {
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
      const adjustment = await tx.stockAdjustment.create({
        data: {
          adjustmentNumber,
          organizationId,
          itemId: dto.itemId,
          warehouseId: dto.warehouseId,
          type: dto.quantity >= 0 ? 'INCREASE' : 'DECREASE',
          quantity: Math.abs(dto.quantity),
          reason: dto.reason,
          notes: dto.notes,
          date: dto.adjustmentDate || new Date(),
          adjustmentDate: dto.adjustmentDate || new Date(),
          status: 'COMPLETED',
          createdById: userId,
        },
        include: {
          item: { select: { sku: true, name: true } },
          warehouse: { select: { name: true, code: true } },
        },
      });

      // Update or create stock level
      if (stockLevel) {
        await tx.stockLevel.update({
          where: { id: stockLevel.id },
          data: {
            stockOnHand: { increment: dto.quantity },
          },
        });
      } else {
        await tx.stockLevel.create({
          data: {
            itemId: dto.itemId,
            warehouseId: dto.warehouseId,
            stockOnHand: dto.quantity,
            committedStock: 0,
            incomingStock: 0,
          },
        });
      }

      return adjustment;
    });
  }

  async getAdjustments(
    organizationId: string,
    filters: { itemId?: string; warehouseId?: string; fromDate?: Date; toDate?: Date }
  ) {
    const where: any = {
      organizationId,
      ...(filters.itemId && { itemId: filters.itemId }),
      ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
      ...(filters.fromDate || filters.toDate
        ? {
            adjustmentDate: {
              ...(filters.fromDate && { gte: filters.fromDate }),
              ...(filters.toDate && { lte: filters.toDate }),
            },
          }
        : {}),
    };

    return this.prisma.stockAdjustment.findMany({
      where,
      include: {
        item: { select: { sku: true, name: true } },
        warehouse: { select: { name: true, code: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { adjustmentDate: 'desc' },
    });
  }

  // ============ Transfers ============

  async createTransfer(organizationId: string, userId: string, dto: CreateTransferDto) {
    // Validate same warehouse
    if (dto.sourceWarehouseId === dto.destinationWarehouseId) {
      throw new BadRequestException('Source and destination warehouses must be different');
    }

    // Validate warehouses
    const [sourceWh, destWh] = await Promise.all([
      this.prisma.warehouse.findFirst({ where: { id: dto.sourceWarehouseId, organizationId } }),
      this.prisma.warehouse.findFirst({ where: { id: dto.destinationWarehouseId, organizationId } }),
    ]);

    if (!sourceWh) throw new NotFoundException('Source warehouse not found');
    if (!destWh) throw new NotFoundException('Destination warehouse not found');

    // Generate transfer number
    const lastTransfer = await this.prisma.inventoryTransfer.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { transferNumber: true },
    });

    const nextNum = lastTransfer
      ? parseInt(lastTransfer.transferNumber.split('-')[1]) + 1
      : 1;
    const transferNumber = `TRF-${String(nextNum).padStart(6, '0')}`;

    return this.prisma.inventoryTransfer.create({
      data: {
        transferNumber,
        sourceWarehouseId: dto.sourceWarehouseId,
        targetWarehouseId: dto.destinationWarehouseId,
        status: 'DRAFT',
        notes: dto.notes,
        transferDate: dto.transferDate || new Date(),
        createdById: userId,
        organizationId,
        items: {
          create: dto.items.map((item) => ({
            itemId: item.itemId,
            quantityRequested: item.quantity,
            quantityShipped: 0,
            quantityReceived: 0,
          })),
        },
      },
      include: {
        sourceWarehouse: { select: { name: true, code: true } },
        targetWarehouse: { select: { name: true, code: true } },
        items: {
          include: { item: { select: { sku: true, name: true } } },
        },
      },
    });
  }

  async issueTransfer(id: string, organizationId: string, userId: string) {
    const transfer = await this.prisma.inventoryTransfer.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });

    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== 'DRAFT') {
      throw new BadRequestException('Only draft transfers can be issued');
    }

    // Validate stock availability
    for (const item of transfer.items) {
      const stockLevel = await this.prisma.stockLevel.findUnique({
        where: {
          itemId_warehouseId: {
            itemId: item.itemId,
            warehouseId: transfer.sourceWarehouseId,
          },
        },
      });

      const available = stockLevel
        ? Number(stockLevel.stockOnHand) - Number(stockLevel.committedStock)
        : 0;

      if (available < Number(item.quantityRequested)) {
        throw new BadRequestException(`Insufficient stock for item ${item.itemId}`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Decrease stock at source and update shipped qty
      for (const item of transfer.items) {
        await tx.stockLevel.update({
          where: {
            itemId_warehouseId: {
              itemId: item.itemId,
              warehouseId: transfer.sourceWarehouseId,
            },
          },
          data: {
            stockOnHand: { decrement: Number(item.quantityRequested) },
          },
        });

        await tx.inventoryTransferItem.update({
          where: { id: item.id },
          data: { quantityShipped: Number(item.quantityRequested) },
        });
      }

      // Update transfer status
      return tx.inventoryTransfer.update({
        where: { id },
        data: {
          status: 'IN_TRANSIT',
        },
        include: {
          sourceWarehouse: { select: { name: true, code: true } },
          targetWarehouse: { select: { name: true, code: true } },
          items: {
            include: { item: { select: { sku: true, name: true } } },
          },
        },
      });
    });
  }

  async receiveTransfer(id: string, organizationId: string, userId: string) {
    const transfer = await this.prisma.inventoryTransfer.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });

    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== 'IN_TRANSIT') {
      throw new BadRequestException('Only in-transit transfers can be received');
    }

    return this.prisma.$transaction(async (tx) => {
      // Increase stock at destination
      for (const item of transfer.items) {
        const existingStock = await tx.stockLevel.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: item.itemId,
              warehouseId: transfer.targetWarehouseId,
            },
          },
        });

        if (existingStock) {
          await tx.stockLevel.update({
            where: { id: existingStock.id },
            data: {
              stockOnHand: { increment: Number(item.quantityShipped) },
            },
          });
        } else {
          await tx.stockLevel.create({
            data: {
              itemId: item.itemId,
              warehouseId: transfer.targetWarehouseId,
              stockOnHand: Number(item.quantityShipped),
              committedStock: 0,
              incomingStock: 0,
            },
          });
        }

        // Update received quantity
        await tx.inventoryTransferItem.update({
          where: { id: item.id },
          data: { quantityReceived: Number(item.quantityShipped) },
        });
      }

      // Update transfer status
      return tx.inventoryTransfer.update({
        where: { id },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date(),
          receivedById: userId,
        },
        include: {
          sourceWarehouse: { select: { name: true, code: true } },
          targetWarehouse: { select: { name: true, code: true } },
          items: {
            include: { item: { select: { sku: true, name: true } } },
          },
        },
      });
    });
  }

  async cancelTransfer(id: string, organizationId: string, userId: string) {
    const transfer = await this.prisma.inventoryTransfer.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });

    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status === 'RECEIVED' || transfer.status === 'CANCELLED') {
      throw new BadRequestException('Cannot cancel received or already cancelled transfers');
    }

    return this.prisma.$transaction(async (tx) => {
      // If in transit, restore stock to source
      if (transfer.status === 'IN_TRANSIT') {
        for (const item of transfer.items) {
          await tx.stockLevel.update({
            where: {
              itemId_warehouseId: {
                itemId: item.itemId,
                warehouseId: transfer.sourceWarehouseId,
              },
            },
            data: {
              stockOnHand: { increment: Number(item.quantityShipped) },
            },
          });
        }
      }

      return tx.inventoryTransfer.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
    });
  }

  async getTransfers(organizationId: string, status?: string, warehouseId?: string) {
    const where: any = {
      organizationId,
      ...(status && { status }),
      ...(warehouseId && {
        OR: [
          { sourceWarehouseId: warehouseId },
          { targetWarehouseId: warehouseId },
        ],
      }),
    };

    return this.prisma.inventoryTransfer.findMany({
      where,
      include: {
        sourceWarehouse: { select: { name: true, code: true } },
        targetWarehouse: { select: { name: true, code: true } },
        items: {
          include: { item: { select: { sku: true, name: true } } },
        },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============ Batch Management ============

  async createBatch(organizationId: string, dto: CreateBatchDto) {
    const item = await this.prisma.item.findFirst({
      where: { id: dto.itemId, organizationId },
    });

    if (!item) throw new NotFoundException('Item not found');
    if (!item.trackBatches) {
      throw new BadRequestException('Item does not have batch tracking enabled');
    }

    const existing = await this.prisma.batch.findUnique({
      where: {
        itemId_warehouseId_batchNumber: {
          itemId: dto.itemId,
          warehouseId: dto.warehouseId,
          batchNumber: dto.batchNumber,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Batch number already exists for this item and warehouse');
    }

    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.batch.create({
        data: {
          itemId: dto.itemId,
          warehouseId: dto.warehouseId,
          batchNumber: dto.batchNumber,
          manufactureDate: dto.manufactureDate,
          expiryDate: dto.expiryDate,
          quantity: dto.quantity,
          organizationId,
        },
        include: {
          item: { select: { sku: true, name: true } },
          warehouse: { select: { name: true, code: true } },
        },
      });

      // Update stock level
      const stockLevel = await tx.stockLevel.findUnique({
        where: {
          itemId_warehouseId: { itemId: dto.itemId, warehouseId: dto.warehouseId },
        },
      });

      if (stockLevel) {
        await tx.stockLevel.update({
          where: { id: stockLevel.id },
          data: { stockOnHand: { increment: dto.quantity } },
        });
      } else {
        await tx.stockLevel.create({
          data: {
            itemId: dto.itemId,
            warehouseId: dto.warehouseId,
            stockOnHand: dto.quantity,
            committedStock: 0,
            incomingStock: 0,
          },
        });
      }

      return batch;
    });
  }

  async getBatches(
    organizationId: string,
    filters?: {
      itemId?: string;
      warehouseId?: string;
      expiringWithinDays?: number;
      page?: number;
      limit?: number;
    }
  ) {
    const { itemId, warehouseId, expiringWithinDays, page = 1, limit = 25 } = filters || {};

    const where: any = {
      item: { organizationId },
      status: 'ACTIVE',
      ...(itemId && { itemId }),
      ...(warehouseId && { warehouseId }),
    };

    if (expiringWithinDays) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiringWithinDays);
      where.expiryDate = { lte: expiryDate, gte: new Date() };
    }

    const [batches, total] = await Promise.all([
      this.prisma.batch.findMany({
        where,
        include: {
          item: { select: { sku: true, name: true } },
          warehouse: { select: { name: true, code: true } },
        },
        orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.batch.count({ where }),
    ]);

    return {
      data: batches.map((b) => ({ ...b, quantity: Number(b.quantity) })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getExpiringBatches(organizationId: string, days: number = 30) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    const batches = await this.prisma.batch.findMany({
      where: {
        item: { organizationId },
        expiryDate: { lte: expiryDate, gte: new Date() },
        quantity: { gt: 0 },
        status: 'ACTIVE',
      },
      include: {
        item: { select: { sku: true, name: true } },
        warehouse: { select: { name: true, code: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });

    return batches.map((b) => ({
      ...b,
      quantity: Number(b.quantity),
      daysUntilExpiry: Math.ceil((b.expiryDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    }));
  }

  // ============ Serial Number Management ============

  async createSerial(organizationId: string, dto: CreateSerialDto) {
    const item = await this.prisma.item.findFirst({
      where: { id: dto.itemId, organizationId },
    });

    if (!item) throw new NotFoundException('Item not found');
    if (!item.trackSerials) {
      throw new BadRequestException('Item does not have serial tracking enabled');
    }

    const existing = await this.prisma.serialNumber.findUnique({
      where: {
        itemId_serialNumber: { itemId: dto.itemId, serialNumber: dto.serialNumber },
      },
    });

    if (existing) {
      throw new BadRequestException('Serial number already exists for this item');
    }

    return this.prisma.$transaction(async (tx) => {
      const serial = await tx.serialNumber.create({
        data: {
          itemId: dto.itemId,
          warehouseId: dto.warehouseId,
          serialNumber: dto.serialNumber,
          status: 'IN_STOCK',
          organizationId,
        },
        include: {
          item: { select: { sku: true, name: true } },
          warehouse: { select: { name: true, code: true } },
        },
      });

      // Update stock level
      const stockLevel = await tx.stockLevel.findUnique({
        where: {
          itemId_warehouseId: { itemId: dto.itemId, warehouseId: dto.warehouseId },
        },
      });

      if (stockLevel) {
        await tx.stockLevel.update({
          where: { id: stockLevel.id },
          data: { stockOnHand: { increment: 1 } },
        });
      } else {
        await tx.stockLevel.create({
          data: {
            itemId: dto.itemId,
            warehouseId: dto.warehouseId,
            stockOnHand: 1,
            committedStock: 0,
            incomingStock: 0,
          },
        });
      }

      return serial;
    });
  }

  async createBulkSerials(organizationId: string, dto: CreateBulkSerialsDto) {
    const item = await this.prisma.item.findFirst({
      where: { id: dto.itemId, organizationId },
    });

    if (!item) throw new NotFoundException('Item not found');
    if (!item.trackSerials) {
      throw new BadRequestException('Item does not have serial tracking enabled');
    }

    const existing = await this.prisma.serialNumber.findMany({
      where: { itemId: dto.itemId, serialNumber: { in: dto.serialNumbers } },
      select: { serialNumber: true },
    });

    if (existing.length > 0) {
      throw new BadRequestException(
        `Serial numbers already exist: ${existing.map((e) => e.serialNumber).join(', ')}`
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.serialNumber.createMany({
        data: dto.serialNumbers.map((sn) => ({
          itemId: dto.itemId,
          warehouseId: dto.warehouseId,
          serialNumber: sn,
          status: 'IN_STOCK' as const,
          organizationId,
        })),
      });

      // Update stock level
      const stockLevel = await tx.stockLevel.findUnique({
        where: {
          itemId_warehouseId: { itemId: dto.itemId, warehouseId: dto.warehouseId },
        },
      });

      if (stockLevel) {
        await tx.stockLevel.update({
          where: { id: stockLevel.id },
          data: { stockOnHand: { increment: dto.serialNumbers.length } },
        });
      } else {
        await tx.stockLevel.create({
          data: {
            itemId: dto.itemId,
            warehouseId: dto.warehouseId,
            stockOnHand: dto.serialNumbers.length,
            committedStock: 0,
            incomingStock: 0,
          },
        });
      }

      return { created: created.count };
    });
  }

  async getSerials(
    organizationId: string,
    filters?: {
      itemId?: string;
      warehouseId?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const { itemId, warehouseId, status, search, page = 1, limit = 25 } = filters || {};

    const where: any = {
      item: { organizationId },
      ...(itemId && { itemId }),
      ...(warehouseId && { warehouseId }),
      ...(status && { status }),
      ...(search && { serialNumber: { contains: search, mode: 'insensitive' } }),
    };

    const [serials, total] = await Promise.all([
      this.prisma.serialNumber.findMany({
        where,
        include: {
          item: { select: { sku: true, name: true } },
          warehouse: { select: { name: true, code: true } },
          soldTo: { select: { displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.serialNumber.count({ where }),
    ]);

    return {
      data: serials,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async transferSerial(organizationId: string, dto: TransferSerialDto) {
    const serial = await this.prisma.serialNumber.findFirst({
      where: { id: dto.serialId, item: { organizationId } },
    });

    if (!serial) throw new NotFoundException('Serial number not found');
    if (serial.status !== 'IN_STOCK') {
      throw new BadRequestException('Can only transfer serial numbers that are in stock');
    }
    if (serial.warehouseId === dto.toWarehouseId) {
      throw new BadRequestException('Source and destination warehouses are the same');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.serialNumber.update({
        where: { id: dto.serialId },
        data: { warehouseId: dto.toWarehouseId },
      });

      // Update stock levels
      if (serial.warehouseId) {
        await tx.stockLevel.update({
          where: {
            itemId_warehouseId: { itemId: serial.itemId, warehouseId: serial.warehouseId },
          },
          data: { stockOnHand: { decrement: 1 } },
        });
      }

      const destStockLevel = await tx.stockLevel.findUnique({
        where: {
          itemId_warehouseId: { itemId: serial.itemId, warehouseId: dto.toWarehouseId },
        },
      });

      if (destStockLevel) {
        await tx.stockLevel.update({
          where: { id: destStockLevel.id },
          data: { stockOnHand: { increment: 1 } },
        });
      } else {
        await tx.stockLevel.create({
          data: {
            itemId: serial.itemId,
            warehouseId: dto.toWarehouseId,
            stockOnHand: 1,
            committedStock: 0,
            incomingStock: 0,
          },
        });
      }

      return { success: true, message: 'Serial number transferred successfully' };
    });
  }
}
