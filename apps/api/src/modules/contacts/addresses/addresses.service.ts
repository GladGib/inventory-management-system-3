import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  async findAll(contactId: string, organizationId: string) {
    // Verify contact belongs to organization
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return this.prisma.address.findMany({
      where: { contactId, organizationId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findById(id: string, contactId: string, organizationId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id, contactId, organizationId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  async create(
    contactId: string,
    organizationId: string,
    dto: CreateAddressDto
  ) {
    // Verify contact belongs to organization
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // If this is the first address or marked as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { contactId, organizationId },
        data: { isDefault: false },
      });
    }

    // Check if this is the first address
    const addressCount = await this.prisma.address.count({
      where: { contactId },
    });

    return this.prisma.address.create({
      data: {
        ...dto,
        contactId,
        organizationId,
        // First address is automatically default
        isDefault: addressCount === 0 ? true : dto.isDefault ?? false,
      },
    });
  }

  async update(
    id: string,
    contactId: string,
    organizationId: string,
    dto: UpdateAddressDto
  ) {
    const address = await this.findById(id, contactId, organizationId);

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { contactId, organizationId, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, contactId: string, organizationId: string) {
    const address = await this.findById(id, contactId, organizationId);

    // Cannot delete default address if there are other addresses
    if (address.isDefault) {
      const otherAddresses = await this.prisma.address.count({
        where: { contactId, id: { not: id } },
      });

      if (otherAddresses > 0) {
        throw new BadRequestException(
          'Cannot delete default address. Set another address as default first.'
        );
      }
    }

    await this.prisma.address.delete({ where: { id } });
  }

  async setDefault(id: string, contactId: string, organizationId: string) {
    await this.findById(id, contactId, organizationId);

    // Unset all other defaults
    await this.prisma.address.updateMany({
      where: { contactId, organizationId, id: { not: id } },
      data: { isDefault: false },
    });

    return this.prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });
  }
}
