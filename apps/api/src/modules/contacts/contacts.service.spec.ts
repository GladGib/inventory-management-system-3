import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createMockPrismaClient, MockPrismaClient } from '@/test/prisma-mock';
import { createTestContact } from '@/test/factory';
import { mockOrganizationId } from '@/test/auth-mock';
import { ContactType } from './dto/create-contact.dto';

describe('ContactsService', () => {
  let service: ContactsService;
  let prisma: MockPrismaClient;

  beforeEach(async () => {
    prisma = createMockPrismaClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated contacts with outstanding balances', async () => {
      const testContact = createTestContact({
        id: 'contact-1',
        organizationId: mockOrganizationId,
        type: 'CUSTOMER',
        paymentTerm: { id: 'pt-1', name: 'Net 30', days: 30 },
      });

      prisma.contact.findMany.mockResolvedValue([testContact] as any);
      prisma.contact.count.mockResolvedValue(1);

      // Mock getBalance call: findFirst for contact type, then invoice aggregate
      prisma.contact.findFirst.mockResolvedValue({ type: 'CUSTOMER' } as any);
      prisma.invoice.aggregate.mockResolvedValue({
        _sum: { total: 5000, amountPaid: 3000 },
      } as any);

      const result = await service.findAll(mockOrganizationId, {
        page: 1,
        limit: 25,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].outstandingBalance).toBeDefined();
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should apply search filter across companyName, displayName, email, and phone', async () => {
      prisma.contact.findMany.mockResolvedValue([] as any);
      prisma.contact.count.mockResolvedValue(0);

      await service.findAll(mockOrganizationId, {
        search: 'ABC Auto',
        page: 1,
        limit: 25,
      });

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrganizationId,
            OR: expect.arrayContaining([
              { companyName: { contains: 'ABC Auto', mode: 'insensitive' } },
              { displayName: { contains: 'ABC Auto', mode: 'insensitive' } },
              { email: { contains: 'ABC Auto', mode: 'insensitive' } },
              { phone: { contains: 'ABC Auto', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should filter CUSTOMER type to include BOTH contacts', async () => {
      prisma.contact.findMany.mockResolvedValue([] as any);
      prisma.contact.count.mockResolvedValue(0);

      await service.findAll(mockOrganizationId, {
        type: ContactType.CUSTOMER,
        page: 1,
        limit: 25,
      });

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: { in: ['CUSTOMER', 'BOTH'] },
          }),
        }),
      );
    });

    it('should filter VENDOR type to include BOTH contacts', async () => {
      prisma.contact.findMany.mockResolvedValue([] as any);
      prisma.contact.count.mockResolvedValue(0);

      await service.findAll(mockOrganizationId, {
        type: ContactType.VENDOR,
        page: 1,
        limit: 25,
      });

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: { in: ['VENDOR', 'BOTH'] },
          }),
        }),
      );
    });

    it('should return empty list when no contacts match', async () => {
      prisma.contact.findMany.mockResolvedValue([] as any);
      prisma.contact.count.mockResolvedValue(0);

      const result = await service.findAll(mockOrganizationId, {});

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.hasMore).toBe(false);
    });
  });

  describe('findById', () => {
    it('should return a contact with balance information', async () => {
      const testContact = createTestContact({
        id: 'contact-1',
        organizationId: mockOrganizationId,
        type: 'CUSTOMER',
        paymentTerm: { id: 'pt-1', name: 'Net 30' },
        priceList: null,
      });

      // First call: findById
      prisma.contact.findFirst.mockResolvedValueOnce(testContact as any);
      // Second call: getBalance - contact type check
      prisma.contact.findFirst.mockResolvedValueOnce({ type: 'CUSTOMER' } as any);

      prisma.invoice.aggregate.mockResolvedValue({
        _sum: { total: 10000, amountPaid: 6000 },
      } as any);

      const result = await service.findById('contact-1', mockOrganizationId);

      expect(result.id).toBe('contact-1');
      expect(result.totalReceivable).toBe(10000);
      expect(result.totalReceived).toBe(6000);
      expect(result.receivableBalance).toBe(4000);
    });

    it('should throw NotFoundException when contact does not exist', async () => {
      prisma.contact.findFirst.mockResolvedValue(null);

      await expect(
        service.findById('nonexistent', mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      type: ContactType.CUSTOMER,
      companyName: 'New Auto Parts Sdn Bhd',
      displayName: 'New Auto Parts',
      email: 'sales@newauto.com.my',
      phone: '+60312345678',
    };

    it('should create a contact successfully', async () => {
      const createdContact = createTestContact({
        ...createDto,
        organizationId: mockOrganizationId,
        paymentTerm: null,
      });

      prisma.contact.create.mockResolvedValue(createdContact as any);

      const result = await service.create(mockOrganizationId, createDto);

      expect(result.companyName).toBe('New Auto Parts Sdn Bhd');
      expect(result.type).toBe('CUSTOMER');

      expect(prisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: ContactType.CUSTOMER,
            companyName: 'New Auto Parts Sdn Bhd',
            displayName: 'New Auto Parts',
            organizationId: mockOrganizationId,
          }),
        }),
      );
    });

    it('should handle billing and shipping addresses as JSON', async () => {
      const dtoWithAddresses = {
        ...createDto,
        billingAddress: {
          line1: '123 Jalan Test',
          city: 'Kuala Lumpur',
          state: 'Wilayah Persekutuan',
          postcode: '50000',
          country: 'Malaysia',
        },
        shippingAddress: {
          line1: '456 Jalan Ship',
          city: 'Petaling Jaya',
          state: 'Selangor',
          postcode: '47301',
          country: 'Malaysia',
        },
      };

      const createdContact = createTestContact({
        ...dtoWithAddresses,
        organizationId: mockOrganizationId,
        paymentTerm: null,
      });

      prisma.contact.create.mockResolvedValue(createdContact as any);

      await service.create(mockOrganizationId, dtoWithAddresses);

      expect(prisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            billingAddress: expect.objectContaining({
              line1: '123 Jalan Test',
              city: 'Kuala Lumpur',
            }),
            shippingAddress: expect.objectContaining({
              line1: '456 Jalan Ship',
              city: 'Petaling Jaya',
            }),
          }),
        }),
      );
    });

    it('should create a vendor contact', async () => {
      const vendorDto = {
        type: ContactType.VENDOR,
        companyName: 'Parts Supplier Sdn Bhd',
        displayName: 'Parts Supplier',
      };

      const createdContact = createTestContact({
        ...vendorDto,
        organizationId: mockOrganizationId,
        paymentTerm: null,
      });

      prisma.contact.create.mockResolvedValue(createdContact as any);

      const result = await service.create(mockOrganizationId, vendorDto);

      expect(result.type).toBe('VENDOR');
    });
  });

  describe('update', () => {
    it('should update a contact successfully', async () => {
      const existingContact = createTestContact({
        id: 'contact-1',
        organizationId: mockOrganizationId,
        type: 'CUSTOMER',
        paymentTerm: null,
        priceList: null,
      });

      // findById calls
      prisma.contact.findFirst.mockResolvedValueOnce(existingContact as any);
      // getBalance call within findById
      prisma.contact.findFirst.mockResolvedValueOnce({ type: 'CUSTOMER' } as any);
      prisma.invoice.aggregate.mockResolvedValue({
        _sum: { total: 0, amountPaid: 0 },
      } as any);

      const updatedContact = {
        ...existingContact,
        displayName: 'Updated Display Name',
        paymentTerm: null,
      };
      prisma.contact.update.mockResolvedValue(updatedContact as any);

      const result = await service.update('contact-1', mockOrganizationId, {
        displayName: 'Updated Display Name',
      });

      expect(result.displayName).toBe('Updated Display Name');
      expect(prisma.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contact-1' },
          data: expect.objectContaining({
            displayName: 'Updated Display Name',
          }),
        }),
      );
    });

    it('should throw NotFoundException when updating non-existent contact', async () => {
      prisma.contact.findFirst.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', mockOrganizationId, {
          displayName: 'Updated',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle null paymentTermId to unlink payment term', async () => {
      const existingContact = createTestContact({
        id: 'contact-1',
        organizationId: mockOrganizationId,
        paymentTermId: 'pt-1',
        paymentTerm: { id: 'pt-1', name: 'Net 30' },
        priceList: null,
      });

      prisma.contact.findFirst.mockResolvedValueOnce(existingContact as any);
      prisma.contact.findFirst.mockResolvedValueOnce({ type: 'CUSTOMER' } as any);
      prisma.invoice.aggregate.mockResolvedValue({
        _sum: { total: 0, amountPaid: 0 },
      } as any);

      prisma.contact.update.mockResolvedValue({
        ...existingContact,
        paymentTermId: null,
        paymentTerm: null,
      } as any);

      await service.update('contact-1', mockOrganizationId, {
        paymentTermId: null,
      } as any);

      expect(prisma.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentTermId: null,
          }),
        }),
      );
    });
  });

  describe('delete', () => {
    it('should soft-delete a contact by setting status to INACTIVE', async () => {
      const existingContact = createTestContact({
        id: 'contact-1',
        organizationId: mockOrganizationId,
        type: 'CUSTOMER',
        paymentTerm: null,
        priceList: null,
      });

      // findById calls
      prisma.contact.findFirst.mockResolvedValueOnce(existingContact as any);
      prisma.contact.findFirst.mockResolvedValueOnce({ type: 'CUSTOMER' } as any);
      prisma.invoice.aggregate.mockResolvedValue({
        _sum: { total: 0, amountPaid: 0 },
      } as any);

      prisma.contact.update.mockResolvedValue({
        ...existingContact,
        status: 'INACTIVE',
      } as any);

      await service.delete('contact-1', mockOrganizationId);

      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-1' },
        data: { status: 'INACTIVE' },
      });
    });

    it('should throw NotFoundException when deleting non-existent contact', async () => {
      prisma.contact.findFirst.mockResolvedValue(null);

      await expect(
        service.delete('nonexistent', mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBalance', () => {
    it('should calculate customer balance from invoices', async () => {
      prisma.contact.findFirst.mockResolvedValue({ type: 'CUSTOMER' } as any);
      prisma.invoice.aggregate.mockResolvedValue({
        _sum: { total: 15000, amountPaid: 10000 },
      } as any);

      const result = await service.getBalance('contact-1', mockOrganizationId);

      expect(result.totalReceivable).toBe(15000);
      expect(result.totalReceived).toBe(10000);
      expect(result.receivableBalance).toBe(5000);
      expect(result.totalPayable).toBe(0);
      expect(result.totalPaid).toBe(0);
      expect(result.payableBalance).toBe(0);
      expect(result.outstandingBalance).toBe(5000);
    });

    it('should calculate vendor balance from bills', async () => {
      prisma.contact.findFirst.mockResolvedValue({ type: 'VENDOR' } as any);
      prisma.bill.aggregate.mockResolvedValue({
        _sum: { total: 8000, amountPaid: 5000 },
      } as any);

      const result = await service.getBalance('vendor-1', mockOrganizationId);

      expect(result.totalPayable).toBe(8000);
      expect(result.totalPaid).toBe(5000);
      expect(result.payableBalance).toBe(3000);
      expect(result.totalReceivable).toBe(0);
      expect(result.outstandingBalance).toBe(-3000); // net payable
    });

    it('should calculate both receivable and payable for BOTH type contacts', async () => {
      prisma.contact.findFirst.mockResolvedValue({ type: 'BOTH' } as any);
      prisma.invoice.aggregate.mockResolvedValue({
        _sum: { total: 10000, amountPaid: 7000 },
      } as any);
      prisma.bill.aggregate.mockResolvedValue({
        _sum: { total: 5000, amountPaid: 3000 },
      } as any);

      const result = await service.getBalance('both-1', mockOrganizationId);

      expect(result.totalReceivable).toBe(10000);
      expect(result.receivableBalance).toBe(3000); // 10000 - 7000
      expect(result.totalPayable).toBe(5000);
      expect(result.payableBalance).toBe(2000); // 5000 - 3000
      expect(result.outstandingBalance).toBe(1000); // 3000 - 2000
    });

    it('should throw NotFoundException when contact does not exist', async () => {
      prisma.contact.findFirst.mockResolvedValue(null);

      await expect(
        service.getBalance('nonexistent', mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle null aggregation results (no invoices/bills)', async () => {
      prisma.contact.findFirst.mockResolvedValue({ type: 'CUSTOMER' } as any);
      prisma.invoice.aggregate.mockResolvedValue({
        _sum: { total: null, amountPaid: null },
      } as any);

      const result = await service.getBalance('contact-1', mockOrganizationId);

      expect(result.totalReceivable).toBe(0);
      expect(result.totalReceived).toBe(0);
      expect(result.outstandingBalance).toBe(0);
    });
  });

  describe('findCustomers', () => {
    it('should delegate to findAll with CUSTOMER type', async () => {
      prisma.contact.findMany.mockResolvedValue([] as any);
      prisma.contact.count.mockResolvedValue(0);

      const query = { page: 1, limit: 25 };
      await service.findCustomers(mockOrganizationId, query);

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: { in: ['CUSTOMER', 'BOTH'] },
          }),
        }),
      );
    });
  });

  describe('findVendors', () => {
    it('should delegate to findAll with VENDOR type', async () => {
      prisma.contact.findMany.mockResolvedValue([] as any);
      prisma.contact.count.mockResolvedValue(0);

      const query = { page: 1, limit: 25 };
      await service.findVendors(mockOrganizationId, query);

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: { in: ['VENDOR', 'BOTH'] },
          }),
        }),
      );
    });
  });
});
