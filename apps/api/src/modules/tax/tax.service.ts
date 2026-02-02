import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateTaxRateDto, UpdateTaxRateDto, MALAYSIAN_TAX_RATES } from './dto/create-tax-rate.dto';

export interface TaxCalculationResult {
  subtotal: number;
  taxAmount: number;
  total: number;
  taxBreakdown: {
    taxRateId: string;
    taxRateName: string;
    rate: number;
    taxableAmount: number;
    taxAmount: number;
  }[];
}

export interface LineItemTaxInput {
  amount: number;
  taxRateId?: string;
}

@Injectable()
export class TaxService {
  constructor(private readonly prisma: PrismaService) {}

  // ============ Tax Rate Management ============

  async createTaxRate(organizationId: string, dto: CreateTaxRateDto) {
    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.taxRate.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.taxRate.create({
      data: {
        ...dto,
        organizationId,
      },
    });
  }

  async getTaxRates(
    organizationId: string,
    filters?: {
      type?: string;
      status?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const { type, status, page = 1, limit = 50 } = filters || {};

    const where: any = {
      organizationId,
      ...(type && { type }),
      ...(status && { status: status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE' }),
    };

    const [taxRates, total] = await Promise.all([
      this.prisma.taxRate.findMany({
        where,
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.taxRate.count({ where }),
    ]);

    return {
      data: taxRates,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getTaxRate(id: string, organizationId: string) {
    const taxRate = await this.prisma.taxRate.findFirst({
      where: { id, organizationId },
    });

    if (!taxRate) {
      throw new NotFoundException('Tax rate not found');
    }

    return taxRate;
  }

  async getDefaultTaxRate(organizationId: string) {
    return this.prisma.taxRate.findFirst({
      where: { organizationId, isDefault: true, status: 'ACTIVE' },
    });
  }

  async updateTaxRate(id: string, organizationId: string, dto: UpdateTaxRateDto) {
    const existing = await this.prisma.taxRate.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Tax rate not found');
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.taxRate.updateMany({
        where: { organizationId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.taxRate.update({
      where: { id },
      data: {
        ...dto,
        status: dto.status === false ? 'INACTIVE' : dto.status === true ? 'ACTIVE' : undefined,
      },
    });
  }

  async deleteTaxRate(id: string, organizationId: string) {
    const taxRate = await this.prisma.taxRate.findFirst({
      where: { id, organizationId },
    });

    if (!taxRate) {
      throw new NotFoundException('Tax rate not found');
    }

    // Check if tax rate is in use
    const usageCount = await this.prisma.item.count({
      where: { taxRateId: id },
    });

    if (usageCount > 0) {
      throw new BadRequestException(
        `Cannot delete tax rate: it is used by ${usageCount} item(s). Deactivate it instead.`
      );
    }

    return this.prisma.taxRate.delete({
      where: { id },
    });
  }

  // ============ Tax Calculation ============

  async calculateTax(
    organizationId: string,
    lineItems: LineItemTaxInput[]
  ): Promise<TaxCalculationResult> {
    let subtotal = 0;
    let totalTax = 0;
    const taxBreakdownMap = new Map<string, {
      taxRateId: string;
      taxRateName: string;
      rate: number;
      taxableAmount: number;
      taxAmount: number;
    }>();

    for (const item of lineItems) {
      subtotal += item.amount;

      if (item.taxRateId) {
        const taxRate = await this.prisma.taxRate.findFirst({
          where: { id: item.taxRateId, organizationId, status: 'ACTIVE' },
        });

        if (taxRate) {
          const taxAmount = (item.amount * Number(taxRate.rate)) / 100;
          totalTax += taxAmount;

          // Aggregate by tax rate
          const existing = taxBreakdownMap.get(item.taxRateId);
          if (existing) {
            existing.taxableAmount += item.amount;
            existing.taxAmount += taxAmount;
          } else {
            taxBreakdownMap.set(item.taxRateId, {
              taxRateId: taxRate.id,
              taxRateName: taxRate.name,
              rate: Number(taxRate.rate),
              taxableAmount: item.amount,
              taxAmount,
            });
          }
        }
      }
    }

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(totalTax * 100) / 100,
      total: Math.round((subtotal + totalTax) * 100) / 100,
      taxBreakdown: Array.from(taxBreakdownMap.values()),
    };
  }

  async calculateLineTax(
    organizationId: string,
    amount: number,
    taxRateId?: string
  ): Promise<{ taxAmount: number; taxRate: number; taxRateName: string }> {
    if (!taxRateId) {
      return { taxAmount: 0, taxRate: 0, taxRateName: 'No Tax' };
    }

    const taxRate = await this.prisma.taxRate.findFirst({
      where: { id: taxRateId, organizationId, status: 'ACTIVE' },
    });

    if (!taxRate) {
      return { taxAmount: 0, taxRate: 0, taxRateName: 'Unknown' };
    }

    const taxAmount = Math.round((amount * Number(taxRate.rate)) / 100 * 100) / 100;

    return {
      taxAmount,
      taxRate: Number(taxRate.rate),
      taxRateName: taxRate.name,
    };
  }

  // ============ Malaysian SST Utilities ============

  async initializeDefaultTaxRates(organizationId: string) {
    const existingRates = await this.prisma.taxRate.count({
      where: { organizationId },
    });

    if (existingRates > 0) {
      return { message: 'Tax rates already exist', created: 0 };
    }

    const rates = [
      { ...MALAYSIAN_TAX_RATES.SST_SALES, isDefault: true },
      { ...MALAYSIAN_TAX_RATES.SST_SERVICE },
      { ...MALAYSIAN_TAX_RATES.EXEMPT },
      { ...MALAYSIAN_TAX_RATES.ZERO_RATED },
    ];

    const created = await this.prisma.taxRate.createMany({
      data: rates.map((rate) => ({
        ...rate,
        organizationId,
      })),
    });

    return { message: 'Default Malaysian tax rates created', created: created.count };
  }

  // ============ SST Report Data ============

  async getSSTSummary(
    organizationId: string,
    fromDate: Date,
    toDate: Date
  ) {
    // Get all invoices in the period
    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        invoiceDate: { gte: fromDate, lte: toDate },
        status: { notIn: ['DRAFT', 'VOID'] },
      },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        subtotal: true,
        taxAmount: true,
        total: true,
        customer: { select: { displayName: true, taxNumber: true } },
      },
    });

    // Get all bills in the period
    const bills = await this.prisma.bill.findMany({
      where: {
        organizationId,
        billDate: { gte: fromDate, lte: toDate },
        status: { notIn: ['DRAFT', 'VOID'] },
      },
      select: {
        id: true,
        billNumber: true,
        billDate: true,
        subtotal: true,
        taxAmount: true,
        total: true,
        vendor: { select: { displayName: true, taxNumber: true } },
      },
    });

    const salesSummary = {
      totalSales: invoices.reduce((sum, inv) => sum + Number(inv.subtotal), 0),
      totalOutputTax: invoices.reduce((sum, inv) => sum + Number(inv.taxAmount), 0),
      invoiceCount: invoices.length,
    };

    const purchasesSummary = {
      totalPurchases: bills.reduce((sum, bill) => sum + Number(bill.subtotal), 0),
      totalInputTax: bills.reduce((sum, bill) => sum + Number(bill.taxAmount), 0),
      billCount: bills.length,
    };

    const netTaxPayable = salesSummary.totalOutputTax - purchasesSummary.totalInputTax;

    return {
      period: { fromDate, toDate },
      sales: salesSummary,
      purchases: purchasesSummary,
      netTaxPayable,
      invoices: invoices.slice(0, 10), // First 10 for preview
      bills: bills.slice(0, 10),
    };
  }
}
