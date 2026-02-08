import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ItemsService } from './items.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createMockPrismaClient, MockPrismaClient } from '@/test/prisma-mock';
import { createTestItem } from '@/test/factory';
import { mockOrganizationId, mockUserId } from '@/test/auth-mock';

describe('ItemsService', () => {
  let service: ItemsService;
  let prisma: MockPrismaClient;

  beforeEach(async () => {
    prisma = createMockPrismaClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ItemsService>(ItemsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated items with stock calculations', async () => {
      const testItem = createTestItem({
        organizationId: mockOrganizationId,
        stockLevels: [
          { warehouseId: 'wh-1', stockOnHand: 50, committedStock: 10 },
          { warehouseId: 'wh-2', stockOnHand: 30, committedStock: 5 },
        ],
        category: { id: 'cat-1', name: 'Brakes' },
        taxRate: null,
      });

      prisma.item.findMany.mockResolvedValue([testItem] as any);
      prisma.item.count.mockResolvedValue(1);

      const result = await service.findAll(mockOrganizationId, {
        page: 1,
        limit: 25,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].stockOnHand).toBe(80);
      expect(result.data[0].committedStock).toBe(15);
      expect(result.data[0].availableStock).toBe(65);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(25);

      expect(prisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: mockOrganizationId },
          skip: 0,
          take: 25,
        }),
      );
    });

    it('should apply search filter across sku, name, partNumber, and crossReferences', async () => {
      prisma.item.findMany.mockResolvedValue([] as any);
      prisma.item.count.mockResolvedValue(0);

      await service.findAll(mockOrganizationId, {
        search: 'BRK-001',
        page: 1,
        limit: 25,
      });

      expect(prisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrganizationId,
            OR: expect.arrayContaining([
              { sku: { contains: 'BRK-001', mode: 'insensitive' } },
              { name: { contains: 'BRK-001', mode: 'insensitive' } },
              { partNumber: { contains: 'BRK-001', mode: 'insensitive' } },
              { crossReferences: { has: 'BRK-001' } },
            ]),
          }),
        }),
      );
    });

    it('should apply type and category filters', async () => {
      prisma.item.findMany.mockResolvedValue([] as any);
      prisma.item.count.mockResolvedValue(0);

      await service.findAll(mockOrganizationId, {
        type: 'INVENTORY' as any,
        categoryId: 'cat-1',
        page: 1,
        limit: 10,
      });

      expect(prisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrganizationId,
            type: 'INVENTORY',
            categoryId: 'cat-1',
          }),
        }),
      );
    });

    it('should flag low stock items correctly', async () => {
      const lowStockItem = createTestItem({
        organizationId: mockOrganizationId,
        reorderLevel: 20,
        stockLevels: [
          { warehouseId: 'wh-1', stockOnHand: 5, committedStock: 0 },
        ],
        category: null,
        taxRate: null,
      });

      prisma.item.findMany.mockResolvedValue([lowStockItem] as any);
      prisma.item.count.mockResolvedValue(1);

      const result = await service.findAll(mockOrganizationId, {});

      expect(result.data[0].isLowStock).toBe(true);
    });

    it('should return empty list when no items match', async () => {
      prisma.item.findMany.mockResolvedValue([] as any);
      prisma.item.count.mockResolvedValue(0);

      const result = await service.findAll(mockOrganizationId, {});

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.hasMore).toBe(false);
    });
  });

  describe('findById', () => {
    it('should return an item with stock calculations', async () => {
      const testItem = createTestItem({
        id: 'item-1',
        organizationId: mockOrganizationId,
        costPrice: 50,
        reorderLevel: 10,
        stockLevels: [
          { warehouseId: 'wh-1', stockOnHand: 100, committedStock: 20, warehouse: { id: 'wh-1', name: 'Main', code: 'WH-01' } },
        ],
        category: { id: 'cat-1', name: 'Brakes' },
        taxRate: null,
        itemGroup: null,
      });

      prisma.item.findFirst.mockResolvedValue(testItem as any);

      const result = await service.findById('item-1', mockOrganizationId);

      expect(result.stockOnHand).toBe(100);
      expect(result.committedStock).toBe(20);
      expect(result.availableStock).toBe(80);
      expect(result.stockValue).toBe(5000); // 100 * 50
      expect(result.isLowStock).toBe(false);

      expect(prisma.item.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1', organizationId: mockOrganizationId },
        }),
      );
    });

    it('should throw NotFoundException when item does not exist', async () => {
      prisma.item.findFirst.mockResolvedValue(null);

      await expect(
        service.findById('nonexistent-id', mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should correctly identify low stock items', async () => {
      const lowStockItem = createTestItem({
        id: 'item-low',
        organizationId: mockOrganizationId,
        costPrice: 10,
        reorderLevel: 50,
        stockLevels: [
          { warehouseId: 'wh-1', stockOnHand: 30, committedStock: 0, warehouse: { id: 'wh-1', name: 'Main', code: 'WH-01' } },
        ],
        category: null,
        taxRate: null,
        itemGroup: null,
      });

      prisma.item.findFirst.mockResolvedValue(lowStockItem as any);

      const result = await service.findById('item-low', mockOrganizationId);

      expect(result.isLowStock).toBe(true);
    });
  });

  describe('create', () => {
    const createDto = {
      sku: 'BRK-001',
      name: 'Brake Pad Set',
      type: 'INVENTORY' as const,
      unit: 'SET',
      costPrice: 85,
      sellingPrice: 120,
    };

    it('should create an item successfully', async () => {
      prisma.item.findFirst.mockResolvedValue(null); // no duplicate SKU

      const createdItem = createTestItem({
        ...createDto,
        organizationId: mockOrganizationId,
        category: null,
        taxRate: null,
      });

      const mockTx = {
        item: {
          create: jest.fn().mockResolvedValue(createdItem),
        },
        warehouse: { findFirst: jest.fn() },
        stockLevel: { create: jest.fn() },
        stockAdjustment: { findFirst: jest.fn(), create: jest.fn() },
      };

      prisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

      const result = await service.create(mockOrganizationId, mockUserId, createDto as any);

      expect(result).toEqual(createdItem);
      expect(mockTx.item.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sku: 'BRK-001',
            name: 'Brake Pad Set',
            organizationId: mockOrganizationId,
          }),
        }),
      );
    });

    it('should throw ConflictException for duplicate SKU', async () => {
      prisma.item.findFirst.mockResolvedValue(createTestItem({ sku: 'BRK-001' }) as any);

      await expect(
        service.create(mockOrganizationId, mockUserId, createDto as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid category', async () => {
      prisma.item.findFirst.mockResolvedValue(null); // no duplicate SKU
      prisma.category.findFirst.mockResolvedValue(null); // category not found

      await expect(
        service.create(mockOrganizationId, mockUserId, {
          ...createDto,
          categoryId: 'invalid-cat-id',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid tax rate', async () => {
      prisma.item.findFirst.mockResolvedValue(null); // no duplicate SKU
      prisma.taxRate.findFirst.mockResolvedValue(null); // tax rate not found

      await expect(
        service.create(mockOrganizationId, mockUserId, {
          ...createDto,
          taxRateId: 'invalid-tax-id',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create opening stock when provided', async () => {
      prisma.item.findFirst.mockResolvedValue(null); // no duplicate SKU

      const createdItem = createTestItem({
        id: 'new-item-id',
        ...createDto,
        organizationId: mockOrganizationId,
        category: null,
        taxRate: null,
      });

      const defaultWarehouse = { id: 'default-wh', name: 'Default', isDefault: true };

      const mockTx = {
        item: {
          create: jest.fn().mockResolvedValue(createdItem),
        },
        warehouse: {
          findFirst: jest.fn().mockResolvedValue(defaultWarehouse),
        },
        stockLevel: {
          create: jest.fn().mockResolvedValue({}),
        },
        stockAdjustment: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
        },
      };

      prisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

      await service.create(mockOrganizationId, mockUserId, {
        ...createDto,
        openingStock: 100,
      } as any);

      expect(mockTx.stockLevel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            itemId: 'new-item-id',
            warehouseId: 'default-wh',
            stockOnHand: 100,
          }),
        }),
      );

      expect(mockTx.stockAdjustment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            adjustmentNumber: 'ADJ-000001',
            type: 'INCREASE',
            organizationId: mockOrganizationId,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update an item successfully', async () => {
      const existingItem = createTestItem({
        id: 'item-1',
        sku: 'BRK-001',
        organizationId: mockOrganizationId,
        stockLevels: [],
        category: null,
        taxRate: null,
        itemGroup: null,
      });

      prisma.item.findFirst.mockResolvedValue(existingItem as any);

      const updatedItem = { ...existingItem, name: 'Updated Brake Pad', category: null, taxRate: null };
      prisma.item.update.mockResolvedValue(updatedItem as any);

      const result = await service.update('item-1', mockOrganizationId, {
        name: 'Updated Brake Pad',
      } as any);

      expect(result.name).toBe('Updated Brake Pad');
      expect(prisma.item.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: { name: 'Updated Brake Pad' },
        }),
      );
    });

    it('should throw ConflictException when updating to an existing SKU', async () => {
      const existingItem = createTestItem({
        id: 'item-1',
        sku: 'BRK-001',
        organizationId: mockOrganizationId,
        stockLevels: [],
        category: null,
        taxRate: null,
        itemGroup: null,
      });

      // First call: findById succeeds
      prisma.item.findFirst.mockResolvedValueOnce(existingItem as any);
      // Second call: duplicate check finds another item with the same SKU
      prisma.item.findFirst.mockResolvedValueOnce(
        createTestItem({ id: 'item-2', sku: 'BRK-002' }) as any,
      );

      await expect(
        service.update('item-1', mockOrganizationId, { sku: 'BRK-002' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when item does not exist', async () => {
      prisma.item.findFirst.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', mockOrganizationId, { name: 'Test' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should soft-delete an item with zero stock', async () => {
      const testItem = createTestItem({
        id: 'item-1',
        organizationId: mockOrganizationId,
        stockLevels: [
          { warehouseId: 'wh-1', stockOnHand: 0, committedStock: 0, warehouse: { id: 'wh-1', name: 'Main', code: 'WH-01' } },
        ],
        category: null,
        taxRate: null,
        itemGroup: null,
      });

      prisma.item.findFirst.mockResolvedValue(testItem as any);
      prisma.item.update.mockResolvedValue({ ...testItem, status: 'INACTIVE' } as any);

      await service.delete('item-1', mockOrganizationId);

      expect(prisma.item.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { status: 'INACTIVE' },
      });
    });

    it('should throw BadRequestException when deleting item with stock', async () => {
      const testItem = createTestItem({
        id: 'item-1',
        organizationId: mockOrganizationId,
        stockLevels: [
          { warehouseId: 'wh-1', stockOnHand: 50, committedStock: 0, warehouse: { id: 'wh-1', name: 'Main', code: 'WH-01' } },
        ],
        category: null,
        taxRate: null,
        itemGroup: null,
      });

      prisma.item.findFirst.mockResolvedValue(testItem as any);

      await expect(
        service.delete('item-1', mockOrganizationId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when deleting non-existent item', async () => {
      prisma.item.findFirst.mockResolvedValue(null);

      await expect(
        service.delete('nonexistent', mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLowStockItems', () => {
    it('should return only items with stock below reorder level', async () => {
      const items = [
        createTestItem({
          id: 'item-low',
          reorderLevel: 20,
          stockLevels: [{ stockOnHand: 5 }],
          category: { id: 'cat-1', name: 'Brakes' },
        }),
        createTestItem({
          id: 'item-ok',
          reorderLevel: 10,
          stockLevels: [{ stockOnHand: 50 }],
          category: { id: 'cat-2', name: 'Filters' },
        }),
      ];

      prisma.item.findMany.mockResolvedValue(items as any);

      const result = await service.getLowStockItems(mockOrganizationId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('item-low');
      expect(result[0].stockOnHand).toBe(5);
    });
  });
});
