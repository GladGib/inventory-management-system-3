import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { PriceListQueryDto } from './dto/price-list-query.dto';
import {
  AddPriceListItemsDto,
  UpdatePriceListItemDto,
  BulkPriceUpdateDto,
} from './dto/price-list-item.dto';
import { EffectivePriceQueryDto } from './dto/effective-price-query.dto';

@Injectable()
export class PriceListsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: PriceListQueryDto) {
    const { search, type, status, page, limit, sortBy, sortOrder } = query;

    const where: any = {
      organizationId,
      ...(status && { status }),
      ...(type && { type }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [priceLists, total] = await Promise.all([
      this.prisma.priceList.findMany({
        where,
        include: {
          _count: { select: { items: true, contacts: true } },
        },
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
        skip: ((page || 1) - 1) * (limit || 25),
        take: limit || 25,
      }),
      this.prisma.priceList.count({ where }),
    ]);

    return {
      data: priceLists.map((pl) => ({
        ...pl,
        markupValue: Number(pl.markupValue),
        itemsCount: pl._count.items,
        contactsCount: pl._count.contacts,
      })),
      meta: {
        total,
        page: page || 1,
        limit: limit || 25,
        hasMore: ((page || 1) * (limit || 25)) < total,
      },
    };
  }

  async findById(id: string, organizationId: string) {
    const priceList = await this.prisma.priceList.findFirst({
      where: { id, organizationId },
      include: {
        items: {
          include: {
            priceList: false,
          },
          orderBy: { createdAt: 'desc' },
        },
        contacts: {
          select: { id: true, displayName: true, companyName: true, type: true },
        },
        _count: { select: { items: true, contacts: true } },
      },
    });

    if (!priceList) {
      throw new NotFoundException('Price list not found');
    }

    // Fetch item details for price list items
    const itemIds = priceList.items.map((pli) => pli.itemId);
    const items = await this.prisma.item.findMany({
      where: { id: { in: itemIds } },
      select: {
        id: true,
        sku: true,
        name: true,
        sellingPrice: true,
        costPrice: true,
        unit: true,
      },
    });
    const itemsMap = new Map(items.map((i: any) => [i.id, i]));

    return {
      ...priceList,
      markupValue: Number(priceList.markupValue),
      items: priceList.items.map((pli: any) => {
        const itemData: any = itemsMap.get(pli.itemId);
        return {
          ...pli,
          customPrice: Number(pli.customPrice),
          minQuantity: Number(pli.minQuantity),
          item: itemData ? {
            id: itemData.id,
            sku: itemData.sku,
            name: itemData.name,
            sellingPrice: Number(itemData.sellingPrice),
            costPrice: Number(itemData.costPrice),
            unit: itemData.unit,
          } : null,
        };
      }),
      itemsCount: priceList._count.items,
      contactsCount: priceList._count.contacts,
    };
  }

  async create(organizationId: string, createDto: CreatePriceListDto) {
    // Check for duplicate name
    const existing = await this.prisma.priceList.findFirst({
      where: { organizationId, name: createDto.name },
    });
    if (existing) {
      throw new ConflictException(`Price list with name "${createDto.name}" already exists`);
    }

    // If setting as default, unset other defaults of the same type
    if (createDto.isDefault) {
      await this.prisma.priceList.updateMany({
        where: { organizationId, type: createDto.type, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.priceList.create({
      data: {
        organizationId,
        name: createDto.name,
        description: createDto.description,
        type: createDto.type,
        markupType: createDto.markupType,
        markupValue: createDto.markupValue,
        isDefault: createDto.isDefault || false,
        effectiveFrom: createDto.effectiveFrom
          ? new Date(createDto.effectiveFrom)
          : undefined,
        effectiveTo: createDto.effectiveTo
          ? new Date(createDto.effectiveTo)
          : undefined,
      },
      include: {
        _count: { select: { items: true, contacts: true } },
      },
    });
  }

  async update(id: string, organizationId: string, updateDto: UpdatePriceListDto) {
    const priceList = await this.prisma.priceList.findFirst({
      where: { id, organizationId },
    });

    if (!priceList) {
      throw new NotFoundException('Price list not found');
    }

    // Check for duplicate name if name is being changed
    if (updateDto.name && updateDto.name !== priceList.name) {
      const existing = await this.prisma.priceList.findFirst({
        where: {
          organizationId,
          name: updateDto.name,
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException(`Price list with name "${updateDto.name}" already exists`);
      }
    }

    // If setting as default, unset other defaults of the same type
    if (updateDto.isDefault) {
      const type = updateDto.type || priceList.type;
      await this.prisma.priceList.updateMany({
        where: {
          organizationId,
          type,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    const data: any = {};
    if (updateDto.name !== undefined) data.name = updateDto.name;
    if (updateDto.description !== undefined) data.description = updateDto.description;
    if (updateDto.type !== undefined) data.type = updateDto.type;
    if (updateDto.markupType !== undefined) data.markupType = updateDto.markupType;
    if (updateDto.markupValue !== undefined) data.markupValue = updateDto.markupValue;
    if (updateDto.isDefault !== undefined) data.isDefault = updateDto.isDefault;
    if (updateDto.status !== undefined) data.status = updateDto.status;
    if (updateDto.effectiveFrom !== undefined) {
      data.effectiveFrom = updateDto.effectiveFrom
        ? new Date(updateDto.effectiveFrom)
        : null;
    }
    if (updateDto.effectiveTo !== undefined) {
      data.effectiveTo = updateDto.effectiveTo
        ? new Date(updateDto.effectiveTo)
        : null;
    }

    return this.prisma.priceList.update({
      where: { id },
      data,
      include: {
        _count: { select: { items: true, contacts: true } },
      },
    });
  }

  async delete(id: string, organizationId: string) {
    const priceList = await this.prisma.priceList.findFirst({
      where: { id, organizationId },
    });

    if (!priceList) {
      throw new NotFoundException('Price list not found');
    }

    // Soft delete
    await this.prisma.priceList.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  async addItems(
    priceListId: string,
    organizationId: string,
    dto: AddPriceListItemsDto,
  ) {
    const priceList = await this.prisma.priceList.findFirst({
      where: { id: priceListId, organizationId },
    });

    if (!priceList) {
      throw new NotFoundException('Price list not found');
    }

    // Validate all item IDs
    const itemIds = dto.items.map((i) => i.itemId);
    const validItems = await this.prisma.item.findMany({
      where: { id: { in: itemIds }, organizationId },
      select: { id: true },
    });
    const validItemIds = new Set(validItems.map((i) => i.id));

    const invalidIds = itemIds.filter((id) => !validItemIds.has(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Items not found: ${invalidIds.join(', ')}`,
      );
    }

    // Upsert items (update if already exists with same itemId + minQuantity)
    const results = await Promise.all(
      dto.items.map((item) =>
        this.prisma.priceListItem.upsert({
          where: {
            priceListId_itemId_minQuantity: {
              priceListId,
              itemId: item.itemId,
              minQuantity: item.minQuantity,
            },
          },
          update: {
            customPrice: item.customPrice,
          },
          create: {
            priceListId,
            itemId: item.itemId,
            customPrice: item.customPrice,
            minQuantity: item.minQuantity,
          },
        }),
      ),
    );

    return results.map((r) => ({
      ...r,
      customPrice: Number(r.customPrice),
      minQuantity: Number(r.minQuantity),
    }));
  }

  async updateItem(
    priceListId: string,
    itemId: string,
    organizationId: string,
    dto: UpdatePriceListItemDto,
  ) {
    // Verify price list belongs to org
    const priceList = await this.prisma.priceList.findFirst({
      where: { id: priceListId, organizationId },
    });
    if (!priceList) {
      throw new NotFoundException('Price list not found');
    }

    const priceListItem = await this.prisma.priceListItem.findFirst({
      where: { id: itemId, priceListId },
    });

    if (!priceListItem) {
      throw new NotFoundException('Price list item not found');
    }

    const updated = await this.prisma.priceListItem.update({
      where: { id: itemId },
      data: {
        customPrice: dto.customPrice,
        minQuantity: dto.minQuantity,
      },
    });

    return {
      ...updated,
      customPrice: Number(updated.customPrice),
      minQuantity: Number(updated.minQuantity),
    };
  }

  async removeItem(
    priceListId: string,
    itemId: string,
    organizationId: string,
  ) {
    const priceList = await this.prisma.priceList.findFirst({
      where: { id: priceListId, organizationId },
    });
    if (!priceList) {
      throw new NotFoundException('Price list not found');
    }

    const priceListItem = await this.prisma.priceListItem.findFirst({
      where: { id: itemId, priceListId },
    });

    if (!priceListItem) {
      throw new NotFoundException('Price list item not found');
    }

    await this.prisma.priceListItem.delete({ where: { id: itemId } });
  }

  async getEffectivePrice(
    organizationId: string,
    dto: EffectivePriceQueryDto,
  ) {
    const { itemId, contactId, quantity = 1 } = dto;

    // Get the item's standard pricing
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, organizationId },
      select: {
        id: true,
        sku: true,
        name: true,
        sellingPrice: true,
        costPrice: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    const standardPrice = Number(item.sellingPrice);
    const now = new Date();

    // If no contact specified, return standard price
    if (!contactId) {
      return {
        itemId: item.id,
        itemName: item.name,
        standardPrice,
        effectivePrice: standardPrice,
        priceListId: null,
        priceListName: null,
        source: 'STANDARD' as const,
      };
    }

    // Get the contact's assigned price list
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true, priceListId: true, displayName: true },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    if (!contact.priceListId) {
      return {
        itemId: item.id,
        itemName: item.name,
        standardPrice,
        effectivePrice: standardPrice,
        priceListId: null,
        priceListName: null,
        source: 'STANDARD' as const,
      };
    }

    // Get the price list (check status and date range)
    const priceList = await this.prisma.priceList.findFirst({
      where: {
        id: contact.priceListId,
        organizationId,
        status: 'ACTIVE',
        OR: [
          { effectiveFrom: null },
          { effectiveFrom: { lte: now } },
        ],
      },
    });

    if (!priceList) {
      return {
        itemId: item.id,
        itemName: item.name,
        standardPrice,
        effectivePrice: standardPrice,
        priceListId: null,
        priceListName: null,
        source: 'STANDARD' as const,
      };
    }

    // Check if effective date range is still valid
    if (priceList.effectiveTo && priceList.effectiveTo < now) {
      return {
        itemId: item.id,
        itemName: item.name,
        standardPrice,
        effectivePrice: standardPrice,
        priceListId: null,
        priceListName: null,
        source: 'STANDARD' as const,
      };
    }

    // Look for specific item price in the price list (with quantity break)
    const priceListItems = await this.prisma.priceListItem.findMany({
      where: {
        priceListId: priceList.id,
        itemId,
        minQuantity: { lte: quantity },
      },
      orderBy: { minQuantity: 'desc' },
    });

    if (priceListItems.length > 0) {
      // Use the best matching quantity break (highest minQuantity that is <= requested qty)
      const bestMatch = priceListItems[0];
      return {
        itemId: item.id,
        itemName: item.name,
        standardPrice,
        effectivePrice: Number(bestMatch.customPrice),
        priceListId: priceList.id,
        priceListName: priceList.name,
        source: 'PRICE_LIST_ITEM' as const,
        minQuantity: Number(bestMatch.minQuantity),
      };
    }

    // No specific item price, apply the markup
    const markupValue = Number(priceList.markupValue);
    let effectivePrice = standardPrice;

    if (priceList.markupType === 'PERCENTAGE') {
      effectivePrice = standardPrice * (1 + markupValue / 100);
    } else {
      effectivePrice = standardPrice + markupValue;
    }

    // Round to 4 decimal places
    effectivePrice = Math.round(effectivePrice * 10000) / 10000;

    return {
      itemId: item.id,
      itemName: item.name,
      standardPrice,
      effectivePrice,
      priceListId: priceList.id,
      priceListName: priceList.name,
      source: 'PRICE_LIST_MARKUP' as const,
      markupType: priceList.markupType,
      markupValue,
    };
  }

  async bulkUpdatePrices(
    priceListId: string,
    organizationId: string,
    dto: BulkPriceUpdateDto,
  ) {
    const priceList = await this.prisma.priceList.findFirst({
      where: { id: priceListId, organizationId },
    });

    if (!priceList) {
      throw new NotFoundException('Price list not found');
    }

    // Get all items in the price list
    const items = await this.prisma.priceListItem.findMany({
      where: { priceListId },
    });

    if (items.length === 0) {
      return { updated: 0 };
    }

    // Apply adjustment to each item
    const updates = items.map((item) => {
      let newPrice: number;
      const currentPrice = Number(item.customPrice);

      if (dto.adjustmentType === 'PERCENTAGE') {
        newPrice = currentPrice * (1 + dto.adjustmentValue / 100);
      } else {
        newPrice = currentPrice + dto.adjustmentValue;
      }

      // Ensure price is not negative
      newPrice = Math.max(0, Math.round(newPrice * 10000) / 10000);

      return this.prisma.priceListItem.update({
        where: { id: item.id },
        data: { customPrice: newPrice },
      });
    });

    await Promise.all(updates);

    return { updated: items.length };
  }

  async importItems(
    priceListId: string,
    organizationId: string,
    data: Array<{ sku: string; customPrice: number; minQuantity?: number }>,
  ) {
    const priceList = await this.prisma.priceList.findFirst({
      where: { id: priceListId, organizationId },
    });

    if (!priceList) {
      throw new NotFoundException('Price list not found');
    }

    // Look up items by SKU
    const skus = data.map((d) => d.sku);
    const items = await this.prisma.item.findMany({
      where: { organizationId, sku: { in: skus } },
      select: { id: true, sku: true },
    });
    const skuToItemMap = new Map(items.map((i) => [i.sku, i.id]));

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const row of data) {
      const itemId = skuToItemMap.get(row.sku);
      if (!itemId) {
        results.errors.push(`SKU not found: ${row.sku}`);
        results.skipped++;
        continue;
      }

      try {
        await this.prisma.priceListItem.upsert({
          where: {
            priceListId_itemId_minQuantity: {
              priceListId,
              itemId,
              minQuantity: row.minQuantity || 1,
            },
          },
          update: { customPrice: row.customPrice },
          create: {
            priceListId,
            itemId,
            customPrice: row.customPrice,
            minQuantity: row.minQuantity || 1,
          },
        });
        results.imported++;
      } catch (error) {
        results.errors.push(`Failed to import SKU ${row.sku}: ${error}`);
        results.skipped++;
      }
    }

    return results;
  }
}
