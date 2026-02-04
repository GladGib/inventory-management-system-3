import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ItemCondition as PrismaItemCondition } from '@prisma/client';
import {
  CreateSalesReturnDto,
  UpdateSalesReturnDto,
  SalesReturnQueryParams,
} from './dto/sales-return.dto';

@Injectable()
export class SalesReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSalesReturn(
    organizationId: string,
    userId: string,
    dto: CreateSalesReturnDto
  ) {
    // Validate customer
    const customer = await this.prisma.contact.findFirst({
      where: { id: dto.customerId, organizationId, type: { in: ['CUSTOMER', 'BOTH'] } },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Validate source document if provided
    if (dto.invoiceId) {
      const invoice = await this.prisma.invoice.findFirst({
        where: { id: dto.invoiceId, organizationId, customerId: dto.customerId },
      });
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
    }

    if (dto.salesOrderId) {
      const salesOrder = await this.prisma.salesOrder.findFirst({
        where: { id: dto.salesOrderId, organizationId, customerId: dto.customerId },
      });
      if (!salesOrder) {
        throw new NotFoundException('Sales order not found');
      }
    }

    // Validate items
    for (const item of dto.items) {
      const exists = await this.prisma.item.findFirst({
        where: { id: item.itemId, organizationId },
      });
      if (!exists) {
        throw new NotFoundException(`Item ${item.itemId} not found`);
      }
    }

    // Generate return number
    const lastReturn = await this.prisma.salesReturn.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { returnNumber: true },
    });
    const nextNum = lastReturn
      ? parseInt(lastReturn.returnNumber.split('-')[1]) + 1
      : 1;
    const returnNumber = `RET-${String(nextNum).padStart(6, '0')}`;

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    const itemsWithTotals = dto.items.map((item) => {
      const lineTotal = Number(item.quantity) * Number(item.unitPrice);
      const taxAmount = item.taxAmount || 0;
      subtotal += lineTotal;
      totalTax += taxAmount;

      return {
        item: { connect: { id: item.itemId } },
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxAmount,
        total: lineTotal + taxAmount,
        condition: (item.condition || 'GOOD') as PrismaItemCondition,
      };
    });

    const total = subtotal + totalTax;

    return this.prisma.salesReturn.create({
      data: {
        returnNumber,
        customerId: dto.customerId,
        invoiceId: dto.invoiceId,
        salesOrderId: dto.salesOrderId,
        returnDate: dto.returnDate || new Date(),
        reason: dto.reason,
        notes: dto.notes,
        warehouseId: dto.warehouseId,
        restockItems: dto.restockItems ?? true,
        subtotal,
        taxAmount: totalTax,
        total,
        status: 'PENDING',
        createdById: userId,
        organizationId,
        items: {
          create: itemsWithTotals,
        },
      },
      include: {
        customer: { select: { displayName: true, companyName: true } },
        items: {
          include: { item: { select: { sku: true, name: true } } },
        },
        warehouse: { select: { name: true } },
      },
    });
  }

  async getSalesReturns(
    organizationId: string,
    filters: SalesReturnQueryParams
  ) {
    const { status, customerId, fromDate, toDate, page = 1, limit = 25 } = filters;

    const where: any = {
      organizationId,
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(fromDate || toDate
        ? {
            returnDate: {
              ...(fromDate && { gte: new Date(fromDate) }),
              ...(toDate && { lte: new Date(toDate) }),
            },
          }
        : {}),
    };

    const [returns, total] = await Promise.all([
      this.prisma.salesReturn.findMany({
        where,
        include: {
          customer: { select: { displayName: true, companyName: true } },
          invoice: { select: { invoiceNumber: true } },
          salesOrder: { select: { orderNumber: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.salesReturn.count({ where }),
    ]);

    return {
      data: returns,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getSalesReturn(id: string, organizationId: string) {
    const salesReturn = await this.prisma.salesReturn.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        invoice: { select: { id: true, invoiceNumber: true, total: true } },
        salesOrder: { select: { id: true, orderNumber: true, total: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        items: {
          include: { item: { select: { id: true, sku: true, name: true, unit: true } } },
        },
        creditNote: { select: { id: true, creditNumber: true, total: true } },
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        receivedBy: { select: { name: true } },
      },
    });

    if (!salesReturn) {
      throw new NotFoundException('Sales return not found');
    }

    return salesReturn;
  }

  async updateSalesReturn(
    id: string,
    organizationId: string,
    dto: UpdateSalesReturnDto
  ) {
    const salesReturn = await this.prisma.salesReturn.findFirst({
      where: { id, organizationId },
    });

    if (!salesReturn) {
      throw new NotFoundException('Sales return not found');
    }

    if (salesReturn.status !== 'PENDING') {
      throw new BadRequestException('Only pending returns can be updated');
    }

    // If items are being updated, recalculate totals
    if (dto.items) {
      await this.prisma.salesReturnItem.deleteMany({ where: { salesReturnId: id } });

      let subtotal = 0;
      let totalTax = 0;
      const itemsWithTotals = dto.items.map((item) => {
        const lineTotal = Number(item.quantity) * Number(item.unitPrice);
        const taxAmount = item.taxAmount || 0;
        subtotal += lineTotal;
        totalTax += taxAmount;

        return {
          salesReturnId: id,
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxAmount,
          total: lineTotal + taxAmount,
          condition: (item.condition || 'GOOD') as PrismaItemCondition,
        };
      });

      await this.prisma.salesReturnItem.createMany({ data: itemsWithTotals });

      return this.prisma.salesReturn.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          invoiceId: dto.invoiceId,
          salesOrderId: dto.salesOrderId,
          reason: dto.reason,
          notes: dto.notes,
          warehouseId: dto.warehouseId,
          restockItems: dto.restockItems,
          subtotal,
          taxAmount: totalTax,
          total: subtotal + totalTax,
        },
        include: {
          customer: { select: { displayName: true } },
          items: { include: { item: { select: { sku: true, name: true } } } },
        },
      });
    }

    return this.prisma.salesReturn.update({
      where: { id },
      data: {
        reason: dto.reason,
        notes: dto.notes,
        warehouseId: dto.warehouseId,
        restockItems: dto.restockItems,
      },
      include: {
        customer: { select: { displayName: true } },
        items: { include: { item: { select: { sku: true, name: true } } } },
      },
    });
  }

  async approveSalesReturn(id: string, organizationId: string, userId: string) {
    const salesReturn = await this.prisma.salesReturn.findFirst({
      where: { id, organizationId },
    });

    if (!salesReturn) {
      throw new NotFoundException('Sales return not found');
    }

    if (salesReturn.status !== 'PENDING') {
      throw new BadRequestException('Only pending returns can be approved');
    }

    return this.prisma.salesReturn.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: userId,
        approvedAt: new Date(),
      },
      include: {
        customer: { select: { displayName: true } },
        items: { include: { item: { select: { sku: true, name: true } } } },
      },
    });
  }

  async receiveSalesReturn(id: string, organizationId: string, userId: string) {
    const salesReturn = await this.prisma.salesReturn.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });

    if (!salesReturn) {
      throw new NotFoundException('Sales return not found');
    }

    if (salesReturn.status !== 'APPROVED') {
      throw new BadRequestException('Only approved returns can be received');
    }

    // Restore stock if restockItems is true and warehouse is set
    if (salesReturn.restockItems && salesReturn.warehouseId) {
      await this.prisma.$transaction(async (tx) => {
        for (const item of salesReturn.items) {
          if (item.condition === 'GOOD') {
            // Restore stock for good condition items
            await tx.stockLevel.upsert({
              where: {
                itemId_warehouseId: {
                  itemId: item.itemId,
                  warehouseId: salesReturn.warehouseId!,
                },
              },
              update: {
                stockOnHand: { increment: Number(item.quantity) },
              },
              create: {
                itemId: item.itemId,
                warehouseId: salesReturn.warehouseId!,
                stockOnHand: Number(item.quantity),
              },
            });

            // Mark item as restocked
            await tx.salesReturnItem.update({
              where: { id: item.id },
              data: { restocked: true },
            });
          }
        }
      });
    }

    return this.prisma.salesReturn.update({
      where: { id },
      data: {
        status: 'RECEIVED',
        receivedById: userId,
        receivedAt: new Date(),
      },
      include: {
        customer: { select: { displayName: true } },
        items: { include: { item: { select: { sku: true, name: true } } } },
      },
    });
  }

  async processSalesReturn(id: string, organizationId: string, userId: string) {
    const salesReturn = await this.prisma.salesReturn.findFirst({
      where: { id, organizationId },
      include: {
        items: { include: { item: true } },
        customer: true,
      },
    });

    if (!salesReturn) {
      throw new NotFoundException('Sales return not found');
    }

    if (salesReturn.status !== 'RECEIVED') {
      throw new BadRequestException('Only received returns can be processed');
    }

    // Generate credit note number
    const lastCreditNote = await this.prisma.creditNote.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { creditNumber: true },
    });
    const nextNum = lastCreditNote
      ? parseInt(lastCreditNote.creditNumber.split('-')[1]) + 1
      : 1;
    const creditNumber = `CN-${String(nextNum).padStart(6, '0')}`;

    // Create credit note from return
    return this.prisma.$transaction(async (tx) => {
      const creditNote = await tx.creditNote.create({
        data: {
          creditNumber,
          customerId: salesReturn.customerId,
          creditDate: new Date(),
          salesReturnId: salesReturn.id,
          subtotal: salesReturn.subtotal,
          taxAmount: salesReturn.taxAmount,
          total: salesReturn.total,
          balance: salesReturn.total,
          status: 'OPEN',
          notes: `Credit note generated from sales return ${salesReturn.returnNumber}`,
          createdById: userId,
          organizationId,
          items: {
            create: salesReturn.items.map((item) => ({
              description: item.item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxAmount: item.taxAmount,
              total: item.total,
            })),
          },
        },
      });

      // Update sales return
      await tx.salesReturn.update({
        where: { id },
        data: {
          status: 'PROCESSED',
          creditNoteId: creditNote.id,
        },
      });

      return tx.salesReturn.findFirst({
        where: { id },
        include: {
          customer: { select: { displayName: true } },
          items: { include: { item: { select: { sku: true, name: true } } } },
          creditNote: { select: { id: true, creditNumber: true, total: true } },
        },
      });
    });
  }

  async rejectSalesReturn(id: string, organizationId: string, userId: string) {
    const salesReturn = await this.prisma.salesReturn.findFirst({
      where: { id, organizationId },
    });

    if (!salesReturn) {
      throw new NotFoundException('Sales return not found');
    }

    if (['PROCESSED', 'REJECTED'].includes(salesReturn.status)) {
      throw new BadRequestException('Cannot reject this return');
    }

    return this.prisma.salesReturn.update({
      where: { id },
      data: { status: 'REJECTED' },
      include: {
        customer: { select: { displayName: true } },
        items: { include: { item: { select: { sku: true, name: true } } } },
      },
    });
  }

  // Credit Note methods
  async getCreditNotes(
    organizationId: string,
    filters: { status?: string; customerId?: string; page?: number; limit?: number }
  ) {
    const { status, customerId, page = 1, limit = 25 } = filters;

    const where: any = {
      organizationId,
      ...(status && { status }),
      ...(customerId && { customerId }),
    };

    const [creditNotes, total] = await Promise.all([
      this.prisma.creditNote.findMany({
        where,
        include: {
          customer: { select: { displayName: true, companyName: true } },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.creditNote.count({ where }),
    ]);

    return {
      data: creditNotes,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getCreditNote(id: string, organizationId: string) {
    const creditNote = await this.prisma.creditNote.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        items: true,
        applications: {
          include: { invoice: { select: { invoiceNumber: true, total: true } } },
        },
        salesReturns: { select: { returnNumber: true } },
        createdBy: { select: { name: true } },
      },
    });

    if (!creditNote) {
      throw new NotFoundException('Credit note not found');
    }

    return creditNote;
  }

  async applyCreditNote(
    id: string,
    organizationId: string,
    userId: string,
    applications: { invoiceId: string; amount: number }[]
  ) {
    const creditNote = await this.prisma.creditNote.findFirst({
      where: { id, organizationId },
    });

    if (!creditNote) {
      throw new NotFoundException('Credit note not found');
    }

    if (creditNote.status === 'FULLY_APPLIED' || creditNote.status === 'VOID') {
      throw new BadRequestException('Cannot apply this credit note');
    }

    // Validate applications
    let totalApplied = 0;
    for (const app of applications) {
      const invoice = await this.prisma.invoice.findFirst({
        where: {
          id: app.invoiceId,
          organizationId,
          customerId: creditNote.customerId,
        },
      });

      if (!invoice) {
        throw new NotFoundException(`Invoice ${app.invoiceId} not found`);
      }

      if (app.amount > Number(invoice.balance)) {
        throw new BadRequestException('Application amount exceeds invoice balance');
      }

      totalApplied += app.amount;
    }

    if (totalApplied > Number(creditNote.balance)) {
      throw new BadRequestException('Total applications exceed credit note balance');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const app of applications) {
        // Create application
        await tx.creditNoteApplication.create({
          data: {
            creditNoteId: id,
            invoiceId: app.invoiceId,
            amount: app.amount,
            createdById: userId,
          },
        });

        // Update invoice
        const invoice = await tx.invoice.findUnique({ where: { id: app.invoiceId } });
        const newAmountPaid = Number(invoice!.amountPaid) + app.amount;
        const newBalance = Number(invoice!.total) - newAmountPaid;
        const newStatus =
          newBalance <= 0
            ? 'PAID'
            : newAmountPaid > 0
            ? 'PARTIALLY_PAID'
            : invoice!.status;

        await tx.invoice.update({
          where: { id: app.invoiceId },
          data: {
            amountPaid: newAmountPaid,
            balance: newBalance,
            status: newStatus,
          },
        });
      }

      // Update credit note
      const newBalance = Number(creditNote.balance) - totalApplied;
      const newStatus =
        newBalance <= 0
          ? 'FULLY_APPLIED'
          : totalApplied > 0
          ? 'PARTIALLY_APPLIED'
          : creditNote.status;

      return tx.creditNote.update({
        where: { id },
        data: { balance: newBalance, status: newStatus },
        include: {
          customer: { select: { displayName: true } },
          applications: {
            include: { invoice: { select: { invoiceNumber: true } } },
          },
        },
      });
    });
  }
}
