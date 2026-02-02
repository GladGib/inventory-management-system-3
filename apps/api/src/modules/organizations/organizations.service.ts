import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            warehouses: true,
            items: true,
            contacts: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async findBySlug(slug: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { slug },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async update(id: string, updateDto: UpdateOrganizationDto) {
    const organization = await this.findById(id);

    return this.prisma.organization.update({
      where: { id: organization.id },
      data: updateDto,
    });
  }

  async getSettings(id: string) {
    const organization = await this.findById(id);
    return organization.settings;
  }

  async updateSettings(id: string, settings: Record<string, unknown>) {
    const organization = await this.findById(id);

    const mergedSettings = {
      ...(organization.settings as Record<string, unknown>),
      ...settings,
    };

    return this.prisma.organization.update({
      where: { id: organization.id },
      data: {
        settings: mergedSettings as unknown as import('@prisma/client').Prisma.InputJsonValue,
      },
      select: {
        id: true,
        settings: true,
      },
    });
  }

  async getDashboardStats(id: string) {
    const organization = await this.findById(id);

    const [
      totalItems,
      totalCustomers,
      totalVendors,
      lowStockItems,
      pendingSalesOrders,
      pendingPurchaseOrders,
      unpaidInvoices,
      unpaidBills,
    ] = await Promise.all([
      this.prisma.item.count({
        where: { organizationId: id, status: 'ACTIVE' },
      }),
      this.prisma.contact.count({
        where: { organizationId: id, type: { in: ['CUSTOMER', 'BOTH'] }, status: 'ACTIVE' },
      }),
      this.prisma.contact.count({
        where: { organizationId: id, type: { in: ['VENDOR', 'BOTH'] }, status: 'ACTIVE' },
      }),
      this.prisma.stockLevel.count({
        where: {
          item: { organizationId: id },
          stockOnHand: {
            lte: this.prisma.stockLevel.fields.stockOnHand, // Compare with reorder level
          },
        },
      }),
      this.prisma.salesOrder.count({
        where: {
          organizationId: id,
          status: { in: ['DRAFT', 'CONFIRMED', 'PACKED'] },
        },
      }),
      this.prisma.purchaseOrder.count({
        where: {
          organizationId: id,
          status: { in: ['DRAFT', 'ISSUED'] },
        },
      }),
      this.prisma.invoice.count({
        where: {
          organizationId: id,
          paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
          status: { not: 'VOID' },
        },
      }),
      this.prisma.bill.count({
        where: {
          organizationId: id,
          paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
          status: { not: 'VOID' },
        },
      }),
    ]);

    return {
      organization: {
        id: organization.id,
        name: organization.name,
      },
      inventory: {
        totalItems,
        lowStockItems,
      },
      contacts: {
        totalCustomers,
        totalVendors,
      },
      sales: {
        pendingSalesOrders,
        unpaidInvoices,
      },
      purchases: {
        pendingPurchaseOrders,
        unpaidBills,
      },
    };
  }
}
