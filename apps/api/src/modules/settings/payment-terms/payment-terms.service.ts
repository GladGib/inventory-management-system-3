import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePaymentTermDto } from './dto/create-payment-term.dto';
import { UpdatePaymentTermDto } from './dto/update-payment-term.dto';

const DEFAULT_PAYMENT_TERMS = [
  { name: 'COD', days: 0, description: 'Cash on Delivery' },
  { name: 'Net 7', days: 7, description: 'Payment due within 7 days' },
  { name: 'Net 15', days: 15, description: 'Payment due within 15 days' },
  { name: 'Net 30', days: 30, description: 'Payment due within 30 days', isDefault: true },
  { name: 'Net 60', days: 60, description: 'Payment due within 60 days' },
  { name: 'Net 90', days: 90, description: 'Payment due within 90 days' },
];

@Injectable()
export class PaymentTermsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    const terms = await this.prisma.paymentTerm.findMany({
      where: { organizationId },
      orderBy: [{ isDefault: 'desc' }, { days: 'asc' }],
      include: {
        _count: {
          select: { contacts: true },
        },
      },
    });

    return terms.map((term) => ({
      ...term,
      usageCount: term._count.contacts,
      _count: undefined,
    }));
  }

  async findById(id: string, organizationId: string) {
    const term = await this.prisma.paymentTerm.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: { contacts: true },
        },
      },
    });

    if (!term) {
      throw new NotFoundException('Payment term not found');
    }

    return {
      ...term,
      usageCount: term._count.contacts,
      _count: undefined,
    };
  }

  async create(organizationId: string, dto: CreatePaymentTermDto) {
    // Check for duplicate name
    const existing = await this.prisma.paymentTerm.findFirst({
      where: { organizationId, name: dto.name },
    });

    if (existing) {
      throw new ConflictException('Payment term with this name already exists');
    }

    // If this is marked as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.paymentTerm.updateMany({
        where: { organizationId },
        data: { isDefault: false },
      });
    }

    return this.prisma.paymentTerm.create({
      data: {
        ...dto,
        organizationId,
      },
    });
  }

  async update(id: string, organizationId: string, dto: UpdatePaymentTermDto) {
    await this.findById(id, organizationId);

    // Check for duplicate name if name is being changed
    if (dto.name) {
      const existing = await this.prisma.paymentTerm.findFirst({
        where: { organizationId, name: dto.name, id: { not: id } },
      });

      if (existing) {
        throw new ConflictException('Payment term with this name already exists');
      }
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.paymentTerm.updateMany({
        where: { organizationId, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.paymentTerm.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, organizationId: string) {
    const term = await this.findById(id, organizationId);

    // Check if in use
    const usageCount = await this.prisma.contact.count({
      where: { paymentTermId: id },
    });

    if (usageCount > 0) {
      throw new BadRequestException(
        `Cannot delete payment term. It is used by ${usageCount} contact(s).`
      );
    }

    // Cannot delete if it's the only term
    const termCount = await this.prisma.paymentTerm.count({
      where: { organizationId },
    });

    if (termCount <= 1) {
      throw new BadRequestException(
        'Cannot delete the only payment term. Create another one first.'
      );
    }

    await this.prisma.paymentTerm.delete({ where: { id } });

    // If deleted term was default, set another as default
    if ((term as any).isDefault) {
      const firstTerm = await this.prisma.paymentTerm.findFirst({
        where: { organizationId },
        orderBy: { days: 'asc' },
      });

      if (firstTerm) {
        await this.prisma.paymentTerm.update({
          where: { id: firstTerm.id },
          data: { isDefault: true },
        });
      }
    }
  }

  async setDefault(id: string, organizationId: string) {
    await this.findById(id, organizationId);

    // Unset all other defaults
    await this.prisma.paymentTerm.updateMany({
      where: { organizationId, id: { not: id } },
      data: { isDefault: false },
    });

    return this.prisma.paymentTerm.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  async seedDefaults(organizationId: string) {
    // Check if terms already exist
    const existingCount = await this.prisma.paymentTerm.count({
      where: { organizationId },
    });

    if (existingCount > 0) {
      throw new BadRequestException('Payment terms already exist for this organization');
    }

    const createdTerms = await this.prisma.$transaction(
      DEFAULT_PAYMENT_TERMS.map((term) =>
        this.prisma.paymentTerm.create({
          data: {
            ...term,
            organizationId,
            isActive: true,
          },
        })
      )
    );

    return createdTerms;
  }

  async getDefault(organizationId: string) {
    return this.prisma.paymentTerm.findFirst({
      where: { organizationId, isDefault: true },
    });
  }
}
