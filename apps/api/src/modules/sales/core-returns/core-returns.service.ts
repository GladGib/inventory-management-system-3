import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateCoreReturnDto,
  UpdateCoreReturnDto,
  CoreReturnQueryParams,
} from './dto/core-return.dto';

@Injectable()
export class CoreReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate the next core return number (CR-00001, CR-00002, etc.)
   */
  private async generateReturnNumber(organizationId: string): Promise<string> {
    const lastReturn = await this.prisma.coreReturn.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { returnNumber: true },
    });

    const nextNum = lastReturn
      ? parseInt(lastReturn.returnNumber.split('-')[1]) + 1
      : 1;
    return `CR-${String(nextNum).padStart(5, '0')}`;
  }

  /**
   * Create a core return record.
   * Typically auto-created when selling a core item, but can also be created manually.
   */
  async createCoreReturn(
    organizationId: string,
    userId: string,
    dto: CreateCoreReturnDto,
  ) {
    // Validate customer
    const customer = await this.prisma.contact.findFirst({
      where: {
        id: dto.customerId,
        organizationId,
        type: { in: ['CUSTOMER', 'BOTH'] },
      },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Validate item and check it has core
    const item = await this.prisma.item.findFirst({
      where: { id: dto.itemId, organizationId },
    });
    if (!item) {
      throw new NotFoundException('Item not found');
    }

    // Validate sales order if provided
    if (dto.salesOrderId) {
      const order = await this.prisma.salesOrder.findFirst({
        where: {
          id: dto.salesOrderId,
          organizationId,
          customerId: dto.customerId,
        },
      });
      if (!order) {
        throw new NotFoundException('Sales order not found');
      }
    }

    // Validate invoice if provided
    if (dto.invoiceId) {
      const invoice = await this.prisma.invoice.findFirst({
        where: {
          id: dto.invoiceId,
          organizationId,
          customerId: dto.customerId,
        },
      });
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
    }

    const returnNumber = await this.generateReturnNumber(organizationId);

    // Default due date: 30 days from now
    const dueDate = dto.dueDate
      ? new Date(dto.dueDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return this.prisma.coreReturn.create({
      data: {
        returnNumber,
        customerId: dto.customerId,
        itemId: dto.itemId,
        salesOrderId: dto.salesOrderId,
        invoiceId: dto.invoiceId,
        coreCharge: dto.coreCharge,
        dueDate,
        status: 'PENDING',
        notes: dto.notes,
        organizationId,
        createdById: userId,
      },
      include: {
        customer: {
          select: { displayName: true, companyName: true },
        },
        item: {
          select: {
            id: true,
            sku: true,
            name: true,
            hasCore: true,
            coreCharge: true,
          },
        },
      },
    });
  }

  /**
   * List core returns with filtering and pagination
   */
  async getCoreReturns(
    organizationId: string,
    filters: CoreReturnQueryParams,
  ) {
    const {
      status,
      customerId,
      fromDate,
      toDate,
      overdue,
      page = 1,
      limit = 25,
    } = filters;

    const where: any = {
      organizationId,
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate && { gte: new Date(fromDate) }),
              ...(toDate && { lte: new Date(toDate) }),
            },
          }
        : {}),
      ...(overdue === 'true'
        ? {
            status: 'PENDING',
            dueDate: { lt: new Date() },
          }
        : {}),
    };

    const [coreReturns, total] = await Promise.all([
      this.prisma.coreReturn.findMany({
        where,
        include: {
          customer: {
            select: { displayName: true, companyName: true },
          },
          item: {
            select: { id: true, sku: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.coreReturn.count({ where }),
    ]);

    return {
      data: coreReturns,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single core return by ID
   */
  async getCoreReturn(id: string, organizationId: string) {
    const coreReturn = await this.prisma.coreReturn.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        item: {
          select: {
            id: true,
            sku: true,
            name: true,
            hasCore: true,
            coreCharge: true,
            unit: true,
          },
        },
      },
    });

    if (!coreReturn) {
      throw new NotFoundException('Core return not found');
    }

    return coreReturn;
  }

  /**
   * Mark a core return as RECEIVED (customer returned the core part)
   */
  async receiveCoreReturn(
    id: string,
    organizationId: string,
    userId: string,
    notes?: string,
  ) {
    const coreReturn = await this.prisma.coreReturn.findFirst({
      where: { id, organizationId },
    });

    if (!coreReturn) {
      throw new NotFoundException('Core return not found');
    }

    if (coreReturn.status !== 'PENDING') {
      throw new BadRequestException(
        'Only pending core returns can be marked as received',
      );
    }

    return this.prisma.coreReturn.update({
      where: { id },
      data: {
        status: 'RECEIVED',
        returnDate: new Date(),
        ...(notes && {
          notes: coreReturn.notes
            ? `${coreReturn.notes}\n---\nReceived: ${notes}`
            : `Received: ${notes}`,
        }),
      },
      include: {
        customer: {
          select: { displayName: true, companyName: true },
        },
        item: {
          select: { id: true, sku: true, name: true },
        },
      },
    });
  }

  /**
   * Issue credit to customer for the returned core (mark as CREDITED)
   */
  async creditCoreReturn(
    id: string,
    organizationId: string,
    userId: string,
    notes?: string,
  ) {
    const coreReturn = await this.prisma.coreReturn.findFirst({
      where: { id, organizationId },
    });

    if (!coreReturn) {
      throw new NotFoundException('Core return not found');
    }

    if (coreReturn.status !== 'RECEIVED') {
      throw new BadRequestException(
        'Only received core returns can be credited',
      );
    }

    return this.prisma.coreReturn.update({
      where: { id },
      data: {
        status: 'CREDITED',
        ...(notes && {
          notes: coreReturn.notes
            ? `${coreReturn.notes}\n---\nCredited: ${notes}`
            : `Credited: ${notes}`,
        }),
      },
      include: {
        customer: {
          select: { displayName: true, companyName: true },
        },
        item: {
          select: { id: true, sku: true, name: true },
        },
      },
    });
  }

  /**
   * Reject the returned core (mark as REJECTED)
   */
  async rejectCoreReturn(
    id: string,
    organizationId: string,
    userId: string,
    notes?: string,
  ) {
    const coreReturn = await this.prisma.coreReturn.findFirst({
      where: { id, organizationId },
    });

    if (!coreReturn) {
      throw new NotFoundException('Core return not found');
    }

    if (['CREDITED', 'REJECTED'].includes(coreReturn.status)) {
      throw new BadRequestException('Cannot reject this core return');
    }

    return this.prisma.coreReturn.update({
      where: { id },
      data: {
        status: 'REJECTED',
        ...(notes && {
          notes: coreReturn.notes
            ? `${coreReturn.notes}\n---\nRejected: ${notes}`
            : `Rejected: ${notes}`,
        }),
      },
      include: {
        customer: {
          select: { displayName: true, companyName: true },
        },
        item: {
          select: { id: true, sku: true, name: true },
        },
      },
    });
  }

  /**
   * Get pending core returns for a specific customer
   */
  async getCustomerPendingCoreReturns(
    customerId: string,
    organizationId: string,
  ) {
    return this.prisma.coreReturn.findMany({
      where: {
        customerId,
        organizationId,
        status: 'PENDING',
      },
      include: {
        item: {
          select: { id: true, sku: true, name: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Get overdue core returns count for dashboard
   */
  async getOverdueCoreReturnsCount(organizationId: string) {
    return this.prisma.coreReturn.count({
      where: {
        organizationId,
        status: 'PENDING',
        dueDate: { lt: new Date() },
      },
    });
  }
}
