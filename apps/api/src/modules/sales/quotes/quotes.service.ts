import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TaxService } from '@/modules/tax/tax.service';
import { CreateQuoteDto, DiscountType } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taxService: TaxService,
  ) {}

  async createQuote(organizationId: string, userId: string, dto: CreateQuoteDto) {
    // Validate customer if provided
    if (dto.customerId) {
      const customer = await this.prisma.contact.findFirst({
        where: { id: dto.customerId, organizationId, type: { in: ['CUSTOMER', 'BOTH'] } },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
    }

    // Validate items and collect their details
    const itemsMap = new Map<string, { unit: string }>();
    for (const item of dto.items) {
      const exists = await this.prisma.item.findFirst({
        where: { id: item.itemId, organizationId },
        select: { id: true, unit: true },
      });
      if (!exists) {
        throw new NotFoundException(`Item ${item.itemId} not found`);
      }
      itemsMap.set(item.itemId, { unit: exists.unit });
    }

    // Generate quote number
    const lastQuote = await this.prisma.quote.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { quoteNumber: true },
    });
    const nextNum = lastQuote
      ? parseInt(lastQuote.quoteNumber.split('-')[1]) + 1
      : 1;
    const quoteNumber = `QT-${String(nextNum).padStart(5, '0')}`;

    // Calculate totals with tax
    let subtotal = 0;
    let totalTax = 0;
    const itemsWithTotals = [];
    for (let index = 0; index < dto.items.length; index++) {
      const item = dto.items[index];
      const itemDetails = itemsMap.get(item.itemId)!;
      const lineTotal = item.quantity * item.unitPrice;
      const discountAmount = item.discountPercent
        ? (lineTotal * item.discountPercent) / 100
        : 0;
      const taxableAmount = lineTotal - discountAmount;
      const { taxAmount } = await this.taxService.calculateLineTax(
        organizationId,
        taxableAmount,
        item.taxRateId,
      );
      subtotal += taxableAmount;
      totalTax += taxAmount;

      itemsWithTotals.push({
        itemId: item.itemId,
        description: item.description,
        quantity: item.quantity,
        unit: itemDetails.unit,
        rate: item.unitPrice,
        discountType: 'PERCENTAGE' as const,
        discountValue: item.discountPercent || 0,
        discountAmount,
        taxRateId: item.taxRateId,
        taxAmount,
        amount: taxableAmount + taxAmount,
        sortOrder: index,
      });
    }

    // Quote-level discount
    let quoteDiscountAmount = 0;
    if (dto.discountValue && dto.discountValue > 0) {
      if (dto.discountType === DiscountType.PERCENTAGE) {
        quoteDiscountAmount = (subtotal * dto.discountValue) / 100;
      } else {
        quoteDiscountAmount = dto.discountValue;
      }
    }

    const total = subtotal - quoteDiscountAmount + totalTax;

    return this.prisma.quote.create({
      data: {
        quoteNumber,
        customerId: dto.customerId,
        contactPersonName: dto.contactPersonName,
        quoteDate: dto.quoteDate || new Date(),
        validUntil: dto.validUntil,
        status: 'DRAFT',
        warehouseId: dto.warehouseId,
        salesPersonId: dto.salesPersonId,
        referenceNumber: dto.referenceNumber,
        subtotal,
        discountType: dto.discountType,
        discountValue: dto.discountValue || 0,
        discountAmount: quoteDiscountAmount,
        taxAmount: totalTax,
        total,
        notes: dto.notes,
        termsConditions: dto.termsConditions,
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
      },
    });
  }

  async getQuotes(
    organizationId: string,
    filters: {
      status?: string;
      customerId?: string;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
    }
  ) {
    const { status, customerId, dateFrom, dateTo, page = 1, limit = 25 } = filters;

    const where: any = {
      organizationId,
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(dateFrom || dateTo
        ? {
            quoteDate: {
              ...(dateFrom && { gte: dateFrom }),
              ...(dateTo && { lte: dateTo }),
            },
          }
        : {}),
    };

    const [quotes, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        include: {
          customer: { select: { displayName: true, companyName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.quote.count({ where }),
    ]);

    return {
      data: quotes,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getQuote(id: string, organizationId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        items: {
          include: { item: { select: { sku: true, name: true, unit: true } } },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    return quote;
  }

  async updateQuote(id: string, organizationId: string, dto: UpdateQuoteDto) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, organizationId },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.status !== 'DRAFT') {
      throw new BadRequestException('Only draft quotes can be updated');
    }

    // Recalculate if items changed
    if (dto.items) {
      // Delete existing items and create new ones
      await this.prisma.quoteItem.deleteMany({ where: { quoteId: id } });

      let subtotal = 0;
      let totalTax = 0;
      const itemsWithTotals = dto.items.map((item, index) => {
        const lineTotal = item.quantity * item.unitPrice;
        const discountAmount = item.discountPercent
          ? (lineTotal * item.discountPercent) / 100
          : 0;
        const taxableAmount = lineTotal - discountAmount;
        const taxAmount = 0;
        subtotal += taxableAmount;
        totalTax += taxAmount;

        return {
          quoteId: id,
          itemId: item.itemId,
          description: item.description,
          quantity: item.quantity,
          unit: 'PCS', // Default unit
          rate: item.unitPrice,
          discountType: 'PERCENTAGE' as const,
          discountValue: item.discountPercent || 0,
          discountAmount,
          taxRateId: item.taxRateId,
          taxAmount,
          amount: taxableAmount + taxAmount,
          sortOrder: index,
        };
      });

      let quoteDiscountAmount = 0;
      const discountType = dto.discountType || quote.discountType;
      const discountValue = dto.discountValue ?? Number(quote.discountValue);
      if (discountValue > 0) {
        if (discountType === 'PERCENTAGE') {
          quoteDiscountAmount = (subtotal * discountValue) / 100;
        } else {
          quoteDiscountAmount = discountValue;
        }
      }

      const total = subtotal - quoteDiscountAmount + totalTax;

      await this.prisma.quoteItem.createMany({ data: itemsWithTotals });

      return this.prisma.quote.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          contactPersonName: dto.contactPersonName,
          validUntil: dto.validUntil,
          warehouseId: dto.warehouseId,
          salesPersonId: dto.salesPersonId,
          referenceNumber: dto.referenceNumber,
          subtotal,
          discountType,
          discountValue,
          discountAmount: quoteDiscountAmount,
          taxAmount: totalTax,
          total,
          notes: dto.notes,
          termsConditions: dto.termsConditions,
        },
        include: {
          customer: { select: { displayName: true } },
          items: { include: { item: { select: { sku: true, name: true } } } },
        },
      });
    }

    return this.prisma.quote.update({
      where: { id },
      data: {
        customerId: dto.customerId,
        contactPersonName: dto.contactPersonName,
        validUntil: dto.validUntil,
        warehouseId: dto.warehouseId,
        salesPersonId: dto.salesPersonId,
        referenceNumber: dto.referenceNumber,
        notes: dto.notes,
        termsConditions: dto.termsConditions,
      },
      include: {
        customer: { select: { displayName: true } },
        items: { include: { item: { select: { sku: true, name: true } } } },
      },
    });
  }

  async deleteQuote(id: string, organizationId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, organizationId },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.status !== 'DRAFT') {
      throw new BadRequestException('Only draft quotes can be deleted');
    }

    return this.prisma.quote.delete({
      where: { id },
    });
  }

  async sendQuote(id: string, organizationId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, organizationId },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (!['DRAFT', 'SENT'].includes(quote.status)) {
      throw new BadRequestException('Only draft or previously sent quotes can be sent');
    }

    return this.prisma.quote.update({
      where: { id },
      data: { status: 'SENT' },
      include: {
        customer: { select: { displayName: true } },
        items: { include: { item: { select: { sku: true, name: true } } } },
      },
    });
  }

  async convertToOrder(id: string, organizationId: string, userId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, organizationId },
      include: {
        items: { include: { item: true } },
        customer: true,
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (!['DRAFT', 'SENT', 'ACCEPTED'].includes(quote.status)) {
      throw new BadRequestException('This quote cannot be converted to an order');
    }

    if (quote.status === 'CONVERTED') {
      throw new BadRequestException('This quote has already been converted');
    }

    // Generate sales order number
    const lastOrder = await this.prisma.salesOrder.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { orderNumber: true },
    });
    const nextOrderNum = lastOrder
      ? parseInt(lastOrder.orderNumber.split('-')[1]) + 1
      : 1;
    const orderNumber = `SO-${String(nextOrderNum).padStart(6, '0')}`;

    // Create sales order from quote within a transaction
    return this.prisma.$transaction(async (tx) => {
      // Create the sales order
      const salesOrder = await tx.salesOrder.create({
        data: {
          orderNumber,
          customerId: quote.customerId || '',
          orderDate: new Date(),
          status: 'DRAFT',
          invoiceStatus: 'NOT_INVOICED',
          paymentStatus: 'UNPAID',
          warehouseId: quote.warehouseId,
          salesPersonId: quote.salesPersonId,
          referenceNumber: quote.referenceNumber,
          subtotal: Number(quote.subtotal),
          discountType: quote.discountType,
          discountValue: Number(quote.discountValue),
          discountAmount: Number(quote.discountAmount),
          taxAmount: Number(quote.taxAmount),
          total: Number(quote.total),
          notes: quote.notes,
          termsConditions: quote.termsConditions,
          createdById: userId,
          organizationId,
          items: {
            create: quote.items.map((item) => ({
              itemId: item.itemId,
              description: item.description,
              quantity: Number(item.quantity),
              unit: item.unit,
              rate: Number(item.rate),
              discountType: item.discountType,
              discountValue: Number(item.discountValue),
              discountAmount: Number(item.discountAmount),
              taxRateId: item.taxRateId,
              taxAmount: Number(item.taxAmount),
              amount: Number(item.amount),
              sortOrder: item.sortOrder,
            })),
          },
        },
        include: {
          customer: { select: { displayName: true, companyName: true } },
          items: {
            include: { item: { select: { sku: true, name: true } } },
          },
        },
      });

      // Update quote status
      await tx.quote.update({
        where: { id },
        data: {
          status: 'CONVERTED',
          convertedToOrderId: salesOrder.id,
        },
      });

      return salesOrder;
    });
  }
}
