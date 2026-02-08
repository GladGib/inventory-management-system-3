import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfirmPurchaseOrderDto } from './dto/confirm-po.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery.dto';

@Injectable()
export class VendorPortalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve portalUserId to contactId and organizationId.
   * Used internally by all portal methods.
   */
  private async resolvePortalUser(portalUserId: string) {
    const portalUser = await this.prisma.portalUser.findUnique({
      where: { id: portalUserId },
      select: {
        contactId: true,
        organizationId: true,
        isActive: true,
      },
    });

    if (!portalUser || !portalUser.isActive) {
      throw new ForbiddenException('Portal user not found or inactive');
    }

    return portalUser;
  }

  /**
   * Verify that a purchase order belongs to the vendor's contact
   */
  private async verifyPOAccess(
    poId: string,
    contactId: string,
    organizationId: string,
  ) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: {
        id: poId,
        vendorId: contactId,
        organizationId,
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    return po;
  }

  // ============ Purchase Orders ============

  async getMyPurchaseOrders(
    portalUserId: string,
    params?: {
      status?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const portalUser = await this.resolvePortalUser(portalUserId);
    const page = params?.page || 1;
    const limit = params?.limit || 25;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      vendorId: portalUser.contactId,
      organizationId: portalUser.organizationId,
    };

    if (params?.status) {
      where.status = params.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          items: {
            include: {
              item: {
                select: { id: true, sku: true, name: true, unit: true },
              },
            },
          },
          warehouse: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPurchaseOrderDetail(portalUserId: string, poId: string) {
    const portalUser = await this.resolvePortalUser(portalUserId);

    const po = await this.prisma.purchaseOrder.findFirst({
      where: {
        id: poId,
        vendorId: portalUser.contactId,
        organizationId: portalUser.organizationId,
      },
      include: {
        items: {
          include: {
            item: {
              select: { id: true, sku: true, name: true, unit: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        vendor: {
          select: {
            id: true,
            displayName: true,
            companyName: true,
            email: true,
          },
        },
        warehouse: {
          select: { id: true, name: true },
        },
        organization: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    return po;
  }

  async confirmPurchaseOrder(
    portalUserId: string,
    poId: string,
    dto: ConfirmPurchaseOrderDto,
  ) {
    const portalUser = await this.resolvePortalUser(portalUserId);
    const po = await this.verifyPOAccess(
      poId,
      portalUser.contactId,
      portalUser.organizationId,
    );

    // Only ISSUED POs can be confirmed by vendor
    if (po.status !== 'ISSUED') {
      throw new BadRequestException(
        `Cannot confirm purchase order with status "${po.status}". Only ISSUED orders can be confirmed.`,
      );
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        expectedDate: new Date(dto.confirmedDate),
        notes: dto.notes
          ? `${po.notes ? po.notes + '\n' : ''}[Vendor Confirmed ${new Date().toISOString()}]: ${dto.notes}`
          : po.notes,
        referenceNumber: po.referenceNumber || undefined,
      },
      include: {
        items: {
          include: {
            item: {
              select: { id: true, sku: true, name: true, unit: true },
            },
          },
        },
        vendor: {
          select: {
            id: true,
            displayName: true,
            companyName: true,
            email: true,
          },
        },
      },
    });

    return updated;
  }

  async updateDeliveryStatus(
    portalUserId: string,
    poId: string,
    dto: UpdateDeliveryStatusDto,
  ) {
    const portalUser = await this.resolvePortalUser(portalUserId);
    const po = await this.verifyPOAccess(
      poId,
      portalUser.contactId,
      portalUser.organizationId,
    );

    // Only active POs can have delivery updated
    if (['CANCELLED', 'CLOSED'].includes(po.status)) {
      throw new BadRequestException(
        `Cannot update delivery for purchase order with status "${po.status}".`,
      );
    }

    const deliveryNote = [
      `[Delivery Update ${new Date().toISOString()}]`,
      `Expected: ${dto.expectedDeliveryDate}`,
      dto.trackingNumber ? `Tracking: ${dto.trackingNumber}` : null,
      dto.notes ? `Notes: ${dto.notes}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    const updated = await this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        expectedDate: new Date(dto.expectedDeliveryDate),
        notes: po.notes ? `${po.notes}\n${deliveryNote}` : deliveryNote,
      },
      include: {
        items: {
          include: {
            item: {
              select: { id: true, sku: true, name: true, unit: true },
            },
          },
        },
      },
    });

    return updated;
  }

  // ============ Bills ============

  async getMyBills(
    portalUserId: string,
    params?: {
      status?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const portalUser = await this.resolvePortalUser(portalUserId);
    const page = params?.page || 1;
    const limit = params?.limit || 25;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      vendorId: portalUser.contactId,
      organizationId: portalUser.organizationId,
    };

    if (params?.status) {
      where.status = params.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.bill.findMany({
        where,
        include: {
          purchaseOrder: {
            select: { id: true, orderNumber: true },
          },
          items: {
            include: {
              item: {
                select: { id: true, sku: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.bill.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBillDetail(portalUserId: string, billId: string) {
    const portalUser = await this.resolvePortalUser(portalUserId);

    const bill = await this.prisma.bill.findFirst({
      where: {
        id: billId,
        vendorId: portalUser.contactId,
        organizationId: portalUser.organizationId,
      },
      include: {
        purchaseOrder: {
          select: { id: true, orderNumber: true },
        },
        vendor: {
          select: {
            id: true,
            displayName: true,
            companyName: true,
            email: true,
          },
        },
        items: {
          include: {
            item: {
              select: { id: true, sku: true, name: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        paymentAllocations: {
          include: {
            vendorPayment: {
              select: {
                id: true,
                paymentNumber: true,
                paymentDate: true,
                paymentMethod: true,
              },
            },
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    return bill;
  }

  // ============ Payments ============

  async getMyPayments(
    portalUserId: string,
    params?: {
      page?: number;
      limit?: number;
    },
  ) {
    const portalUser = await this.resolvePortalUser(portalUserId);
    const page = params?.page || 1;
    const limit = params?.limit || 25;
    const skip = (page - 1) * limit;

    const where = {
      vendorId: portalUser.contactId,
      organizationId: portalUser.organizationId,
    };

    const [data, total] = await Promise.all([
      this.prisma.vendorPayment.findMany({
        where,
        include: {
          allocations: {
            include: {
              bill: {
                select: { id: true, billNumber: true, total: true },
              },
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.vendorPayment.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============ Dashboard Summary ============

  async getDashboardSummary(portalUserId: string) {
    const portalUser = await this.resolvePortalUser(portalUserId);
    const contactId = portalUser.contactId;
    const organizationId = portalUser.organizationId;

    const [
      pendingPOs,
      totalPOs,
      openBills,
      totalBillsAmount,
      totalPaidAmount,
      recentPayments,
    ] = await Promise.all([
      // POs with ISSUED status (pending vendor confirmation)
      this.prisma.purchaseOrder.findMany({
        where: {
          vendorId: contactId,
          organizationId,
          status: 'ISSUED',
        },
        include: {
          items: {
            include: {
              item: {
                select: { id: true, sku: true, name: true, unit: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Total active POs
      this.prisma.purchaseOrder.count({
        where: {
          vendorId: contactId,
          organizationId,
          status: { notIn: ['CANCELLED', 'CLOSED'] },
        },
      }),

      // Open (unpaid) bills
      this.prisma.bill.findMany({
        where: {
          vendorId: contactId,
          organizationId,
          status: { in: ['RECEIVED', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
        include: {
          purchaseOrder: {
            select: { id: true, orderNumber: true },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),

      // Total bills amount
      this.prisma.bill.aggregate({
        where: {
          vendorId: contactId,
          organizationId,
        },
        _sum: { total: true },
      }),

      // Total paid amount
      this.prisma.vendorPayment.aggregate({
        where: {
          vendorId: contactId,
          organizationId,
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),

      // Recent payments
      this.prisma.vendorPayment.findMany({
        where: {
          vendorId: contactId,
          organizationId,
        },
        include: {
          allocations: {
            include: {
              bill: {
                select: { id: true, billNumber: true },
              },
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
        take: 5,
      }),
    ]);

    return {
      pendingPOs,
      totalActivePOs: totalPOs,
      openBills,
      totalBilledAmount: totalBillsAmount._sum.total || 0,
      totalPaidAmount: totalPaidAmount._sum.amount || 0,
      recentPayments,
    };
  }
}
