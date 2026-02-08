import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfService, SalesOrderPdfData, InvoicePdfData } from '@/modules/common/pdf';
import { DocumentLocale } from '@/common/i18n/document-translations';
import { CreateSalesOrderDto, UpdateSalesOrderDto, DiscountType } from './dto/create-sales-order.dto';
import { CreateInvoiceDto, CreateInvoiceFromOrderDto } from './dto/create-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
  ) {}

  // ============ Sales Orders ============

  async createSalesOrder(organizationId: string, userId: string, dto: CreateSalesOrderDto) {
    // Validate customer
    const customer = await this.prisma.contact.findFirst({
      where: { id: dto.customerId, organizationId, type: { in: ['CUSTOMER', 'BOTH'] } },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
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

    // Generate order number
    const lastOrder = await this.prisma.salesOrder.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { orderNumber: true },
    });
    const nextNum = lastOrder
      ? parseInt(lastOrder.orderNumber.split('-')[1]) + 1
      : 1;
    const orderNumber = `SO-${String(nextNum).padStart(6, '0')}`;

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    const itemsWithTotals = dto.items.map((item, index) => {
      const lineTotal = item.quantity * item.unitPrice;
      const discountAmount = item.discountPercent
        ? (lineTotal * item.discountPercent) / 100
        : 0;
      const taxableAmount = lineTotal - discountAmount;
      // TODO: Get tax rate from taxRateId
      const taxAmount = 0; // Placeholder
      subtotal += taxableAmount;
      totalTax += taxAmount;

      return {
        itemId: item.itemId,
        description: item.description,
        quantity: item.quantity,
        unit: 'PCS', // Default unit, should come from item
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

    // Order-level discount
    let orderDiscountAmount = 0;
    if (dto.discountValue && dto.discountValue > 0) {
      if (dto.discountType === DiscountType.PERCENTAGE) {
        orderDiscountAmount = (subtotal * dto.discountValue) / 100;
      } else {
        orderDiscountAmount = dto.discountValue;
      }
    }

    const shippingCharges = dto.shippingCharges || 0;
    const total = subtotal - orderDiscountAmount + totalTax + shippingCharges;

    return this.prisma.salesOrder.create({
      data: {
        orderNumber,
        customerId: dto.customerId,
        orderDate: dto.orderDate || new Date(),
        expectedShipDate: dto.expectedShipDate,
        status: 'DRAFT',
        invoiceStatus: 'NOT_INVOICED',
        paymentStatus: 'UNPAID',
        warehouseId: dto.warehouseId,
        salesPersonId: dto.salesPersonId,
        shippingAddress: dto.shippingAddress,
        billingAddress: dto.billingAddress,
        subtotal,
        discountType: dto.discountType,
        discountValue: dto.discountValue || 0,
        discountAmount: orderDiscountAmount,
        taxAmount: totalTax,
        shippingCharges,
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

  async getSalesOrders(
    organizationId: string,
    filters: {
      status?: string;
      customerId?: string;
      fromDate?: Date;
      toDate?: Date;
      page?: number;
      limit?: number;
    }
  ) {
    const { status, customerId, fromDate, toDate, page = 1, limit = 25 } = filters;

    const where: any = {
      organizationId,
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(fromDate || toDate
        ? {
            orderDate: {
              ...(fromDate && { gte: fromDate }),
              ...(toDate && { lte: toDate }),
            },
          }
        : {}),
    };

    const [orders, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        include: {
          customer: { select: { displayName: true, companyName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    return {
      data: orders,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getSalesOrder(id: string, organizationId: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        items: {
          include: { item: { select: { sku: true, name: true, unit: true } } },
        },
        warehouse: { select: { name: true, code: true } },
        createdBy: { select: { name: true } },
        invoices: { select: { id: true, invoiceNumber: true, status: true, total: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Sales order not found');
    }

    return order;
  }

  async updateSalesOrder(id: string, organizationId: string, dto: UpdateSalesOrderDto) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, organizationId },
    });

    if (!order) {
      throw new NotFoundException('Sales order not found');
    }

    if (order.status !== 'DRAFT') {
      throw new BadRequestException('Only draft orders can be updated');
    }

    // Recalculate if items changed
    if (dto.items) {
      // Delete existing items and create new ones
      await this.prisma.salesOrderItem.deleteMany({ where: { salesOrderId: id } });

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
          salesOrderId: id,
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

      let orderDiscountAmount = 0;
      const discountType = dto.discountType || order.discountType;
      const discountValue = dto.discountValue ?? Number(order.discountValue);
      if (discountValue > 0) {
        if (discountType === 'PERCENTAGE') {
          orderDiscountAmount = (subtotal * discountValue) / 100;
        } else {
          orderDiscountAmount = discountValue;
        }
      }

      const shippingCharges = dto.shippingCharges ?? Number(order.shippingCharges);
      const total = subtotal - orderDiscountAmount + totalTax + shippingCharges;

      await this.prisma.salesOrderItem.createMany({ data: itemsWithTotals });

      return this.prisma.salesOrder.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          expectedShipDate: dto.expectedShipDate,
          warehouseId: dto.warehouseId,
          salesPersonId: dto.salesPersonId,
          shippingAddress: dto.shippingAddress,
          billingAddress: dto.billingAddress,
          subtotal,
          discountType,
          discountValue,
          discountAmount: orderDiscountAmount,
          taxAmount: totalTax,
          shippingCharges,
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

    return this.prisma.salesOrder.update({
      where: { id },
      data: {
        customerId: dto.customerId,
        expectedShipDate: dto.expectedShipDate,
        warehouseId: dto.warehouseId,
        salesPersonId: dto.salesPersonId,
        shippingAddress: dto.shippingAddress,
        billingAddress: dto.billingAddress,
        notes: dto.notes,
        termsConditions: dto.termsConditions,
      },
      include: {
        customer: { select: { displayName: true } },
        items: { include: { item: { select: { sku: true, name: true } } } },
      },
    });
  }

  async confirmSalesOrder(id: string, organizationId: string, userId: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Sales order not found');
    }

    if (order.status !== 'DRAFT') {
      throw new BadRequestException('Only draft orders can be confirmed');
    }

    // Check stock availability and commit
    if (order.warehouseId) {
      for (const item of order.items) {
        const stockLevel = await this.prisma.stockLevel.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: item.itemId,
              warehouseId: order.warehouseId,
            },
          },
        });

        const available = stockLevel
          ? Number(stockLevel.stockOnHand) - Number(stockLevel.committedStock)
          : 0;

        if (available < Number(item.quantity)) {
          throw new BadRequestException(`Insufficient stock for item ${item.itemId}`);
        }
      }

      // Commit stock
      await this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.stockLevel.update({
            where: {
              itemId_warehouseId: {
                itemId: item.itemId,
                warehouseId: order.warehouseId!,
              },
            },
            data: {
              committedStock: { increment: Number(item.quantity) },
            },
          });
        }
      });
    }

    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: 'CONFIRMED' },
      include: {
        customer: { select: { displayName: true } },
        items: { include: { item: { select: { sku: true, name: true } } } },
      },
    });
  }

  async shipSalesOrder(id: string, organizationId: string, userId: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Sales order not found');
    }

    if (!['CONFIRMED', 'PACKED'].includes(order.status)) {
      throw new BadRequestException('Order must be confirmed or packed to ship');
    }

    // Reduce stock on shipment
    if (order.warehouseId) {
      await this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.stockLevel.update({
            where: {
              itemId_warehouseId: {
                itemId: item.itemId,
                warehouseId: order.warehouseId!,
              },
            },
            data: {
              stockOnHand: { decrement: Number(item.quantity) },
              committedStock: { decrement: Number(item.quantity) },
            },
          });

          // Update shipped qty on order item
          await tx.salesOrderItem.update({
            where: { id: item.id },
            data: { shippedQty: Number(item.quantity) },
          });
        }
      });
    }

    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: 'SHIPPED', shippedDate: new Date() },
      include: {
        customer: { select: { displayName: true } },
        items: { include: { item: { select: { sku: true, name: true } } } },
      },
    });
  }

  async cancelSalesOrder(id: string, organizationId: string, userId: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Sales order not found');
    }

    if (['DELIVERED', 'CLOSED', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException('Cannot cancel this order');
    }

    // Release committed stock if confirmed but not shipped
    if (order.status === 'CONFIRMED' && order.warehouseId) {
      await this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.stockLevel.update({
            where: {
              itemId_warehouseId: {
                itemId: item.itemId,
                warehouseId: order.warehouseId!,
              },
            },
            data: {
              committedStock: { decrement: Number(item.quantity) },
            },
          });
        }
      });
    }

    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // ============ Invoices ============

  async createInvoice(organizationId: string, userId: string, dto: CreateInvoiceDto) {
    // Validate customer
    const customer = await this.prisma.contact.findFirst({
      where: { id: dto.customerId, organizationId, type: { in: ['CUSTOMER', 'BOTH'] } },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Generate invoice number
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true },
    });
    const nextNum = lastInvoice
      ? parseInt(lastInvoice.invoiceNumber.split('-')[1]) + 1
      : 1;
    const invoiceNumber = `INV-${String(nextNum).padStart(6, '0')}`;

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    const itemsWithTotals = dto.items.map((item, index) => {
      const lineTotal = item.quantity * item.unitPrice;
      const discountAmt = item.discountPercent
        ? (lineTotal * item.discountPercent) / 100
        : 0;
      const taxableAmount = lineTotal - discountAmt;
      const taxAmount = 0; // TODO: Get from tax rate
      subtotal += taxableAmount;
      totalTax += taxAmount;

      return {
        itemId: item.itemId,
        description: item.description,
        quantity: item.quantity,
        unit: 'PCS', // Default unit
        rate: item.unitPrice,
        discountType: 'PERCENTAGE' as const,
        discountValue: item.discountPercent || 0,
        discountAmount: discountAmt,
        taxRateId: item.taxRateId,
        taxAmount,
        amount: taxableAmount + taxAmount,
        sortOrder: index,
      };
    });

    const invoiceDiscountAmount = dto.discountAmount || 0;
    const total = subtotal - invoiceDiscountAmount + totalTax;
    const invoiceDate = dto.invoiceDate || new Date();
    const paymentTermDays = dto.paymentTerms || 30;
    const dueDate = dto.dueDate || new Date(invoiceDate.getTime() + paymentTermDays * 24 * 60 * 60 * 1000);

    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        salesOrderId: dto.salesOrderId,
        customerId: dto.customerId,
        invoiceDate,
        dueDate,
        status: 'DRAFT',
        billingAddress: dto.billingAddress ? JSON.parse(JSON.stringify(dto.billingAddress)) : undefined,
        subtotal,
        discountAmount: invoiceDiscountAmount,
        taxAmount: totalTax,
        total,
        balance: total,
        notes: dto.notes,
        termsConditions: dto.termsConditions,
        paymentTermDays,
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

  async createInvoiceFromOrder(
    orderId: string,
    organizationId: string,
    userId: string,
    dto?: CreateInvoiceFromOrderDto
  ) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id: orderId, organizationId },
      include: { items: { include: { item: true } }, customer: true },
    });

    if (!order) {
      throw new NotFoundException('Sales order not found');
    }

    if (order.status === 'DRAFT' || order.status === 'CANCELLED') {
      throw new BadRequestException('Cannot invoice draft or cancelled orders');
    }

    // Determine items to invoice
    let itemsToInvoice = order.items.map((i) => ({
      itemId: i.itemId,
      description: i.description || undefined,
      quantity: Number(i.quantity) - Number(i.invoicedQty),
      unitPrice: Number(i.rate),
      discountPercent: i.discountType === 'PERCENTAGE' ? Number(i.discountValue) : 0,
      taxRateId: i.taxRateId || undefined,
      salesOrderItemId: i.id,
    })).filter((i) => i.quantity > 0);

    if (dto?.items) {
      itemsToInvoice = dto.items.map((di) => {
        const orderItem = order.items.find((oi) => oi.id === di.salesOrderItemId);
        if (!orderItem) {
          throw new BadRequestException(`Order item ${di.salesOrderItemId} not found`);
        }
        const remaining = Number(orderItem.quantity) - Number(orderItem.invoicedQty);
        if (di.quantity > remaining) {
          throw new BadRequestException(`Cannot invoice more than remaining quantity`);
        }
        return {
          itemId: orderItem.itemId,
          description: orderItem.description || undefined,
          quantity: di.quantity,
          unitPrice: Number(orderItem.rate),
          discountPercent: orderItem.discountType === 'PERCENTAGE' ? Number(orderItem.discountValue) : 0,
          taxRateId: orderItem.taxRateId || undefined,
          salesOrderItemId: orderItem.id,
        };
      });
    }

    if (itemsToInvoice.length === 0) {
      throw new BadRequestException('No items to invoice');
    }

    // Create invoice
    const invoice = await this.createInvoice(organizationId, userId, {
      salesOrderId: orderId,
      customerId: order.customerId,
      items: itemsToInvoice,
      notes: order.notes || undefined,
    });

    // Update invoiced quantities on order items
    await this.prisma.$transaction(async (tx) => {
      for (const item of itemsToInvoice) {
        if (item.salesOrderItemId) {
          await tx.salesOrderItem.update({
            where: { id: item.salesOrderItemId },
            data: { invoicedQty: { increment: item.quantity } },
          });
        }
      }

      // Update order invoice status
      const updatedItems = await tx.salesOrderItem.findMany({
        where: { salesOrderId: orderId },
      });
      const allInvoiced = updatedItems.every(
        (i) => Number(i.invoicedQty) >= Number(i.quantity)
      );
      const partiallyInvoiced = updatedItems.some((i) => Number(i.invoicedQty) > 0);

      await tx.salesOrder.update({
        where: { id: orderId },
        data: {
          invoiceStatus: allInvoiced
            ? 'INVOICED'
            : partiallyInvoiced
            ? 'PARTIALLY_INVOICED'
            : 'NOT_INVOICED',
        },
      });
    });

    return invoice;
  }

  async getInvoices(
    organizationId: string,
    filters: {
      status?: string;
      customerId?: string;
      fromDate?: Date;
      toDate?: Date;
      page?: number;
      limit?: number;
    }
  ) {
    const { status, customerId, fromDate, toDate, page = 1, limit = 25 } = filters;

    const where: any = {
      organizationId,
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(fromDate || toDate
        ? {
            invoiceDate: {
              ...(fromDate && { gte: fromDate }),
              ...(toDate && { lte: toDate }),
            },
          }
        : {}),
    };

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { displayName: true, companyName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getInvoice(id: string, organizationId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        items: {
          include: { item: { select: { sku: true, name: true, unit: true } } },
        },
        salesOrder: { select: { orderNumber: true } },
        paymentAllocations: {
          include: { payment: true },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async sendInvoice(id: string, organizationId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'SENT' },
    });
  }

  async voidInvoice(id: string, organizationId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (Number(invoice.amountPaid) > 0) {
      throw new BadRequestException('Cannot void invoice with payments');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'VOID' },
    });
  }

  // ============ Payments ============

  async recordPayment(organizationId: string, userId: string, dto: CreatePaymentDto) {
    // Validate customer
    const customer = await this.prisma.contact.findFirst({
      where: { id: dto.customerId, organizationId, type: { in: ['CUSTOMER', 'BOTH'] } },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Generate payment number
    const lastPayment = await this.prisma.payment.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { paymentNumber: true },
    });
    const nextNum = lastPayment
      ? parseInt(lastPayment.paymentNumber.split('-')[1]) + 1
      : 1;
    const paymentNumber = `PAY-${String(nextNum).padStart(6, '0')}`;

    // Validate allocations
    let totalAllocated = 0;
    if (dto.allocations) {
      for (const alloc of dto.allocations) {
        const invoice = await this.prisma.invoice.findFirst({
          where: { id: alloc.invoiceId, organizationId, customerId: dto.customerId },
        });
        if (!invoice) {
          throw new NotFoundException(`Invoice ${alloc.invoiceId} not found`);
        }
        if (alloc.amount > Number(invoice.balance)) {
          throw new BadRequestException(`Allocation exceeds invoice balance`);
        }
        totalAllocated += alloc.amount;
      }
    }

    if (totalAllocated > dto.amount) {
      throw new BadRequestException('Total allocations exceed payment amount');
    }

    const unallocatedAmount = dto.amount - totalAllocated;

    return this.prisma.$transaction(async (tx) => {
      // Create payment
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          customerId: dto.customerId,
          paymentDate: dto.paymentDate || new Date(),
          amount: dto.amount,
          paymentMethod: dto.paymentMethod as unknown as import('@prisma/client').PaymentMethod,
          referenceNumber: dto.referenceNumber,
          bankAccountId: dto.bankAccountId,
          notes: dto.notes,
          isAdvancePayment: unallocatedAmount > 0,
          organizationId,
        },
      });

      // Create allocations and update invoices
      if (dto.allocations) {
        for (const alloc of dto.allocations) {
          await tx.paymentAllocation.create({
            data: {
              paymentId: payment.id,
              invoiceId: alloc.invoiceId,
              amount: alloc.amount,
            },
          });

          // Update invoice
          const invoice = await tx.invoice.findUnique({ where: { id: alloc.invoiceId } });
          const newAmountPaid = Number(invoice!.amountPaid) + alloc.amount;
          const newBalance = Number(invoice!.total) - newAmountPaid;
          const newStatus =
            newBalance <= 0
              ? 'PAID'
              : newAmountPaid > 0
              ? 'PARTIALLY_PAID'
              : invoice!.status;

          await tx.invoice.update({
            where: { id: alloc.invoiceId },
            data: {
              amountPaid: newAmountPaid,
              balance: newBalance,
              status: newStatus,
            },
          });
        }
      }

      return tx.payment.findUnique({
        where: { id: payment.id },
        include: {
          customer: { select: { displayName: true } },
          allocations: {
            include: { invoice: { select: { invoiceNumber: true } } },
          },
        },
      });
    });
  }

  async getPayments(
    organizationId: string,
    filters: {
      customerId?: string;
      fromDate?: Date;
      toDate?: Date;
      page?: number;
      limit?: number;
    }
  ) {
    const { customerId, fromDate, toDate, page = 1, limit = 25 } = filters;

    const where: any = {
      organizationId,
      ...(customerId && { customerId }),
      ...(fromDate || toDate
        ? {
            paymentDate: {
              ...(fromDate && { gte: fromDate }),
              ...(toDate && { lte: toDate }),
            },
          }
        : {}),
    };

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          customer: { select: { displayName: true } },
          allocations: {
            include: { invoice: { select: { invoiceNumber: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPayment(id: string, organizationId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        allocations: {
          include: { invoice: { select: { invoiceNumber: true, total: true } } },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  // ============ PDF Generation ============

  private async getOrganizationForPdf(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) throw new NotFoundException('Organization not found');

    return {
      name: org.name,
      address: org.address as any,
      phone: org.phone || undefined,
      email: org.email || undefined,
      website: org.website || undefined,
      sstNumber: org.sstNumber || undefined,
      businessRegNo: org.businessRegNo || undefined,
      tin: org.tin || undefined,
      logoUrl: org.logoUrl || undefined,
    };
  }

  private getDocumentLocale(organization: any, requestedLocale?: string): DocumentLocale {
    if (requestedLocale === 'ms' || requestedLocale === 'en') {
      return requestedLocale;
    }
    // Check organization settings for default document language
    const settings = organization.settings as Record<string, unknown> | null;
    if (settings?.documentLanguage === 'ms') return 'ms';
    return 'en';
  }

  async generateSalesOrderPdf(
    id: string,
    organizationId: string,
    locale?: string,
  ): Promise<Buffer> {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        items: {
          include: { item: { select: { sku: true, name: true, unit: true } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!order) throw new NotFoundException('Sales order not found');

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const organization = await this.getOrganizationForPdf(organizationId);
    const resolvedLocale = this.getDocumentLocale(org, locale);

    const customer = order.customer;
    const pdfData: SalesOrderPdfData = {
      organization,
      documentNumber: order.orderNumber,
      orderDate: order.orderDate.toISOString(),
      expectedShipDate: order.expectedShipDate?.toISOString(),
      customer: {
        displayName: customer.displayName,
        companyName: customer.companyName || undefined,
        email: customer.email || undefined,
        phone: customer.phone || undefined,
        taxNumber: customer.taxNumber || undefined,
        billingAddress: (customer.billingAddress || order.billingAddress) as any,
        shippingAddress: (customer.shippingAddress || order.shippingAddress) as any,
      },
      items: order.items.map((item) => ({
        sku: item.item?.sku || undefined,
        name: item.item?.name || item.description || '',
        description: item.description || undefined,
        quantity: Number(item.quantity),
        unit: item.unit || item.item?.unit || 'PCS',
        unitPrice: Number(item.rate),
        discountPercent: item.discountType === 'PERCENTAGE' ? Number(item.discountValue) : undefined,
        discountAmount: Number(item.discountAmount),
        taxAmount: Number(item.taxAmount),
        amount: Number(item.amount),
      })),
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      shippingCharges: Number(order.shippingCharges),
      taxAmount: Number(order.taxAmount),
      total: Number(order.total),
      notes: order.notes || undefined,
      termsConditions: order.termsConditions || undefined,
      status: order.status,
    };

    return this.pdfService.generateSalesOrderPdf(pdfData, resolvedLocale);
  }

  async generateInvoicePdf(
    id: string,
    organizationId: string,
    locale?: string,
  ): Promise<Buffer> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        items: {
          include: { item: { select: { sku: true, name: true, unit: true } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const organization = await this.getOrganizationForPdf(organizationId);
    const resolvedLocale = this.getDocumentLocale(org, locale);

    const customer = invoice.customer;
    const isPaid = Number(invoice.balance) <= 0;

    // Get bank details from org settings
    const settings = org.settings as Record<string, unknown> | null;
    const bankDetails = settings?.bankDetails as {
      bankName: string;
      accountName: string;
      accountNumber: string;
    } | undefined;

    const pdfData: InvoicePdfData = {
      organization,
      documentNumber: invoice.invoiceNumber,
      orderDate: invoice.invoiceDate.toISOString(),
      invoiceDate: invoice.invoiceDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      amountPaid: Number(invoice.amountPaid),
      balance: Number(invoice.balance),
      isPaid,
      paymentTermDays: invoice.paymentTermDays || 30,
      bankDetails,
      customer: {
        displayName: customer.displayName,
        companyName: customer.companyName || undefined,
        email: customer.email || undefined,
        phone: customer.phone || undefined,
        taxNumber: customer.taxNumber || undefined,
        billingAddress: (customer.billingAddress || invoice.billingAddress) as any,
      },
      items: invoice.items.map((item) => ({
        sku: item.item?.sku || undefined,
        name: item.item?.name || item.description || '',
        description: item.description || undefined,
        quantity: Number(item.quantity),
        unit: item.unit || item.item?.unit || 'PCS',
        unitPrice: Number(item.rate),
        discountPercent: item.discountType === 'PERCENTAGE' ? Number(item.discountValue) : undefined,
        discountAmount: Number(item.discountAmount),
        taxAmount: Number(item.taxAmount),
        amount: Number(item.amount),
      })),
      subtotal: Number(invoice.subtotal),
      discountAmount: Number(invoice.discountAmount),
      shippingCharges: 0,
      taxAmount: Number(invoice.taxAmount),
      total: Number(invoice.total),
      notes: invoice.notes || undefined,
      termsConditions: invoice.termsConditions || undefined,
      status: invoice.status,
    };

    return this.pdfService.generateInvoicePdf(pdfData, resolvedLocale);
  }
}
