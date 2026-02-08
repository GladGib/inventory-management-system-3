import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createMockPrismaClient, MockPrismaClient } from '@/test/prisma-mock';
import { createTestItem, createTestWarehouse, createTestStockLevel } from '@/test/factory';
import { mockOrganizationId, mockUserId } from '@/test/auth-mock';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: MockPrismaClient;

  beforeEach(async () => {
    prisma = createMockPrismaClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStockLevels', () => {
    it('should return stock levels with computed fields', async () => {
      const stockLevels = [
        {
          id: 'sl-1',
          itemId: 'item-1',
          warehouseId: 'wh-1',
          stockOnHand: 100,
          committedStock: 20,
          incomingStock: 10,
          item: {
            id: 'item-1',
            sku: 'BRK-001',
            name: 'Brake Pad',
            costPrice: 50,
            reorderLevel: 30,
          },
          warehouse: { id: 'wh-1', name: 'Main Warehouse', code: 'WH-01' },
          updatedAt: new Date(),
        },
      ];

      prisma.stockLevel.findMany.mockResolvedValue(stockLevels as any);

      const result = await service.getStockLevels(mockOrganizationId);

      expect(result).toHaveLength(1);
      expect(result[0].availableStock).toBe(80); // 100 - 20
      expect(result[0].stockValue).toBe(5000); // 100 * 50
      expect(result[0].isLowStock).toBe(false); // 100 > 30
    });

    it('should filter by warehouseId when provided', async () => {
      prisma.stockLevel.findMany.mockResolvedValue([] as any);

      await service.getStockLevels(mockOrganizationId, 'wh-1');

      expect(prisma.stockLevel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            warehouseId: 'wh-1',
          }),
        }),
      );
    });

    it('should filter by itemId when provided', async () => {
      prisma.stockLevel.findMany.mockResolvedValue([] as any);

      await service.getStockLevels(mockOrganizationId, undefined, 'item-1');

      expect(prisma.stockLevel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            itemId: 'item-1',
          }),
        }),
      );
    });

    it('should correctly flag low stock items', async () => {
      const stockLevels = [
        {
          id: 'sl-low',
          itemId: 'item-low',
          warehouseId: 'wh-1',
          stockOnHand: 5,
          committedStock: 0,
          incomingStock: 0,
          item: {
            id: 'item-low',
            sku: 'LOW-001',
            name: 'Low Stock Item',
            costPrice: 10,
            reorderLevel: 20,
          },
          warehouse: { id: 'wh-1', name: 'Main', code: 'WH-01' },
          updatedAt: new Date(),
        },
      ];

      prisma.stockLevel.findMany.mockResolvedValue(stockLevels as any);

      const result = await service.getStockLevels(mockOrganizationId);

      expect(result[0].isLowStock).toBe(true);
    });
  });

  describe('getItemStock', () => {
    it('should return stock levels for a specific item', async () => {
      const item = createTestItem({ id: 'item-1', organizationId: mockOrganizationId });
      prisma.item.findFirst.mockResolvedValue(item as any);
      prisma.stockLevel.findMany.mockResolvedValue([] as any);

      await service.getItemStock('item-1', mockOrganizationId);

      expect(prisma.item.findFirst).toHaveBeenCalledWith({
        where: { id: 'item-1', organizationId: mockOrganizationId },
      });
    });

    it('should throw NotFoundException when item does not exist', async () => {
      prisma.item.findFirst.mockResolvedValue(null);

      await expect(
        service.getItemStock('nonexistent', mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createAdjustment', () => {
    const adjustmentDto = {
      itemId: 'item-1',
      warehouseId: 'wh-1',
      quantity: 10,
      reason: 'CORRECTION' as const,
      notes: 'Correcting count',
    };

    it('should create a positive stock adjustment', async () => {
      const item = createTestItem({ id: 'item-1', organizationId: mockOrganizationId });
      const warehouse = createTestWarehouse({ id: 'wh-1', organizationId: mockOrganizationId });
      const existingStock = createTestStockLevel({
        id: 'sl-1',
        itemId: 'item-1',
        warehouseId: 'wh-1',
        stockOnHand: 50,
      });

      prisma.item.findFirst.mockResolvedValue(item as any);
      prisma.warehouse.findFirst.mockResolvedValue(warehouse as any);
      prisma.stockLevel.findUnique.mockResolvedValue(existingStock as any);

      const createdAdjustment = {
        id: 'adj-1',
        adjustmentNumber: 'ADJ-000001',
        type: 'INCREASE',
        quantity: 10,
        item: { sku: 'BRK-001', name: 'Brake Pad' },
        warehouse: { name: 'Main', code: 'WH-01' },
      };

      const mockTx = {
        stockAdjustment: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(createdAdjustment),
        },
        stockLevel: {
          update: jest.fn().mockResolvedValue({}),
          create: jest.fn(),
        },
      };

      prisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

      const result = await service.createAdjustment(
        mockOrganizationId,
        mockUserId,
        adjustmentDto as any,
      );

      expect(result.adjustmentNumber).toBe('ADJ-000001');
      expect(result.type).toBe('INCREASE');
      expect(mockTx.stockLevel.update).toHaveBeenCalled();
      expect(mockTx.stockLevel.create).not.toHaveBeenCalled();
    });

    it('should create a new stock level when none exists', async () => {
      const item = createTestItem({ id: 'item-1', organizationId: mockOrganizationId });
      const warehouse = createTestWarehouse({ id: 'wh-1', organizationId: mockOrganizationId });

      prisma.item.findFirst.mockResolvedValue(item as any);
      prisma.warehouse.findFirst.mockResolvedValue(warehouse as any);
      prisma.stockLevel.findUnique.mockResolvedValue(null);

      const createdAdjustment = {
        id: 'adj-1',
        adjustmentNumber: 'ADJ-000001',
        type: 'INCREASE',
        quantity: 10,
      };

      const mockTx = {
        stockAdjustment: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(createdAdjustment),
        },
        stockLevel: {
          update: jest.fn(),
          create: jest.fn().mockResolvedValue({}),
        },
      };

      prisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

      await service.createAdjustment(mockOrganizationId, mockUserId, adjustmentDto as any);

      expect(mockTx.stockLevel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            itemId: 'item-1',
            warehouseId: 'wh-1',
            stockOnHand: 10,
          }),
        }),
      );
    });

    it('should throw BadRequestException for insufficient stock on negative adjustment', async () => {
      const item = createTestItem({ id: 'item-1', organizationId: mockOrganizationId });
      const warehouse = createTestWarehouse({ id: 'wh-1', organizationId: mockOrganizationId });
      const existingStock = createTestStockLevel({
        itemId: 'item-1',
        warehouseId: 'wh-1',
        stockOnHand: 5,
      });

      prisma.item.findFirst.mockResolvedValue(item as any);
      prisma.warehouse.findFirst.mockResolvedValue(warehouse as any);
      prisma.stockLevel.findUnique.mockResolvedValue(existingStock as any);

      await expect(
        service.createAdjustment(mockOrganizationId, mockUserId, {
          ...adjustmentDto,
          quantity: -10, // trying to remove 10 when only 5 in stock
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when item does not exist', async () => {
      prisma.item.findFirst.mockResolvedValue(null);

      await expect(
        service.createAdjustment(mockOrganizationId, mockUserId, adjustmentDto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when warehouse does not exist', async () => {
      const item = createTestItem({ id: 'item-1', organizationId: mockOrganizationId });
      prisma.item.findFirst.mockResolvedValue(item as any);
      prisma.warehouse.findFirst.mockResolvedValue(null);

      await expect(
        service.createAdjustment(mockOrganizationId, mockUserId, adjustmentDto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should generate correct sequential adjustment numbers', async () => {
      const item = createTestItem({ id: 'item-1', organizationId: mockOrganizationId });
      const warehouse = createTestWarehouse({ id: 'wh-1', organizationId: mockOrganizationId });

      prisma.item.findFirst.mockResolvedValue(item as any);
      prisma.warehouse.findFirst.mockResolvedValue(warehouse as any);
      prisma.stockLevel.findUnique.mockResolvedValue(null);

      const mockTx = {
        stockAdjustment: {
          findFirst: jest.fn().mockResolvedValue({ adjustmentNumber: 'ADJ-000005' }),
          create: jest.fn().mockImplementation((args: any) => Promise.resolve({
            ...args.data,
            id: 'adj-new',
          })),
        },
        stockLevel: {
          update: jest.fn(),
          create: jest.fn().mockResolvedValue({}),
        },
      };

      prisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

      await service.createAdjustment(mockOrganizationId, mockUserId, adjustmentDto as any);

      expect(mockTx.stockAdjustment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            adjustmentNumber: 'ADJ-000006',
          }),
        }),
      );
    });
  });

  describe('createTransfer', () => {
    const transferDto = {
      sourceWarehouseId: 'wh-source',
      destinationWarehouseId: 'wh-dest',
      items: [{ itemId: 'item-1', quantity: 10 }],
      notes: 'Test transfer',
    };

    it('should throw BadRequestException when source and destination are the same', async () => {
      await expect(
        service.createTransfer(mockOrganizationId, mockUserId, {
          ...transferDto,
          sourceWarehouseId: 'wh-1',
          destinationWarehouseId: 'wh-1',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when source warehouse does not exist', async () => {
      prisma.warehouse.findFirst
        .mockResolvedValueOnce(null) // source not found
        .mockResolvedValueOnce(createTestWarehouse({ id: 'wh-dest' }) as any);

      await expect(
        service.createTransfer(mockOrganizationId, mockUserId, transferDto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when destination warehouse does not exist', async () => {
      prisma.warehouse.findFirst
        .mockResolvedValueOnce(createTestWarehouse({ id: 'wh-source' }) as any)
        .mockResolvedValueOnce(null); // destination not found

      await expect(
        service.createTransfer(mockOrganizationId, mockUserId, transferDto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create a transfer in DRAFT status', async () => {
      prisma.warehouse.findFirst
        .mockResolvedValueOnce(createTestWarehouse({ id: 'wh-source' }) as any)
        .mockResolvedValueOnce(createTestWarehouse({ id: 'wh-dest' }) as any);

      prisma.inventoryTransfer.findFirst.mockResolvedValue(null); // no previous transfers

      const createdTransfer = {
        id: 'transfer-1',
        transferNumber: 'TRF-000001',
        status: 'DRAFT',
        sourceWarehouse: { name: 'Source', code: 'WH-S' },
        targetWarehouse: { name: 'Dest', code: 'WH-D' },
        items: [],
      };

      prisma.inventoryTransfer.create.mockResolvedValue(createdTransfer as any);

      const result = await service.createTransfer(
        mockOrganizationId,
        mockUserId,
        transferDto as any,
      );

      expect(result.status).toBe('DRAFT');
      expect(result.transferNumber).toBe('TRF-000001');
    });
  });

  describe('getAdjustments', () => {
    it('should return adjustments filtered by organization', async () => {
      prisma.stockAdjustment.findMany.mockResolvedValue([] as any);

      await service.getAdjustments(mockOrganizationId, {});

      expect(prisma.stockAdjustment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: mockOrganizationId },
          orderBy: { adjustmentDate: 'desc' },
        }),
      );
    });

    it('should apply item and warehouse filters', async () => {
      prisma.stockAdjustment.findMany.mockResolvedValue([] as any);

      await service.getAdjustments(mockOrganizationId, {
        itemId: 'item-1',
        warehouseId: 'wh-1',
      });

      expect(prisma.stockAdjustment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrganizationId,
            itemId: 'item-1',
            warehouseId: 'wh-1',
          }),
        }),
      );
    });
  });

  describe('issueTransfer', () => {
    it('should throw NotFoundException when transfer does not exist', async () => {
      prisma.inventoryTransfer.findFirst.mockResolvedValue(null);

      await expect(
        service.issueTransfer('nonexistent', mockOrganizationId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when transfer is not in DRAFT status', async () => {
      prisma.inventoryTransfer.findFirst.mockResolvedValue({
        id: 'transfer-1',
        status: 'IN_TRANSIT',
        items: [],
      } as any);

      await expect(
        service.issueTransfer('transfer-1', mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('receiveTransfer', () => {
    it('should throw NotFoundException when transfer does not exist', async () => {
      prisma.inventoryTransfer.findFirst.mockResolvedValue(null);

      await expect(
        service.receiveTransfer('nonexistent', mockOrganizationId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when transfer is not IN_TRANSIT', async () => {
      prisma.inventoryTransfer.findFirst.mockResolvedValue({
        id: 'transfer-1',
        status: 'DRAFT',
        items: [],
      } as any);

      await expect(
        service.receiveTransfer('transfer-1', mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelTransfer', () => {
    it('should throw NotFoundException when transfer does not exist', async () => {
      prisma.inventoryTransfer.findFirst.mockResolvedValue(null);

      await expect(
        service.cancelTransfer('nonexistent', mockOrganizationId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already received transfers', async () => {
      prisma.inventoryTransfer.findFirst.mockResolvedValue({
        id: 'transfer-1',
        status: 'RECEIVED',
        items: [],
      } as any);

      await expect(
        service.cancelTransfer('transfer-1', mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for already cancelled transfers', async () => {
      prisma.inventoryTransfer.findFirst.mockResolvedValue({
        id: 'transfer-1',
        status: 'CANCELLED',
        items: [],
      } as any);

      await expect(
        service.cancelTransfer('transfer-1', mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
