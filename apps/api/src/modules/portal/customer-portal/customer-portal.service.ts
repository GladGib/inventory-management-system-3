import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class CustomerPortalService {
  private readonly logger = new Logger(CustomerPortalService.name);

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

  // ============ Orders ============

  async getMyOrders(
    portalUserId: string,
    filters: {
      status?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { contactId, organizationId } = await this.resolvePortalUser(portalUserId);
    const { status, page = 1, limit = 25 } = filters;

    const where: any = {
      organizationId,
      customerId: contactId,
      ...(status && { status }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          orderDate: true,
          expectedShipDate: true,
          shippedDate: true,
          status: true,
          paymentStatus: true,
          shipmentStatus: true,
          subtotal: true,
          discountAmount: true,
          taxAmount: true,
          total: true,
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

  async getOrderDetail(portalUserId: string, orderId: string) {
    const { contactId, organizationId } = await this.resolvePortalUser(portalUserId);

    const order = await this.prisma.salesOrder.findFirst({
      where: {
        id: orderId,
        organizationId,
        customerId: contactId,
      },
      include: {
        items: {
          include: {
            item: {
              select: {
                sku: true,
                name: true,
                unit: true,
                images: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        warehouse: {
          select: { name: true },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            balance: true,
            invoiceDate: true,
            dueDate: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  // ============ Invoices ============

  async getMyInvoices(
    portalUserId: string,
    filters: {
      status?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { contactId, organizationId } = await this.resolvePortalUser(portalUserId);
    const { status, page = 1, limit = 25 } = filters;

    const where: any = {
      organizationId,
      customerId: contactId,
      ...(status && { status }),
    };

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          dueDate: true,
          status: true,
          paymentStatus: true,
          subtotal: true,
          taxAmount: true,
          total: true,
          amountPaid: true,
          balance: true,
          salesOrder: {
            select: { orderNumber: true },
          },
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

  async getInvoiceDetail(portalUserId: string, invoiceId: string) {
    const { contactId, organizationId } = await this.resolvePortalUser(portalUserId);

    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId,
        customerId: contactId,
      },
      include: {
        items: {
          include: {
            item: {
              select: {
                sku: true,
                name: true,
                unit: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        salesOrder: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        paymentAllocations: {
          include: {
            payment: {
              select: {
                paymentNumber: true,
                paymentDate: true,
                amount: true,
                paymentMethod: true,
              },
            },
          },
        },
        organization: {
          select: {
            name: true,
            email: true,
            phone: true,
            address: true,
            sstNumber: true,
            businessRegNo: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  // ============ Payments ============

  async getMyPayments(
    portalUserId: string,
    filters: {
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { contactId, organizationId } = await this.resolvePortalUser(portalUserId);
    const { page = 1, limit = 25 } = filters;

    const where: any = {
      organizationId,
      customerId: contactId,
    };

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        select: {
          id: true,
          paymentNumber: true,
          paymentDate: true,
          amount: true,
          paymentMethod: true,
          referenceNumber: true,
          notes: true,
          allocations: {
            include: {
              invoice: {
                select: {
                  invoiceNumber: true,
                  total: true,
                },
              },
            },
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

  // ============ Statement ============

  async getStatement(
    portalUserId: string,
    dateRange: {
      startDate?: string;
      endDate?: string;
    } = {},
  ) {
    const { contactId, organizationId } = await this.resolvePortalUser(portalUserId);

    const startDate = dateRange.startDate
      ? new Date(dateRange.startDate)
      : new Date(new Date().setMonth(new Date().getMonth() - 3));
    const endDate = dateRange.endDate
      ? new Date(dateRange.endDate)
      : new Date();

    // Get invoices in the period
    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        customerId: contactId,
        invoiceDate: {
          gte: startDate,
          lte: endDate,
        },
        status: { notIn: ['DRAFT', 'VOID'] },
      },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        dueDate: true,
        total: true,
        amountPaid: true,
        balance: true,
        status: true,
      },
      orderBy: { invoiceDate: 'asc' },
    });

    // Get payments in the period
    const payments = await this.prisma.payment.findMany({
      where: {
        organizationId,
        customerId: contactId,
        paymentDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        paymentNumber: true,
        paymentDate: true,
        amount: true,
        paymentMethod: true,
        allocations: {
          select: {
            invoiceId: true,
            amount: true,
            invoice: {
              select: { invoiceNumber: true },
            },
          },
        },
      },
      orderBy: { paymentDate: 'asc' },
    });

    // Get credit notes in the period
    const creditNotes = await this.prisma.creditNote.findMany({
      where: {
        organizationId,
        customerId: contactId,
        creditDate: {
          gte: startDate,
          lte: endDate,
        },
        status: { not: 'VOID' },
      },
      select: {
        id: true,
        creditNumber: true,
        creditDate: true,
        total: true,
        balance: true,
        status: true,
      },
      orderBy: { creditDate: 'asc' },
    });

    // Build statement entries sorted by date
    type StatementEntry = {
      date: Date;
      type: 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE';
      reference: string;
      description: string;
      debit: number;
      credit: number;
    };

    const entries: StatementEntry[] = [];

    for (const inv of invoices) {
      entries.push({
        date: inv.invoiceDate,
        type: 'INVOICE',
        reference: inv.invoiceNumber,
        description: `Invoice ${inv.invoiceNumber}`,
        debit: Number(inv.total),
        credit: 0,
      });
    }

    for (const pmt of payments) {
      entries.push({
        date: pmt.paymentDate,
        type: 'PAYMENT',
        reference: pmt.paymentNumber,
        description: `Payment ${pmt.paymentNumber} (${pmt.paymentMethod})`,
        debit: 0,
        credit: Number(pmt.amount),
      });
    }

    for (const cn of creditNotes) {
      entries.push({
        date: cn.creditDate,
        type: 'CREDIT_NOTE',
        reference: cn.creditNumber,
        description: `Credit Note ${cn.creditNumber}`,
        debit: 0,
        credit: Number(cn.total),
      });
    }

    // Sort by date
    entries.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate running balance
    let runningBalance = 0;
    const statementLines = entries.map((entry) => {
      runningBalance += entry.debit - entry.credit;
      return {
        ...entry,
        balance: runningBalance,
      };
    });

    // Get outstanding balance (all unpaid invoices)
    const outstandingInvoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        customerId: contactId,
        balance: { gt: 0 },
        status: { notIn: ['DRAFT', 'VOID'] },
      },
      select: {
        invoiceNumber: true,
        dueDate: true,
        total: true,
        balance: true,
      },
    });

    const totalOutstanding = outstandingInvoices.reduce(
      (sum, inv) => sum + Number(inv.balance),
      0,
    );

    // Get contact info for statement header
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      select: {
        displayName: true,
        companyName: true,
        email: true,
        billingAddress: true,
      },
    });

    return {
      contact,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      entries: statementLines,
      summary: {
        totalInvoiced: entries.filter((e) => e.type === 'INVOICE').reduce((s, e) => s + e.debit, 0),
        totalPaid: entries.filter((e) => e.type === 'PAYMENT').reduce((s, e) => s + e.credit, 0),
        totalCredits: entries.filter((e) => e.type === 'CREDIT_NOTE').reduce((s, e) => s + e.credit, 0),
        closingBalance: runningBalance,
        totalOutstanding,
      },
      outstandingInvoices,
    };
  }

  // ============ Dashboard Summary ============

  async getDashboardSummary(portalUserId: string) {
    const { contactId, organizationId } = await this.resolvePortalUser(portalUserId);

    // Recent orders (last 5)
    const recentOrders = await this.prisma.salesOrder.findMany({
      where: { organizationId, customerId: contactId },
      select: {
        id: true,
        orderNumber: true,
        orderDate: true,
        status: true,
        total: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Outstanding invoices
    const outstandingInvoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        customerId: contactId,
        balance: { gt: 0 },
        status: { notIn: ['DRAFT', 'VOID'] },
      },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        dueDate: true,
        total: true,
        balance: true,
        status: true,
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    // Recent payments (last 5)
    const recentPayments = await this.prisma.payment.findMany({
      where: { organizationId, customerId: contactId },
      select: {
        id: true,
        paymentNumber: true,
        paymentDate: true,
        amount: true,
        paymentMethod: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Aggregated totals
    const totalOutstanding = outstandingInvoices.reduce(
      (sum, inv) => sum + Number(inv.balance),
      0,
    );

    const overdueInvoices = outstandingInvoices.filter(
      (inv) => new Date(inv.dueDate) < new Date(),
    );

    const totalOverdue = overdueInvoices.reduce(
      (sum, inv) => sum + Number(inv.balance),
      0,
    );

    // Total orders and invoices counts
    const [orderCount, invoiceCount, paymentCount] = await Promise.all([
      this.prisma.salesOrder.count({
        where: { organizationId, customerId: contactId },
      }),
      this.prisma.invoice.count({
        where: { organizationId, customerId: contactId, status: { notIn: ['DRAFT', 'VOID'] } },
      }),
      this.prisma.payment.count({
        where: { organizationId, customerId: contactId },
      }),
    ]);

    return {
      summary: {
        totalOutstanding,
        totalOverdue,
        overdueCount: overdueInvoices.length,
        orderCount,
        invoiceCount,
        paymentCount,
      },
      recentOrders,
      outstandingInvoices,
      recentPayments,
    };
  }
}
