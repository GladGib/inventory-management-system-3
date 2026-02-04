import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateVendorCreditDto,
  UpdateVendorCreditDto,
  VendorCreditQueryParams,
} from './dto/vendor-credit.dto';

@Injectable()
export class VendorCreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async createVendorCredit(
    organizationId: string,
    userId: string,
    dto: CreateVendorCreditDto
  ) {
    // Validate vendor
    const vendor = await this.prisma.contact.findFirst({
      where: { id: dto.vendorId, organizationId, type: { in: ['VENDOR', 'BOTH'] } },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Generate credit number
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    const lastCredit = await this.prisma.vendorCredit.findFirst({
      where: {
        organizationId,
        creditNumber: { startsWith: `VC-${yearMonth}` },
      },
      orderBy: { createdAt: 'desc' },
      select: { creditNumber: true },
    });
    const nextNum = lastCredit
      ? parseInt(lastCredit.creditNumber.split('-')[2]) + 1
      : 1;
    const creditNumber = `VC-${yearMonth}-${String(nextNum).padStart(4, '0')}`;

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    const itemsWithTotals = dto.items.map((item) => {
      const quantity = item.quantity || 1;
      const lineTotal = quantity * Number(item.unitPrice);
      const taxAmount = item.taxAmount || 0;
      subtotal += lineTotal;
      totalTax += taxAmount;

      return {
        description: item.description,
        quantity,
        unitPrice: item.unitPrice,
        taxAmount,
        total: lineTotal + taxAmount,
      };
    });

    const total = subtotal + totalTax;

    return this.prisma.vendorCredit.create({
      data: {
        creditNumber,
        vendorId: dto.vendorId,
        creditDate: dto.creditDate || new Date(),
        reference: dto.reference,
        reason: dto.reason,
        notes: dto.notes,
        subtotal,
        taxAmount: totalTax,
        total,
        balance: total,
        status: 'OPEN',
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

  async getVendorCredits(
    organizationId: string,
    filters: VendorCreditQueryParams
  ) {
    const { status, vendorId, fromDate, toDate, page = 1, limit = 25 } = filters;

    const where: any = {
      organizationId,
      ...(status && { status }),
      ...(vendorId && { vendorId }),
      ...(fromDate || toDate
        ? {
            creditDate: {
              ...(fromDate && { gte: new Date(fromDate) }),
              ...(toDate && { lte: new Date(toDate) }),
            },
          }
        : {}),
    };

    const [credits, total] = await Promise.all([
      this.prisma.vendorCredit.findMany({
        where,
        include: {
          vendor: { select: { displayName: true, companyName: true } },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vendorCredit.count({ where }),
    ]);

    return {
      data: credits,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getVendorCredit(id: string, organizationId: string) {
    const credit = await this.prisma.vendorCredit.findFirst({
      where: { id, organizationId },
      include: {
        vendor: true,
        items: true,
        applications: {
          include: { bill: { select: { billNumber: true, total: true } } },
        },
        createdBy: { select: { name: true } },
      },
    });

    if (!credit) {
      throw new NotFoundException('Vendor credit not found');
    }

    return credit;
  }

  async updateVendorCredit(
    id: string,
    organizationId: string,
    dto: UpdateVendorCreditDto
  ) {
    const credit = await this.prisma.vendorCredit.findFirst({
      where: { id, organizationId },
    });

    if (!credit) {
      throw new NotFoundException('Vendor credit not found');
    }

    if (credit.status !== 'OPEN') {
      throw new BadRequestException('Only open credits can be updated');
    }

    // If items are being updated, recalculate totals
    if (dto.items) {
      await this.prisma.vendorCreditItem.deleteMany({ where: { vendorCreditId: id } });

      let subtotal = 0;
      let totalTax = 0;
      const itemsWithTotals = dto.items.map((item) => {
        const quantity = item.quantity || 1;
        const lineTotal = quantity * Number(item.unitPrice);
        const taxAmount = item.taxAmount || 0;
        subtotal += lineTotal;
        totalTax += taxAmount;

        return {
          vendorCreditId: id,
          description: item.description,
          quantity,
          unitPrice: item.unitPrice,
          taxAmount,
          total: lineTotal + taxAmount,
        };
      });

      await this.prisma.vendorCreditItem.createMany({ data: itemsWithTotals });

      const total = subtotal + totalTax;

      return this.prisma.vendorCredit.update({
        where: { id },
        data: {
          reference: dto.reference,
          reason: dto.reason,
          notes: dto.notes,
          subtotal,
          taxAmount: totalTax,
          total,
          balance: total,
        },
        include: {
          vendor: { select: { displayName: true } },
          items: true,
        },
      });
    }

    return this.prisma.vendorCredit.update({
      where: { id },
      data: {
        reference: dto.reference,
        reason: dto.reason,
        notes: dto.notes,
      },
      include: {
        vendor: { select: { displayName: true } },
        items: true,
      },
    });
  }

  async deleteVendorCredit(id: string, organizationId: string) {
    const credit = await this.prisma.vendorCredit.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { applications: true } } },
    });

    if (!credit) {
      throw new NotFoundException('Vendor credit not found');
    }

    if (credit._count.applications > 0) {
      throw new BadRequestException('Cannot delete credit with applications');
    }

    await this.prisma.vendorCredit.delete({ where: { id } });
    return { success: true };
  }

  async voidVendorCredit(id: string, organizationId: string) {
    const credit = await this.prisma.vendorCredit.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { applications: true } } },
    });

    if (!credit) {
      throw new NotFoundException('Vendor credit not found');
    }

    if (credit._count.applications > 0) {
      throw new BadRequestException('Cannot void credit with applications');
    }

    return this.prisma.vendorCredit.update({
      where: { id },
      data: { status: 'VOID' },
      include: {
        vendor: { select: { displayName: true } },
        items: true,
      },
    });
  }

  async applyVendorCredit(
    id: string,
    organizationId: string,
    userId: string,
    applications: { billId: string; amount: number }[]
  ) {
    const credit = await this.prisma.vendorCredit.findFirst({
      where: { id, organizationId },
    });

    if (!credit) {
      throw new NotFoundException('Vendor credit not found');
    }

    if (credit.status === 'FULLY_APPLIED' || credit.status === 'VOID') {
      throw new BadRequestException('Cannot apply this credit');
    }

    // Validate applications
    let totalApplied = 0;
    for (const app of applications) {
      const bill = await this.prisma.bill.findFirst({
        where: {
          id: app.billId,
          organizationId,
          vendorId: credit.vendorId,
        },
      });

      if (!bill) {
        throw new NotFoundException(`Bill ${app.billId} not found`);
      }

      if (app.amount > Number(bill.balance)) {
        throw new BadRequestException('Application amount exceeds bill balance');
      }

      totalApplied += app.amount;
    }

    if (totalApplied > Number(credit.balance)) {
      throw new BadRequestException('Total applications exceed credit balance');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const app of applications) {
        // Create application
        await tx.vendorCreditApplication.create({
          data: {
            vendorCreditId: id,
            billId: app.billId,
            amount: app.amount,
            createdById: userId,
          },
        });

        // Update bill
        const bill = await tx.bill.findUnique({ where: { id: app.billId } });
        const newAmountPaid = Number(bill!.amountPaid) + app.amount;
        const newBalance = Number(bill!.total) - newAmountPaid;
        const newStatus =
          newBalance <= 0
            ? 'PAID'
            : newAmountPaid > 0
            ? 'PARTIALLY_PAID'
            : bill!.status;

        await tx.bill.update({
          where: { id: app.billId },
          data: {
            amountPaid: newAmountPaid,
            balance: newBalance,
            status: newStatus,
          },
        });
      }

      // Update vendor credit
      const newBalance = Number(credit.balance) - totalApplied;
      const newStatus =
        newBalance <= 0
          ? 'FULLY_APPLIED'
          : totalApplied > 0
          ? 'PARTIALLY_APPLIED'
          : credit.status;

      return tx.vendorCredit.update({
        where: { id },
        data: { balance: newBalance, status: newStatus },
        include: {
          vendor: { select: { displayName: true } },
          applications: {
            include: { bill: { select: { billNumber: true } } },
          },
        },
      });
    });
  }

  async getApplicationHistory(id: string, organizationId: string) {
    const credit = await this.prisma.vendorCredit.findFirst({
      where: { id, organizationId },
    });

    if (!credit) {
      throw new NotFoundException('Vendor credit not found');
    }

    return this.prisma.vendorCreditApplication.findMany({
      where: { vendorCreditId: id },
      include: {
        bill: { select: { billNumber: true, total: true, balance: true } },
      },
      orderBy: { appliedDate: 'desc' },
    });
  }
}
