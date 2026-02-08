import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateBatchDto,
  UpdateBatchDto,
  BatchAdjustmentDto,
  BatchAllocationDto,
} from './dto/batch.dto';

@Injectable()
export class BatchService {
  constructor(private readonly prisma: PrismaService) {}

  // ============ List Batches ============

  async listBatches(
    organizationId: string,
    filters?: {
      itemId?: string;
      warehouseId?: string;
      status?: string;
      expiryFrom?: Date;
      expiryTo?: Date;
      page?: number;
      limit?: number;
    },
  ) {
    const {
      itemId,
      warehouseId,
      status,
      expiryFrom,
      expiryTo,
      page = 1,
      limit = 25,
    } = filters || {};

    const where: any = {
      organizationId,
      ...(itemId && { itemId }),
      ...(warehouseId && { warehouseId }),
      ...(status && { status }),
    };

    if (expiryFrom || expiryTo) {
      where.expiryDate = {
        ...(expiryFrom && { gte: expiryFrom }),
        ...(expiryTo && { lte: expiryTo }),
      };
    }

    const [batches, total] = await Promise.all([
      this.prisma.batch.findMany({
        where,
        include: {
          item: { select: { id: true, sku: true, name: true, unit: true } },
          warehouse: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.batch.count({ where }),
    ]);

    return {
      data: batches.map((b) => ({
        ...b,
        quantity: Number(b.quantity),
        initialQuantity: Number(b.initialQuantity),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ============ Get Batch ============

  async getBatch(batchId: string, organizationId: string) {
    const batch = await this.prisma.batch.findFirst({
      where: { id: batchId, organizationId },
      include: {
        item: { select: { id: true, sku: true, name: true, unit: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    return {
      ...batch,
      quantity: Number(batch.quantity),
      initialQuantity: Number(batch.initialQuantity),
      transactions: batch.transactions.map((t) => ({
        ...t,
        quantity: Number(t.quantity),
      })),
    };
  }

  // ============ Create Batch ============

  async createBatch(organizationId: string, userId: string, dto: CreateBatchDto) {
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
      throw new BadRequestException(
        'Batch number already exists for this item and warehouse',
      );
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
          initialQuantity: dto.quantity,
          status: 'ACTIVE',
          notes: dto.notes,
          purchaseReceiveId: dto.purchaseReceiveId,
          supplierId: dto.supplierId,
          organizationId,
        },
        include: {
          item: { select: { id: true, sku: true, name: true, unit: true } },
          warehouse: { select: { id: true, name: true, code: true } },
        },
      });

      // Create initial batch transaction
      await tx.batchTransaction.create({
        data: {
          batchId: batch.id,
          type: 'RECEIVE',
          quantity: dto.quantity,
          referenceType: dto.purchaseReceiveId ? 'PurchaseReceive' : null,
          referenceId: dto.purchaseReceiveId || null,
          notes: 'Initial batch creation',
          createdById: userId,
        },
      });

      // Update stock level
      const stockLevel = await tx.stockLevel.findUnique({
        where: {
          itemId_warehouseId: {
            itemId: dto.itemId,
            warehouseId: dto.warehouseId,
          },
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

      return {
        ...batch,
        quantity: Number(batch.quantity),
        initialQuantity: Number(batch.initialQuantity),
      };
    });
  }

  // ============ Update Batch ============

  async updateBatch(
    batchId: string,
    organizationId: string,
    dto: UpdateBatchDto,
  ) {
    const batch = await this.prisma.batch.findFirst({
      where: { id: batchId, organizationId },
    });

    if (!batch) throw new NotFoundException('Batch not found');

    const updated = await this.prisma.batch.update({
      where: { id: batchId },
      data: {
        ...(dto.manufactureDate !== undefined && {
          manufactureDate: dto.manufactureDate,
        }),
        ...(dto.expiryDate !== undefined && { expiryDate: dto.expiryDate }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: {
        item: { select: { id: true, sku: true, name: true, unit: true } },
        warehouse: { select: { id: true, name: true, code: true } },
      },
    });

    return {
      ...updated,
      quantity: Number(updated.quantity),
      initialQuantity: Number(updated.initialQuantity),
    };
  }

  // ============ Batch History ============

  async getBatchHistory(batchId: string, organizationId: string) {
    const batch = await this.prisma.batch.findFirst({
      where: { id: batchId, organizationId },
    });

    if (!batch) throw new NotFoundException('Batch not found');

    const transactions = await this.prisma.batchTransaction.findMany({
      where: { batchId },
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map((t) => ({
      ...t,
      quantity: Number(t.quantity),
    }));
  }

  // ============ Select Batches for Sale (FIFO/FEFO) ============

  async selectBatchesForSale(
    itemId: string,
    warehouseId: string,
    quantity: number,
    method: 'FIFO' | 'FEFO' = 'FEFO',
    organizationId: string,
  ) {
    const orderBy: any =
      method === 'FEFO'
        ? [{ expiryDate: 'asc' }, { createdAt: 'asc' }]
        : [{ createdAt: 'asc' }];

    const batches = await this.prisma.batch.findMany({
      where: {
        itemId,
        warehouseId,
        organizationId,
        status: 'ACTIVE',
        quantity: { gt: 0 },
      },
      orderBy,
      include: {
        item: { select: { id: true, sku: true, name: true } },
      },
    });

    let remaining = quantity;
    const allocations: Array<{
      batchId: string;
      batchNumber: string;
      allocatedQuantity: number;
      availableQuantity: number;
      expiryDate: Date | null;
    }> = [];

    for (const batch of batches) {
      if (remaining <= 0) break;

      const available = Number(batch.quantity);
      const toAllocate = Math.min(available, remaining);

      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        allocatedQuantity: toAllocate,
        availableQuantity: available,
        expiryDate: batch.expiryDate,
      });

      remaining -= toAllocate;
    }

    if (remaining > 0) {
      throw new BadRequestException(
        `Insufficient batch stock. Short by ${remaining} units.`,
      );
    }

    return {
      method,
      totalAllocated: quantity,
      allocations,
    };
  }

  // ============ Batch Adjustment ============

  async adjustBatch(
    organizationId: string,
    userId: string,
    dto: BatchAdjustmentDto,
  ) {
    const batch = await this.prisma.batch.findFirst({
      where: { id: dto.batchId, organizationId },
    });

    if (!batch) throw new NotFoundException('Batch not found');

    const currentQty = Number(batch.quantity);
    const newQty = currentQty + dto.quantity;

    if (newQty < 0) {
      throw new BadRequestException(
        `Insufficient batch stock. Current: ${currentQty}, Adjustment: ${dto.quantity}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Update batch quantity
      const updated = await tx.batch.update({
        where: { id: dto.batchId },
        data: {
          quantity: newQty,
          ...(newQty === 0 && { status: 'DEPLETED' }),
        },
        include: {
          item: { select: { id: true, sku: true, name: true, unit: true } },
          warehouse: { select: { id: true, name: true, code: true } },
        },
      });

      // Record transaction
      await tx.batchTransaction.create({
        data: {
          batchId: dto.batchId,
          type: 'ADJUSTMENT',
          quantity: dto.quantity,
          notes: `${dto.reason}${dto.notes ? ': ' + dto.notes : ''}`,
          createdById: userId,
        },
      });

      // Update stock level
      await tx.stockLevel.update({
        where: {
          itemId_warehouseId: {
            itemId: batch.itemId,
            warehouseId: batch.warehouseId,
          },
        },
        data: { stockOnHand: { increment: dto.quantity } },
      });

      return {
        ...updated,
        quantity: Number(updated.quantity),
        initialQuantity: Number(updated.initialQuantity),
      };
    });
  }

  // ============ Expiring Batches Report ============

  async getExpiringBatches(organizationId: string, daysAhead: number = 30) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysAhead);

    const batches = await this.prisma.batch.findMany({
      where: {
        organizationId,
        expiryDate: { lte: expiryDate, gte: new Date() },
        quantity: { gt: 0 },
        status: 'ACTIVE',
      },
      include: {
        item: { select: { id: true, sku: true, name: true, unit: true } },
        warehouse: { select: { id: true, name: true, code: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });

    return batches.map((b) => ({
      ...b,
      quantity: Number(b.quantity),
      initialQuantity: Number(b.initialQuantity),
      daysUntilExpiry: Math.ceil(
        (b.expiryDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      ),
    }));
  }

  // ============ Expired Batches ============

  async getExpiredBatches(organizationId: string) {
    const batches = await this.prisma.batch.findMany({
      where: {
        organizationId,
        OR: [
          { status: 'EXPIRED' },
          {
            expiryDate: { lt: new Date() },
            status: 'ACTIVE',
            quantity: { gt: 0 },
          },
        ],
      },
      include: {
        item: { select: { id: true, sku: true, name: true, unit: true } },
        warehouse: { select: { id: true, name: true, code: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });

    return batches.map((b) => ({
      ...b,
      quantity: Number(b.quantity),
      initialQuantity: Number(b.initialQuantity),
      daysExpired: b.expiryDate
        ? Math.ceil(
            (Date.now() - b.expiryDate.getTime()) / (1000 * 60 * 60 * 24),
          )
        : null,
    }));
  }

  // ============ Cron: Check and update expired batches ============

  async checkAndUpdateExpiredStatus() {
    const result = await this.prisma.batch.updateMany({
      where: {
        status: 'ACTIVE',
        expiryDate: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });

    return { updatedCount: result.count };
  }
}
