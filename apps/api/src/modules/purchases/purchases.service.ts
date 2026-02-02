import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { CreateReceiveDto } from './dto/create-receive.dto';
import { CreateBillDto, CreateBillFromPODto } from './dto/create-bill.dto';
import { CreateVendorPaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  // ============ Purchase Orders ============

  async createPurchaseOrder(organizationId: string, userId: string, dto: CreatePurchaseOrderDto) {
    // Validate vendor
    const vendor = await this.prisma.contact.findFirst({
      where: { id: dto.vendorId, organizationId, type: { in: ['VENDOR', 'BOTH'] } },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Validate items and get their details
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

    // Generate order number
    const lastOrder = await this.prisma.purchaseOrder.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { orderNumber: true },
    });
    const nextNum = lastOrder
      ? parseInt(lastOrder.orderNumber.split('-')[1]) + 1
      : 1;
    const orderNumber = `PO-${String(nextNum).padStart(6, '0')}`;

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    const itemsWithTotals = dto.items.map((item) => {
      const itemDetails = itemsMap.get(item.itemId)!;
      const lineTotal = item.quantity * item.unitPrice;
      const discountAmount = item.discountPercent
        ? (lineTotal * item.discountPercent) / 100
        : 0;
      const taxableAmount = lineTotal - discountAmount;
      const taxAmount = 0; // TODO: Get from tax rate
      subtotal += taxableAmount;
      totalTax += taxAmount;

      return {
        itemId: item.itemId,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit || itemDetails.unit,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent || 0,
        discountAmount,
        taxRateId: item.taxRateId,
        taxAmount,
        total: taxableAmount + taxAmount,
      };
    });

    const discountAmount = dto.discountAmount || 0;
    const shippingCharges = dto.shippingCharges || 0;
    const total = subtotal - discountAmount + totalTax + shippingCharges;

    return this.prisma.purchaseOrder.create({
      data: {
        orderNumber,
        vendorId: dto.vendorId,
        orderDate: dto.orderDate || new Date(),
        expectedDate: dto.expectedDate,
        status: 'DRAFT',
        receiveStatus: 'NOT_RECEIVED',
        billStatus: 'NOT_BILLED',
        warehouseId: dto.warehouseId,
        deliveryAddress: dto.deliveryAddress,
        referenceNumber: dto.referenceNumber,
        subtotal,
        discountAmount,
        taxAmount: totalTax,
        shippingCharges,
        total,
        notes: dto.notes,
        createdById: userId,
        organizationId,
        items: {
          create: itemsWithTotals,
        },
      },
      include: {
        vendor: { select: { displayName: true, companyName: true } },
        items: {
          include: { item: { select: { sku: true, name: true } } },
        },
      },
    });
  }

  async getPurchaseOrders(
    organizationId: string,
    filters: {
      status?: string;
      vendorId?: string;
      fromDate?: Date;
      toDate?: Date;
      page?: number;
      limit?: number;
    }
  ) {
    const { status, vendorId, fromDate, toDate, page = 1, limit = 25 } = filters;

    const where: any = {
      organizationId,
      ...(status && { status }),
      ...(vendorId && { vendorId }),
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
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          vendor: { select: { displayName: true, companyName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data: orders,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPurchaseOrder(id: string, organizationId: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
      include: {
        vendor: true,
        items: {
          include: { item: { select: { sku: true, name: true, unit: true } } },
        },
        warehouse: { select: { name: true, code: true } },
        createdBy: { select: { name: true } },
        receives: { select: { id: true, receiveNumber: true, receiveDate: true } },
        bills: { select: { id: true, billNumber: true, status: true, total: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Purchase order not found');
    }

    return order;
  }

  async issuePurchaseOrder(id: string, organizationId: string, userId: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
    });

    if (!order) {
      throw new NotFoundException('Purchase order not found');
    }

    if (order.status !== 'DRAFT') {
      throw new BadRequestException('Only draft orders can be issued');
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'ISSUED' },
      include: {
        vendor: { select: { displayName: true } },
        items: { include: { item: { select: { sku: true, name: true } } } },
      },
    });
  }

  async cancelPurchaseOrder(id: string, organizationId: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
    });

    if (!order) {
      throw new NotFoundException('Purchase order not found');
    }

    if (['RECEIVED', 'CLOSED', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException('Cannot cancel this order');
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // ============ Purchase Receives ============

  async createReceive(organizationId: string, userId: string, dto: CreateReceiveDto) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: dto.purchaseOrderId, organizationId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Purchase order not found');
    }

    if (order.status === 'DRAFT' || order.status === 'CANCELLED') {
      throw new BadRequestException('Cannot receive against draft or cancelled orders');
    }

    const warehouseId = dto.warehouseId || order.warehouseId;
    if (!warehouseId) {
      throw new BadRequestException('Warehouse is required');
    }

    // Generate receive number
    const lastReceive = await this.prisma.purchaseReceive.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { receiveNumber: true },
    });
    const nextNum = lastReceive
      ? parseInt(lastReceive.receiveNumber.split('-')[1]) + 1
      : 1;
    const receiveNumber = `RCV-${String(nextNum).padStart(6, '0')}`;

    // Validate and prepare items
    const receiveItems = dto.items.map((ri) => {
      const orderItem = order.items.find((oi) => oi.id === ri.purchaseOrderItemId);
      if (!orderItem) {
        throw new BadRequestException(`Order item ${ri.purchaseOrderItemId} not found`);
      }
      const remaining = Number(orderItem.quantity) - Number(orderItem.receivedQty);
      const totalReceiving = ri.receivedQty + (ri.rejectedQty || 0);
      if (totalReceiving > remaining) {
        throw new BadRequestException(`Cannot receive more than ordered quantity`);
      }
      return {
        purchaseOrderItemId: ri.purchaseOrderItemId,
        itemId: orderItem.itemId,
        orderedQty: remaining,
        receivedQty: ri.receivedQty,
        acceptedQty: ri.receivedQty,
        rejectedQty: ri.rejectedQty || 0,
        rejectionReason: ri.rejectionReason,
        unitCost: Number(orderItem.unitPrice),
        batchNumber: ri.batchNumber,
        serialNumbers: ri.serialNumbers || [],
      };
    });

    return this.prisma.$transaction(async (tx) => {
      // Create receive
      const receive = await tx.purchaseReceive.create({
        data: {
          receiveNumber,
          purchaseOrderId: dto.purchaseOrderId,
          vendorId: order.vendorId,
          receiveDate: dto.receiveDate || new Date(),
          warehouseId,
          status: 'RECEIVED',
          notes: dto.notes,
          organizationId,
          createdById: userId,
          items: {
            create: receiveItems,
          },
        },
      });

      // Update stock levels and PO item quantities
      for (const item of receiveItems) {
        // Update stock level
        const existingStock = await tx.stockLevel.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: item.itemId,
              warehouseId,
            },
          },
        });

        if (existingStock) {
          await tx.stockLevel.update({
            where: { id: existingStock.id },
            data: { stockOnHand: { increment: item.acceptedQty } },
          });
        } else {
          await tx.stockLevel.create({
            data: {
              itemId: item.itemId,
              warehouseId,
              stockOnHand: item.acceptedQty,
              committedStock: 0,
              incomingStock: 0,
            },
          });
        }

        // Update PO item received qty
        await tx.purchaseOrderItem.update({
          where: { id: item.purchaseOrderItemId },
          data: { receivedQty: { increment: item.receivedQty } },
        });
      }

      // Update PO status
      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: dto.purchaseOrderId },
      });
      const allReceived = updatedItems.every(
        (i) => Number(i.receivedQty) >= Number(i.quantity)
      );
      const partiallyReceived = updatedItems.some((i) => Number(i.receivedQty) > 0);

      await tx.purchaseOrder.update({
        where: { id: dto.purchaseOrderId },
        data: {
          status: allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
          receiveStatus: allReceived
            ? 'RECEIVED'
            : partiallyReceived
            ? 'PARTIALLY_RECEIVED'
            : 'NOT_RECEIVED',
        },
      });

      return tx.purchaseReceive.findUnique({
        where: { id: receive.id },
        include: {
          vendor: { select: { displayName: true } },
          items: { include: { item: { select: { sku: true, name: true } } } },
        },
      });
    });
  }

  async getReceives(
    organizationId: string,
    filters: {
      vendorId?: string;
      purchaseOrderId?: string;
      fromDate?: Date;
      toDate?: Date;
      page?: number;
      limit?: number;
    }
  ) {
    const { vendorId, purchaseOrderId, fromDate, toDate, page = 1, limit = 25 } = filters;

    const where: any = {
      organizationId,
      ...(vendorId && { vendorId }),
      ...(purchaseOrderId && { purchaseOrderId }),
      ...(fromDate || toDate
        ? {
            receiveDate: {
              ...(fromDate && { gte: fromDate }),
              ...(toDate && { lte: toDate }),
            },
          }
        : {}),
    };

    const [receives, total] = await Promise.all([
      this.prisma.purchaseReceive.findMany({
        where,
        include: {
          vendor: { select: { displayName: true } },
          purchaseOrder: { select: { orderNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.purchaseReceive.count({ where }),
    ]);

    return {
      data: receives,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ============ Bills ============

  async createBill(organizationId: string, userId: string, dto: CreateBillDto) {
    // Validate vendor
    const vendor = await this.prisma.contact.findFirst({
      where: { id: dto.vendorId, organizationId, type: { in: ['VENDOR', 'BOTH'] } },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Generate bill number
    const lastBill = await this.prisma.bill.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { billNumber: true },
    });
    const nextNum = lastBill
      ? parseInt(lastBill.billNumber.split('-')[1]) + 1
      : 1;
    const billNumber = `BILL-${String(nextNum).padStart(6, '0')}`;

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    const itemsWithTotals = dto.items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const taxAmount = 0; // TODO: Get from tax rate
      subtotal += lineTotal;
      totalTax += taxAmount;

      return {
        itemId: item.itemId,
        description: item.description,
        accountId: item.accountId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRateId: item.taxRateId,
        taxAmount,
        total: lineTotal + taxAmount,
      };
    });

    const discountAmount = dto.discountAmount || 0;
    const total = subtotal - discountAmount + totalTax;
    const billDate = dto.billDate || new Date();

    // Get payment terms from vendor's payment term or default to 30 days
    const vendorWithTerms = await this.prisma.contact.findUnique({
      where: { id: dto.vendorId },
      include: { paymentTerm: true },
    });
    const paymentDays = vendorWithTerms?.paymentTerm?.days || 30;
    const dueDate = dto.dueDate || new Date(billDate.getTime() + paymentDays * 24 * 60 * 60 * 1000);

    return this.prisma.bill.create({
      data: {
        billNumber,
        vendorBillNumber: dto.vendorBillNumber,
        purchaseOrderId: dto.purchaseOrderId,
        purchaseReceiveId: dto.purchaseReceiveId,
        vendorId: dto.vendorId,
        billDate,
        dueDate,
        status: 'DRAFT',
        subtotal,
        discountAmount,
        taxAmount: totalTax,
        total,
        balance: total,
        notes: dto.notes,
        createdById: userId,
        organizationId,
        items: {
          create: itemsWithTotals,
        },
      },
      include: {
        vendor: { select: { displayName: true, companyName: true } },
        items: true,
      },
    });
  }

  async createBillFromPO(
    purchaseOrderId: string,
    organizationId: string,
    userId: string,
    dto?: CreateBillFromPODto
  ) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, organizationId },
      include: { items: { include: { item: true } }, vendor: true },
    });

    if (!order) {
      throw new NotFoundException('Purchase order not found');
    }

    // Get unbilled items
    const unbilledItems = order.items
      .map((i) => ({
        itemId: i.itemId,
        description: i.description || i.item.name,
        quantity: Number(i.receivedQty) - Number(i.billedQty),
        unitPrice: Number(i.unitPrice),
        taxRateId: i.taxRateId || undefined,
        poItemId: i.id,
      }))
      .filter((i) => i.quantity > 0);

    if (unbilledItems.length === 0) {
      throw new BadRequestException('No items to bill');
    }

    const bill = await this.createBill(organizationId, userId, {
      purchaseOrderId,
      vendorId: order.vendorId,
      vendorBillNumber: dto?.vendorBillNumber,
      billDate: dto?.billDate,
      dueDate: dto?.dueDate,
      items: unbilledItems,
    });

    // Update billed qty on PO items
    await this.prisma.$transaction(async (tx) => {
      for (const item of unbilledItems) {
        await tx.purchaseOrderItem.update({
          where: { id: item.poItemId },
          data: { billedQty: { increment: item.quantity } },
        });
      }

      // Update PO bill status
      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId },
      });
      const allBilled = updatedItems.every(
        (i) => Number(i.billedQty) >= Number(i.receivedQty)
      );
      const partiallyBilled = updatedItems.some((i) => Number(i.billedQty) > 0);

      await tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: {
          billStatus: allBilled
            ? 'BILLED'
            : partiallyBilled
            ? 'PARTIALLY_BILLED'
            : 'NOT_BILLED',
        },
      });
    });

    return bill;
  }

  async getBills(
    organizationId: string,
    filters: {
      status?: string;
      vendorId?: string;
      fromDate?: Date;
      toDate?: Date;
      page?: number;
      limit?: number;
    }
  ) {
    const { status, vendorId, fromDate, toDate, page = 1, limit = 25 } = filters;

    const where: any = {
      organizationId,
      ...(status && { status }),
      ...(vendorId && { vendorId }),
      ...(fromDate || toDate
        ? {
            billDate: {
              ...(fromDate && { gte: fromDate }),
              ...(toDate && { lte: toDate }),
            },
          }
        : {}),
    };

    const [bills, total] = await Promise.all([
      this.prisma.bill.findMany({
        where,
        include: {
          vendor: { select: { displayName: true, companyName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.bill.count({ where }),
    ]);

    return {
      data: bills,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getBill(id: string, organizationId: string) {
    const bill = await this.prisma.bill.findFirst({
      where: { id, organizationId },
      include: {
        vendor: true,
        items: true,
        purchaseOrder: { select: { orderNumber: true } },
        paymentAllocations: {
          include: { vendorPayment: { select: { paymentNumber: true, paymentDate: true, amount: true } } },
        },
        createdBy: { select: { name: true } },
      },
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    return bill;
  }

  async approveBill(id: string, organizationId: string) {
    const bill = await this.prisma.bill.findFirst({
      where: { id, organizationId },
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.status !== 'DRAFT') {
      throw new BadRequestException('Only draft bills can be approved');
    }

    return this.prisma.bill.update({
      where: { id },
      data: { status: 'RECEIVED' },
    });
  }

  // ============ Payments Made ============

  async recordVendorPayment(organizationId: string, userId: string, dto: CreateVendorPaymentDto) {
    // Validate vendor
    const vendor = await this.prisma.contact.findFirst({
      where: { id: dto.vendorId, organizationId, type: { in: ['VENDOR', 'BOTH'] } },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Generate payment number
    const lastPayment = await this.prisma.vendorPayment.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { paymentNumber: true },
    });
    const nextNum = lastPayment
      ? parseInt(lastPayment.paymentNumber.split('-')[1]) + 1
      : 1;
    const paymentNumber = `VPY-${String(nextNum).padStart(6, '0')}`;

    // Validate allocations
    let totalAllocated = 0;
    if (dto.allocations) {
      for (const alloc of dto.allocations) {
        const bill = await this.prisma.bill.findFirst({
          where: { id: alloc.billId, organizationId, vendorId: dto.vendorId },
        });
        if (!bill) {
          throw new NotFoundException(`Bill ${alloc.billId} not found`);
        }
        if (alloc.amount > Number(bill.balance)) {
          throw new BadRequestException(`Allocation exceeds bill balance`);
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
      const payment = await tx.vendorPayment.create({
        data: {
          paymentNumber,
          vendorId: dto.vendorId,
          paymentDate: dto.paymentDate || new Date(),
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          referenceNumber: dto.referenceNumber,
          bankAccountId: dto.bankAccountId,
          notes: dto.notes,
          unallocatedAmount,
          isAdvancePayment: dto.isAdvancePayment || false,
          createdById: userId,
          organizationId,
        },
      });

      // Create allocations and update bills
      if (dto.allocations) {
        for (const alloc of dto.allocations) {
          await tx.vendorPaymentAllocation.create({
            data: {
              vendorPaymentId: payment.id,
              billId: alloc.billId,
              amount: alloc.amount,
            },
          });

          // Update bill
          const bill = await tx.bill.findUnique({ where: { id: alloc.billId } });
          const newAmountPaid = Number(bill!.amountPaid) + alloc.amount;
          const newBalance = Number(bill!.total) - newAmountPaid;
          const newStatus =
            newBalance <= 0
              ? 'PAID'
              : newAmountPaid > 0
              ? 'PARTIALLY_PAID'
              : bill!.status;

          await tx.bill.update({
            where: { id: alloc.billId },
            data: {
              amountPaid: newAmountPaid,
              balance: newBalance,
              status: newStatus,
            },
          });
        }
      }

      return tx.vendorPayment.findUnique({
        where: { id: payment.id },
        include: {
          vendor: { select: { displayName: true } },
          allocations: {
            include: { bill: { select: { billNumber: true } } },
          },
        },
      });
    });
  }

  async getVendorPayments(
    organizationId: string,
    filters: {
      vendorId?: string;
      fromDate?: Date;
      toDate?: Date;
      page?: number;
      limit?: number;
    }
  ) {
    const { vendorId, fromDate, toDate, page = 1, limit = 25 } = filters;

    const where: any = {
      organizationId,
      ...(vendorId && { vendorId }),
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
      this.prisma.vendorPayment.findMany({
        where,
        include: {
          vendor: { select: { displayName: true } },
          allocations: {
            include: { bill: { select: { billNumber: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vendorPayment.count({ where }),
    ]);

    return {
      data: payments,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
