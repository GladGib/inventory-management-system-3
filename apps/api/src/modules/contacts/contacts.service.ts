import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateContactDto, ContactType } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactQueryDto } from './dto/contact-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: ContactQueryDto) {
    const { search, type, status, page, limit, sortBy, sortOrder } = query;

    const where: Prisma.ContactWhereInput = {
      organizationId,
      ...(status && { status }),
      ...(type && {
        type: type === 'CUSTOMER'
          ? { in: ['CUSTOMER', 'BOTH'] }
          : type === 'VENDOR'
          ? { in: ['VENDOR', 'BOTH'] }
          : type,
      }),
      ...(search && {
        OR: [
          { companyName: { contains: search, mode: 'insensitive' } },
          { displayName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        include: {
          paymentTerm: { select: { id: true, name: true, days: true } },
        },
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
        skip: ((page || 1) - 1) * (limit || 25),
        take: limit || 25,
      }),
      this.prisma.contact.count({ where }),
    ]);

    // Calculate outstanding balance for each contact
    const contactsWithBalance = await Promise.all(
      contacts.map(async (contact) => {
        const balance = await this.getBalance(contact.id, organizationId);
        return {
          ...contact,
          outstandingBalance: balance.outstandingBalance,
        };
      })
    );

    return {
      data: contactsWithBalance,
      meta: {
        total,
        page: page || 1,
        limit: limit || 25,
        hasMore: ((page || 1) * (limit || 25)) < total,
      },
    };
  }

  async findById(id: string, organizationId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId },
      include: {
        paymentTerm: true,
        priceList: true,
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const balance = await this.getBalance(id, organizationId);

    return {
      ...contact,
      ...balance,
    };
  }

  async create(organizationId: string, createDto: CreateContactDto) {
    const { billingAddress, shippingAddress, ...rest } = createDto;

    return this.prisma.contact.create({
      data: {
        ...rest,
        organizationId,
        billingAddress: billingAddress
          ? (billingAddress as unknown as Prisma.InputJsonValue)
          : undefined,
        shippingAddress: shippingAddress
          ? (shippingAddress as unknown as Prisma.InputJsonValue)
          : undefined,
      },
      include: {
        paymentTerm: true,
      },
    });
  }

  async update(id: string, organizationId: string, updateDto: UpdateContactDto) {
    await this.findById(id, organizationId);

    const { billingAddress, shippingAddress, paymentTermId, priceListId, ...rest } = updateDto;

    return this.prisma.contact.update({
      where: { id },
      data: {
        ...rest,
        paymentTermId: paymentTermId === null ? null : paymentTermId,
        priceListId: priceListId === null ? null : priceListId,
        billingAddress: billingAddress
          ? (billingAddress as unknown as Prisma.InputJsonValue)
          : undefined,
        shippingAddress: shippingAddress
          ? (shippingAddress as unknown as Prisma.InputJsonValue)
          : undefined,
      },
      include: {
        paymentTerm: true,
      },
    });
  }

  async delete(id: string, organizationId: string) {
    await this.findById(id, organizationId);

    // Soft delete
    await this.prisma.contact.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  async getBalance(contactId: string, organizationId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { type: true },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    let totalReceivable = 0;
    let totalReceived = 0;
    let totalPayable = 0;
    let totalPaid = 0;

    // Calculate customer balance (invoices)
    if (contact.type === 'CUSTOMER' || contact.type === 'BOTH') {
      const invoiceAgg = await this.prisma.invoice.aggregate({
        where: {
          customerId: contactId,
          organizationId,
          status: { not: 'VOID' },
        },
        _sum: {
          total: true,
          amountPaid: true,
        },
      });

      totalReceivable = Number(invoiceAgg._sum.total || 0);
      totalReceived = Number(invoiceAgg._sum.amountPaid || 0);
    }

    // Calculate vendor balance (bills)
    if (contact.type === 'VENDOR' || contact.type === 'BOTH') {
      const billAgg = await this.prisma.bill.aggregate({
        where: {
          vendorId: contactId,
          organizationId,
          status: { not: 'VOID' },
        },
        _sum: {
          total: true,
          amountPaid: true,
        },
      });

      totalPayable = Number(billAgg._sum.total || 0);
      totalPaid = Number(billAgg._sum.amountPaid || 0);
    }

    return {
      totalReceivable,
      totalReceived,
      receivableBalance: totalReceivable - totalReceived,
      totalPayable,
      totalPaid,
      payableBalance: totalPayable - totalPaid,
      outstandingBalance: (totalReceivable - totalReceived) - (totalPayable - totalPaid),
    };
  }

  // Alias methods for customers and vendors
  async findCustomers(organizationId: string, query: ContactQueryDto) {
    return this.findAll(organizationId, { ...query, type: ContactType.CUSTOMER });
  }

  async findVendors(organizationId: string, query: ContactQueryDto) {
    return this.findAll(organizationId, { ...query, type: ContactType.VENDOR });
  }
}
