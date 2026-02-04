import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateTaxRateDto, UpdateTaxRateDto, MALAYSIAN_TAX_RATES } from './dto/create-tax-rate.dto';
import { UpdateOrganizationTaxSettingsDto } from './dto/organization-tax-settings.dto';

export interface TaxCalculationResult {
  subtotal: number;
  taxAmount: number;
  total: number;
  taxBreakdown: {
    taxRateId: string;
    taxRateName: string;
    taxRateCode: string;
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
    // Check for duplicate code
    const existingCode = await this.prisma.taxRate.findFirst({
      where: { organizationId, code: dto.code },
    });

    if (existingCode) {
      throw new ConflictException(`Tax rate with code "${dto.code}" already exists`);
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.taxRate.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.taxRate.create({
      data: {
        name: dto.name,
        code: dto.code,
        rate: dto.rate,
        type: dto.type,
        description: dto.description,
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        organizationId,
      },
    });
  }

  async getTaxRates(
    organizationId: string,
    filters?: {
      type?: string;
      status?: string;
      isActive?: boolean;
      page?: number;
      limit?: number;
    }
  ) {
    const { type, status, isActive, page = 1, limit = 50 } = filters || {};

    const where: any = {
      organizationId,
      ...(type && { type }),
      ...(status && { status: status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE' }),
      ...(isActive !== undefined && { isActive }),
    };

    const [taxRates, total] = await Promise.all([
      this.prisma.taxRate.findMany({
        where,
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { items: true },
          },
        },
      }),
      this.prisma.taxRate.count({ where }),
    ]);

    return {
      data: taxRates.map((rate) => ({
        ...rate,
        rate: Number(rate.rate),
        itemCount: rate._count.items,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getTaxRate(id: string, organizationId: string) {
    const taxRate = await this.prisma.taxRate.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    if (!taxRate) {
      throw new NotFoundException('Tax rate not found');
    }

    return {
      ...taxRate,
      rate: Number(taxRate.rate),
      itemCount: taxRate._count.items,
    };
  }

  async getDefaultTaxRate(organizationId: string) {
    const taxRate = await this.prisma.taxRate.findFirst({
      where: { organizationId, isDefault: true, isActive: true, status: 'ACTIVE' },
    });

    return taxRate ? { ...taxRate, rate: Number(taxRate.rate) } : null;
  }

  async updateTaxRate(id: string, organizationId: string, dto: UpdateTaxRateDto) {
    const existing = await this.prisma.taxRate.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Tax rate not found');
    }

    // Check for duplicate code if changing
    if (dto.code && dto.code !== existing.code) {
      const existingCode = await this.prisma.taxRate.findFirst({
        where: { organizationId, code: dto.code, id: { not: id } },
      });

      if (existingCode) {
        throw new ConflictException(`Tax rate with code "${dto.code}" already exists`);
      }
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
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.rate !== undefined && { rate: dto.rate }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.effectiveFrom !== undefined && { effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null }),
        ...(dto.effectiveTo !== undefined && { effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null }),
      },
    });
  }

  async setDefaultTaxRate(id: string, organizationId: string) {
    const taxRate = await this.prisma.taxRate.findFirst({
      where: { id, organizationId },
    });

    if (!taxRate) {
      throw new NotFoundException('Tax rate not found');
    }

    // Unset all defaults, then set this one
    await this.prisma.taxRate.updateMany({
      where: { organizationId, isDefault: true },
      data: { isDefault: false },
    });

    return this.prisma.taxRate.update({
      where: { id },
      data: { isDefault: true },
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

  // ============ Organization Tax Settings ============

  async getOrganizationTaxSettings(organizationId: string) {
    let settings = await this.prisma.organizationTaxSettings.findUnique({
      where: { organizationId },
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await this.prisma.organizationTaxSettings.create({
        data: { organizationId },
      });
    }

    // Fetch default tax rates if set
    const [defaultSalesTax, defaultPurchaseTax] = await Promise.all([
      settings.defaultSalesTaxId
        ? this.prisma.taxRate.findUnique({ where: { id: settings.defaultSalesTaxId } })
        : null,
      settings.defaultPurchaseTaxId
        ? this.prisma.taxRate.findUnique({ where: { id: settings.defaultPurchaseTaxId } })
        : null,
    ]);

    return {
      ...settings,
      sstThreshold: settings.sstThreshold ? Number(settings.sstThreshold) : null,
      defaultSalesTax: defaultSalesTax
        ? {
            id: defaultSalesTax.id,
            name: defaultSalesTax.name,
            code: defaultSalesTax.code,
            rate: Number(defaultSalesTax.rate),
          }
        : null,
      defaultPurchaseTax: defaultPurchaseTax
        ? {
            id: defaultPurchaseTax.id,
            name: defaultPurchaseTax.name,
            code: defaultPurchaseTax.code,
            rate: Number(defaultPurchaseTax.rate),
          }
        : null,
    };
  }

  async updateOrganizationTaxSettings(
    organizationId: string,
    dto: UpdateOrganizationTaxSettingsDto
  ) {
    // Validate tax rate IDs if provided
    if (dto.defaultSalesTaxId) {
      const exists = await this.prisma.taxRate.findFirst({
        where: { id: dto.defaultSalesTaxId, organizationId },
      });
      if (!exists) {
        throw new NotFoundException('Default sales tax rate not found');
      }
    }

    if (dto.defaultPurchaseTaxId) {
      const exists = await this.prisma.taxRate.findFirst({
        where: { id: dto.defaultPurchaseTaxId, organizationId },
      });
      if (!exists) {
        throw new NotFoundException('Default purchase tax rate not found');
      }
    }

    return this.prisma.organizationTaxSettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        ...dto,
        sstRegisteredDate: dto.sstRegisteredDate ? new Date(dto.sstRegisteredDate) : null,
      },
      update: {
        ...(dto.isSstRegistered !== undefined && { isSstRegistered: dto.isSstRegistered }),
        ...(dto.sstRegistrationNo !== undefined && { sstRegistrationNo: dto.sstRegistrationNo }),
        ...(dto.sstRegisteredDate !== undefined && {
          sstRegisteredDate: dto.sstRegisteredDate ? new Date(dto.sstRegisteredDate) : null,
        }),
        ...(dto.sstThreshold !== undefined && { sstThreshold: dto.sstThreshold }),
        ...(dto.defaultSalesTaxId !== undefined && { defaultSalesTaxId: dto.defaultSalesTaxId }),
        ...(dto.defaultPurchaseTaxId !== undefined && { defaultPurchaseTaxId: dto.defaultPurchaseTaxId }),
        ...(dto.taxInclusive !== undefined && { taxInclusive: dto.taxInclusive }),
        ...(dto.roundingMethod !== undefined && { roundingMethod: dto.roundingMethod }),
      },
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
      taxRateCode: string;
      rate: number;
      taxableAmount: number;
      taxAmount: number;
    }>();

    for (const item of lineItems) {
      subtotal += item.amount;

      if (item.taxRateId) {
        const taxRate = await this.prisma.taxRate.findFirst({
          where: { id: item.taxRateId, organizationId, isActive: true, status: 'ACTIVE' },
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
              taxRateCode: taxRate.code,
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
  ): Promise<{ taxAmount: number; taxRate: number; taxRateName: string; taxRateCode: string }> {
    if (!taxRateId) {
      return { taxAmount: 0, taxRate: 0, taxRateName: 'No Tax', taxRateCode: '' };
    }

    const taxRate = await this.prisma.taxRate.findFirst({
      where: { id: taxRateId, organizationId, isActive: true, status: 'ACTIVE' },
    });

    if (!taxRate) {
      return { taxAmount: 0, taxRate: 0, taxRateName: 'Unknown', taxRateCode: '' };
    }

    const taxAmount = Math.round((amount * Number(taxRate.rate)) / 100 * 100) / 100;

    return {
      taxAmount,
      taxRate: Number(taxRate.rate),
      taxRateName: taxRate.name,
      taxRateCode: taxRate.code,
    };
  }

  // ============ Malaysian SST Utilities ============

  async initializeDefaultTaxRates(organizationId: string) {
    const existingRates = await this.prisma.taxRate.count({
      where: { organizationId },
    });

    if (existingRates > 0) {
      return { message: 'Tax rates already exist', created: 0, rates: [] };
    }

    const rates = [
      { ...MALAYSIAN_TAX_RATES.SST_SALES, isDefault: true },
      { ...MALAYSIAN_TAX_RATES.SST_SERVICE },
      { ...MALAYSIAN_TAX_RATES.EXEMPT },
      { ...MALAYSIAN_TAX_RATES.ZERO_RATED },
      { ...MALAYSIAN_TAX_RATES.OUT_OF_SCOPE },
    ];

    const createdRates = await Promise.all(
      rates.map((rate) =>
        this.prisma.taxRate.create({
          data: {
            ...rate,
            organizationId,
            isActive: true,
          },
        })
      )
    );

    return {
      message: 'Default Malaysian tax rates created',
      created: createdRates.length,
      rates: createdRates,
    };
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
