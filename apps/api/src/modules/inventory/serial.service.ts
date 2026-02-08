import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateBulkSerialsDto,
  UpdateSerialDto,
  AssignSerialsDto,
  CreateWarrantyClaimDto,
  UpdateWarrantyClaimDto,
} from './dto/serial.dto';

@Injectable()
export class SerialService {
  constructor(private readonly prisma: PrismaService) {}

  // ============ List Serials ============

  async listSerials(
    organizationId: string,
    filters?: {
      itemId?: string;
      warehouseId?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const {
      itemId,
      warehouseId,
      status,
      search,
      page = 1,
      limit = 25,
    } = filters || {};

    const where: any = {
      organizationId,
      ...(itemId && { itemId }),
      ...(warehouseId && { warehouseId }),
      ...(status && { status }),
      ...(search && {
        serialNumber: { contains: search, mode: 'insensitive' },
      }),
    };

    const [serials, total] = await Promise.all([
      this.prisma.serialNumber.findMany({
        where,
        include: {
          item: { select: { id: true, sku: true, name: true, unit: true } },
          warehouse: { select: { id: true, name: true, code: true } },
          soldTo: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.serialNumber.count({ where }),
    ]);

    return {
      data: serials.map((s) => ({
        ...s,
        purchaseCost: s.purchaseCost ? Number(s.purchaseCost) : null,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ============ Get Serial ============

  async getSerial(serialId: string, organizationId: string) {
    const serial = await this.prisma.serialNumber.findFirst({
      where: { id: serialId, organizationId },
      include: {
        item: { select: { id: true, sku: true, name: true, unit: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        soldTo: { select: { id: true, displayName: true, email: true, phone: true } },
        history: {
          orderBy: { createdAt: 'desc' },
        },
        warrantyClaims: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!serial) {
      throw new NotFoundException('Serial number not found');
    }

    return {
      ...serial,
      purchaseCost: serial.purchaseCost ? Number(serial.purchaseCost) : null,
    };
  }

  // ============ Register Serials (Bulk) ============

  async registerSerials(
    organizationId: string,
    userId: string,
    dto: CreateBulkSerialsDto,
  ) {
    const item = await this.prisma.item.findFirst({
      where: { id: dto.itemId, organizationId },
    });

    if (!item) throw new NotFoundException('Item not found');
    if (!item.trackSerials) {
      throw new BadRequestException(
        'Item does not have serial tracking enabled',
      );
    }

    // Check for duplicates
    const existing = await this.prisma.serialNumber.findMany({
      where: { itemId: dto.itemId, serialNumber: { in: dto.serialNumbers } },
      select: { serialNumber: true },
    });

    if (existing.length > 0) {
      throw new BadRequestException(
        `Serial numbers already exist: ${existing.map((e) => e.serialNumber).join(', ')}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const serialRecords = [];

      for (const sn of dto.serialNumbers) {
        const serial = await tx.serialNumber.create({
          data: {
            itemId: dto.itemId,
            warehouseId: dto.warehouseId,
            serialNumber: sn,
            status: 'IN_STOCK',
            purchaseReceiveId: dto.purchaseReceiveId,
            supplierId: dto.supplierId,
            purchaseCost: dto.purchaseCost,
            purchaseDate: new Date(),
            warrantyMonths: dto.warrantyMonths,
            organizationId,
          },
        });

        // Create history entry
        await tx.serialHistory.create({
          data: {
            serialNumberId: serial.id,
            action: 'RECEIVED',
            toStatus: 'IN_STOCK',
            toWarehouseId: dto.warehouseId,
            referenceType: dto.purchaseReceiveId
              ? 'PurchaseReceive'
              : null,
            referenceId: dto.purchaseReceiveId || null,
            notes: 'Initial registration',
            createdById: userId,
          },
        });

        serialRecords.push(serial);
      }

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

      return { created: serialRecords.length, serials: serialRecords };
    });
  }

  // ============ Update Serial ============

  async updateSerial(
    serialId: string,
    organizationId: string,
    userId: string,
    dto: UpdateSerialDto,
  ) {
    const serial = await this.prisma.serialNumber.findFirst({
      where: { id: serialId, organizationId },
    });

    if (!serial) throw new NotFoundException('Serial number not found');

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (dto.notes !== undefined) updateData.notes = dto.notes;
      if (dto.warrantyMonths !== undefined)
        updateData.warrantyMonths = dto.warrantyMonths;
      if (dto.warrantyStartDate !== undefined)
        updateData.warrantyStartDate = dto.warrantyStartDate;
      if (dto.warrantyEndDate !== undefined)
        updateData.warrantyEndDate = dto.warrantyEndDate;

      // Handle status change with history
      if (dto.status && dto.status !== serial.status) {
        updateData.status = dto.status;

        await tx.serialHistory.create({
          data: {
            serialNumberId: serialId,
            action: 'ADJUSTED',
            fromStatus: serial.status,
            toStatus: dto.status,
            notes: `Status changed from ${serial.status} to ${dto.status}`,
            createdById: userId,
          },
        });
      }

      // Handle warehouse transfer with history
      if (dto.warehouseId && dto.warehouseId !== serial.warehouseId) {
        updateData.warehouseId = dto.warehouseId;

        await tx.serialHistory.create({
          data: {
            serialNumberId: serialId,
            action: 'TRANSFERRED',
            fromStatus: serial.status,
            toStatus: dto.status || serial.status,
            fromWarehouseId: serial.warehouseId,
            toWarehouseId: dto.warehouseId,
            notes: 'Warehouse transfer',
            createdById: userId,
          },
        });

        // Update stock levels
        if (serial.warehouseId) {
          await tx.stockLevel.update({
            where: {
              itemId_warehouseId: {
                itemId: serial.itemId,
                warehouseId: serial.warehouseId,
              },
            },
            data: { stockOnHand: { decrement: 1 } },
          });
        }

        const destStock = await tx.stockLevel.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: serial.itemId,
              warehouseId: dto.warehouseId,
            },
          },
        });

        if (destStock) {
          await tx.stockLevel.update({
            where: { id: destStock.id },
            data: { stockOnHand: { increment: 1 } },
          });
        } else {
          await tx.stockLevel.create({
            data: {
              itemId: serial.itemId,
              warehouseId: dto.warehouseId,
              stockOnHand: 1,
              committedStock: 0,
              incomingStock: 0,
            },
          });
        }
      }

      const updated = await tx.serialNumber.update({
        where: { id: serialId },
        data: updateData,
        include: {
          item: { select: { id: true, sku: true, name: true } },
          warehouse: { select: { id: true, name: true, code: true } },
          soldTo: { select: { id: true, displayName: true } },
        },
      });

      return {
        ...updated,
        purchaseCost: updated.purchaseCost
          ? Number(updated.purchaseCost)
          : null,
      };
    });
  }

  // ============ Get Serial History ============

  async getSerialHistory(serialId: string, organizationId: string) {
    const serial = await this.prisma.serialNumber.findFirst({
      where: { id: serialId, organizationId },
    });

    if (!serial) throw new NotFoundException('Serial number not found');

    return this.prisma.serialHistory.findMany({
      where: { serialNumberId: serialId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============ Search Serials ============

  async searchSerials(query: string, organizationId: string) {
    if (!query || query.length < 2) {
      return [];
    }

    const serials = await this.prisma.serialNumber.findMany({
      where: {
        organizationId,
        serialNumber: { contains: query, mode: 'insensitive' },
      },
      include: {
        item: { select: { id: true, sku: true, name: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        soldTo: { select: { id: true, displayName: true } },
      },
      take: 25,
      orderBy: { serialNumber: 'asc' },
    });

    return serials.map((s) => ({
      ...s,
      purchaseCost: s.purchaseCost ? Number(s.purchaseCost) : null,
    }));
  }

  // ============ Available Serials for Sale ============

  async getAvailableSerials(
    itemId: string,
    warehouseId: string,
    organizationId: string,
  ) {
    const serials = await this.prisma.serialNumber.findMany({
      where: {
        itemId,
        warehouseId,
        organizationId,
        status: 'IN_STOCK',
      },
      include: {
        item: { select: { id: true, sku: true, name: true } },
      },
      orderBy: { serialNumber: 'asc' },
    });

    return serials.map((s) => ({
      ...s,
      purchaseCost: s.purchaseCost ? Number(s.purchaseCost) : null,
    }));
  }

  // ============ Assign Serials to Sale ============

  async assignSerialsToSale(
    organizationId: string,
    userId: string,
    dto: AssignSerialsDto,
  ) {
    // Validate all serials exist and are in stock
    const serials = await this.prisma.serialNumber.findMany({
      where: {
        id: { in: dto.serialIds },
        organizationId,
      },
    });

    if (serials.length !== dto.serialIds.length) {
      throw new BadRequestException('One or more serial numbers not found');
    }

    const notInStock = serials.filter((s) => s.status !== 'IN_STOCK');
    if (notInStock.length > 0) {
      throw new BadRequestException(
        `Serials not available: ${notInStock.map((s) => s.serialNumber).join(', ')}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const serial of serials) {
        await tx.serialNumber.update({
          where: { id: serial.id },
          data: {
            status: 'SOLD',
            soldToId: dto.customerId,
            saleDate: new Date(),
            warrantyStartDate: serial.warrantyMonths
              ? new Date()
              : undefined,
            warrantyEndDate: serial.warrantyMonths
              ? new Date(
                  Date.now() +
                    serial.warrantyMonths * 30 * 24 * 60 * 60 * 1000,
                )
              : undefined,
          },
        });

        await tx.serialHistory.create({
          data: {
            serialNumberId: serial.id,
            action: 'SOLD',
            fromStatus: 'IN_STOCK',
            toStatus: 'SOLD',
            referenceType: dto.salesOrderItemId
              ? 'SalesOrderItem'
              : null,
            referenceId: dto.salesOrderItemId || null,
            notes: `Sold to customer`,
            createdById: userId,
          },
        });

        // Decrement stock
        if (serial.warehouseId) {
          await tx.stockLevel.update({
            where: {
              itemId_warehouseId: {
                itemId: serial.itemId,
                warehouseId: serial.warehouseId,
              },
            },
            data: { stockOnHand: { decrement: 1 } },
          });
        }
      }

      return { assigned: serials.length };
    });
  }

  // ============ Warranty Claims ============

  async createWarrantyClaim(
    serialId: string,
    organizationId: string,
    userId: string,
    dto: CreateWarrantyClaimDto,
  ) {
    const serial = await this.prisma.serialNumber.findFirst({
      where: { id: serialId, organizationId },
    });

    if (!serial) throw new NotFoundException('Serial number not found');
    if (serial.status !== 'SOLD') {
      throw new BadRequestException(
        'Warranty claims can only be created for sold items',
      );
    }

    // Generate claim number
    const lastClaim = await this.prisma.warrantyClaim.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { claimNumber: true },
    });

    const nextNum = lastClaim
      ? parseInt(lastClaim.claimNumber.split('-')[1]) + 1
      : 1;
    const claimNumber = `WC-${String(nextNum).padStart(6, '0')}`;

    const claim = await this.prisma.warrantyClaim.create({
      data: {
        claimNumber,
        serialNumberId: serialId,
        customerId: dto.customerId,
        claimDate: dto.claimDate,
        issueDescription: dto.issueDescription,
        status: 'PENDING',
        organizationId,
        createdById: userId,
      },
      include: {
        serialNumber: {
          include: {
            item: { select: { id: true, sku: true, name: true } },
          },
        },
      },
    });

    return claim;
  }

  async getWarrantyClaims(
    organizationId: string,
    filters?: {
      status?: string;
      fromDate?: Date;
      toDate?: Date;
      page?: number;
      limit?: number;
    },
  ) {
    const {
      status,
      fromDate,
      toDate,
      page = 1,
      limit = 25,
    } = filters || {};

    const where: any = {
      organizationId,
      ...(status && { status }),
    };

    if (fromDate || toDate) {
      where.claimDate = {
        ...(fromDate && { gte: fromDate }),
        ...(toDate && { lte: toDate }),
      };
    }

    const [claims, total] = await Promise.all([
      this.prisma.warrantyClaim.findMany({
        where,
        include: {
          serialNumber: {
            include: {
              item: { select: { id: true, sku: true, name: true } },
              soldTo: { select: { id: true, displayName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.warrantyClaim.count({ where }),
    ]);

    return {
      data: claims,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateWarrantyClaim(
    claimId: string,
    organizationId: string,
    dto: UpdateWarrantyClaimDto,
  ) {
    const claim = await this.prisma.warrantyClaim.findFirst({
      where: { id: claimId, organizationId },
    });

    if (!claim) throw new NotFoundException('Warranty claim not found');

    const updated = await this.prisma.warrantyClaim.update({
      where: { id: claimId },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.resolution && { resolution: dto.resolution }),
        ...(dto.resolvedDate && { resolvedDate: dto.resolvedDate }),
        ...(dto.replacementSerialId && {
          replacementSerialId: dto.replacementSerialId,
        }),
      },
      include: {
        serialNumber: {
          include: {
            item: { select: { id: true, sku: true, name: true } },
            soldTo: { select: { id: true, displayName: true } },
          },
        },
      },
    });

    return updated;
  }

  // ============ Warranty Report ============

  async getWarrantyReport(organizationId: string) {
    const now = new Date();

    const [activeWarranties, expiringWarranties, claims] = await Promise.all([
      this.prisma.serialNumber.count({
        where: {
          organizationId,
          warrantyEndDate: { gt: now },
          status: 'SOLD',
        },
      }),
      this.prisma.serialNumber.count({
        where: {
          organizationId,
          warrantyEndDate: {
            gt: now,
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
          status: 'SOLD',
        },
      }),
      this.prisma.warrantyClaim.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
    ]);

    const serialsWithWarranty = await this.prisma.serialNumber.findMany({
      where: {
        organizationId,
        warrantyEndDate: { not: null },
        status: 'SOLD',
      },
      include: {
        item: { select: { id: true, sku: true, name: true } },
        soldTo: { select: { id: true, displayName: true } },
      },
      orderBy: { warrantyEndDate: 'asc' },
      take: 100,
    });

    return {
      summary: {
        activeWarranties,
        expiringWithin30Days: expiringWarranties,
        claimsByStatus: claims.reduce(
          (acc, c) => {
            acc[c.status] = c._count;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
      serials: serialsWithWarranty.map((s) => ({
        ...s,
        purchaseCost: s.purchaseCost ? Number(s.purchaseCost) : null,
        daysUntilExpiry: s.warrantyEndDate
          ? Math.ceil(
              (s.warrantyEndDate.getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null,
      })),
    };
  }
}
