import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/create-account.dto';
import {
  CreateJournalEntryDto,
  GenerateJournalEntryDto,
} from './dto/create-journal-entry.dto';
import { UpdateAccountMappingsDto } from './dto/account-mapping.dto';
import { ExportFormat } from './dto/export-query.dto';
import * as ExcelJS from 'exceljs';

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  // ============ Chart of Accounts ============

  async getChartOfAccounts(organizationId: string) {
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { organizationId },
      include: {
        parent: { select: { id: true, accountCode: true, name: true } },
        children: {
          select: { id: true, accountCode: true, name: true, type: true, isActive: true },
          orderBy: { accountCode: 'asc' },
        },
        _count: { select: { journalEntryLines: true } },
      },
      orderBy: { accountCode: 'asc' },
    });

    return accounts;
  }

  async getChartOfAccountsTree(organizationId: string) {
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { organizationId },
      orderBy: { accountCode: 'asc' },
    });

    // Build tree structure
    const accountMap = new Map(accounts.map((a) => [a.id, { ...a, children: [] as any[] }]));
    const tree: any[] = [];

    for (const account of accountMap.values()) {
      if (account.parentId && accountMap.has(account.parentId)) {
        accountMap.get(account.parentId)!.children.push(account);
      } else {
        tree.push(account);
      }
    }

    return tree;
  }

  async createAccount(organizationId: string, dto: CreateAccountDto) {
    // Check for duplicate account code
    const existing = await this.prisma.chartOfAccount.findUnique({
      where: {
        organizationId_accountCode: {
          organizationId,
          accountCode: dto.accountCode,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Account code ${dto.accountCode} already exists`);
    }

    // Validate parent if provided
    if (dto.parentId) {
      const parent = await this.prisma.chartOfAccount.findFirst({
        where: { id: dto.parentId, organizationId },
      });
      if (!parent) {
        throw new NotFoundException('Parent account not found');
      }
    }

    return this.prisma.chartOfAccount.create({
      data: {
        accountCode: dto.accountCode,
        name: dto.name,
        type: dto.type,
        parentId: dto.parentId,
        isSystem: dto.isSystem || false,
        organizationId,
      },
      include: {
        parent: { select: { id: true, accountCode: true, name: true } },
      },
    });
  }

  async updateAccount(id: string, organizationId: string, dto: UpdateAccountDto) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: { id, organizationId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.isSystem) {
      throw new BadRequestException('System accounts cannot be modified');
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException('Account cannot be its own parent');
      }
      if (dto.parentId !== null) {
        const parent = await this.prisma.chartOfAccount.findFirst({
          where: { id: dto.parentId, organizationId },
        });
        if (!parent) {
          throw new NotFoundException('Parent account not found');
        }
      }
    }

    return this.prisma.chartOfAccount.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        parentId: dto.parentId,
        isActive: dto.isActive,
      },
      include: {
        parent: { select: { id: true, accountCode: true, name: true } },
      },
    });
  }

  async deleteAccount(id: string, organizationId: string) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: {
            journalEntryLines: true,
            children: true,
            accountMappings: true,
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.isSystem) {
      throw new BadRequestException('System accounts cannot be deleted');
    }

    if (account._count.journalEntryLines > 0) {
      throw new BadRequestException(
        'Cannot delete account with existing journal entries. Deactivate it instead.',
      );
    }

    if (account._count.children > 0) {
      throw new BadRequestException(
        'Cannot delete account with child accounts. Remove children first.',
      );
    }

    if (account._count.accountMappings > 0) {
      throw new BadRequestException(
        'Cannot delete account that is used in account mappings. Update mappings first.',
      );
    }

    await this.prisma.chartOfAccount.delete({ where: { id } });
    return { message: 'Account deleted successfully' };
  }

  // ============ Journal Entries ============

  async getJournalEntries(
    organizationId: string,
    filters: {
      status?: string;
      sourceType?: string;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
    },
  ) {
    const { status, sourceType, dateFrom, dateTo, page = 1, limit = 25 } = filters;

    const where: any = {
      organizationId,
      ...(status && { status }),
      ...(sourceType && { sourceType }),
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom && { gte: dateFrom }),
              ...(dateTo && { lte: dateTo }),
            },
          }
        : {}),
    };

    const [entries, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        include: {
          lines: {
            include: {
              account: {
                select: { id: true, accountCode: true, name: true, type: true },
              },
            },
          },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    return {
      data: entries,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getJournalEntry(id: string, organizationId: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, organizationId },
      include: {
        lines: {
          include: {
            account: {
              select: { id: true, accountCode: true, name: true, type: true },
            },
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    return entry;
  }

  async createJournalEntry(
    organizationId: string,
    userId: string,
    dto: CreateJournalEntryDto,
  ) {
    // Validate that debits equal credits
    const totalDebit = dto.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = dto.lines.reduce((sum, line) => sum + line.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Debits (${totalDebit.toFixed(2)}) must equal credits (${totalCredit.toFixed(2)})`,
      );
    }

    // Validate each line has either debit or credit (not both non-zero)
    for (const line of dto.lines) {
      if (line.debit > 0 && line.credit > 0) {
        throw new BadRequestException(
          'A journal entry line cannot have both debit and credit amounts',
        );
      }
      if (line.debit === 0 && line.credit === 0) {
        throw new BadRequestException(
          'A journal entry line must have either a debit or credit amount',
        );
      }
    }

    // Validate accounts exist
    const accountIds = [...new Set(dto.lines.map((l) => l.accountId))];
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { id: { in: accountIds }, organizationId, isActive: true },
    });

    if (accounts.length !== accountIds.length) {
      throw new BadRequestException('One or more accounts not found or inactive');
    }

    // Generate entry number
    const entryNumber = await this.generateEntryNumber(organizationId);

    return this.prisma.journalEntry.create({
      data: {
        entryNumber,
        date: dto.date,
        description: dto.description,
        sourceType: dto.sourceType || 'MANUAL',
        sourceId: dto.sourceId,
        status: dto.status || 'DRAFT',
        organizationId,
        createdById: userId,
        lines: {
          create: dto.lines.map((line) => ({
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
            description: line.description,
          })),
        },
      },
      include: {
        lines: {
          include: {
            account: {
              select: { id: true, accountCode: true, name: true, type: true },
            },
          },
        },
      },
    });
  }

  async generateFromSource(
    organizationId: string,
    userId: string,
    dto: GenerateJournalEntryDto,
  ) {
    const { sourceType, sourceId } = dto;

    // Get account mappings
    const mappings = await this.prisma.accountMapping.findMany({
      where: { organizationId },
      include: { account: true },
    });

    const mappingMap = new Map(mappings.map((m) => [m.transactionType, m.accountId]));

    switch (sourceType) {
      case 'INVOICE':
        return this.generateFromInvoice(organizationId, userId, sourceId, mappingMap);
      case 'PAYMENT':
        return this.generateFromPayment(organizationId, userId, sourceId, mappingMap);
      case 'BILL':
        return this.generateFromBill(organizationId, userId, sourceId, mappingMap);
      case 'VENDOR_PAYMENT':
        return this.generateFromVendorPayment(organizationId, userId, sourceId, mappingMap);
      default:
        throw new BadRequestException(`Unsupported source type: ${sourceType}`);
    }
  }

  private async generateFromInvoice(
    organizationId: string,
    userId: string,
    invoiceId: string,
    mappingMap: Map<string, string>,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: {
        customer: { select: { displayName: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const arAccountId = mappingMap.get('SALES');
    const revenueAccountId = mappingMap.get('SALES');
    const receivableAccountId = this.getAccountOrThrow(mappingMap, 'PAYMENT_RECEIVED', 'Accounts Receivable');
    const salesAccountId = this.getAccountOrThrow(mappingMap, 'SALES', 'Sales Revenue');
    const taxAccountId = mappingMap.get('TAX_OUTPUT');

    const lines: { accountId: string; debit: number; credit: number; description?: string }[] = [];

    // DR Accounts Receivable
    lines.push({
      accountId: receivableAccountId,
      debit: Number(invoice.total),
      credit: 0,
      description: `Invoice ${invoice.invoiceNumber} - ${invoice.customer?.displayName || ''}`,
    });

    // CR Revenue (subtotal minus discount)
    const netRevenue = Number(invoice.subtotal) - Number(invoice.discountAmount);
    if (netRevenue > 0) {
      lines.push({
        accountId: salesAccountId,
        debit: 0,
        credit: netRevenue,
        description: `Sales revenue - ${invoice.invoiceNumber}`,
      });
    }

    // CR Tax Payable
    if (Number(invoice.taxAmount) > 0 && taxAccountId) {
      lines.push({
        accountId: taxAccountId,
        debit: 0,
        credit: Number(invoice.taxAmount),
        description: `Tax payable - ${invoice.invoiceNumber}`,
      });
    }

    const entryNumber = await this.generateEntryNumber(organizationId);

    return this.prisma.journalEntry.create({
      data: {
        entryNumber,
        date: invoice.invoiceDate,
        description: `Invoice ${invoice.invoiceNumber} - ${invoice.customer?.displayName || ''}`,
        sourceType: 'INVOICE',
        sourceId: invoiceId,
        status: 'POSTED',
        organizationId,
        createdById: userId,
        lines: {
          create: lines,
        },
      },
      include: {
        lines: {
          include: {
            account: {
              select: { id: true, accountCode: true, name: true, type: true },
            },
          },
        },
      },
    });
  }

  private async generateFromPayment(
    organizationId: string,
    userId: string,
    paymentId: string,
    mappingMap: Map<string, string>,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, organizationId },
      include: {
        customer: { select: { displayName: true } },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const cashAccountId = this.getAccountOrThrow(mappingMap, 'PAYMENT_RECEIVED', 'Cash/Bank');
    const receivableAccountId = this.getAccountOrThrow(mappingMap, 'SALES', 'Accounts Receivable');

    // Look for specific Accounts Receivable mapping, fall back
    // DR Cash/Bank, CR Accounts Receivable
    const lines = [
      {
        accountId: cashAccountId,
        debit: Number(payment.amount),
        credit: 0,
        description: `Payment received ${payment.paymentNumber} - ${payment.customer?.displayName || ''}`,
      },
      {
        accountId: receivableAccountId,
        debit: 0,
        credit: Number(payment.amount),
        description: `Payment applied ${payment.paymentNumber}`,
      },
    ];

    const entryNumber = await this.generateEntryNumber(organizationId);

    return this.prisma.journalEntry.create({
      data: {
        entryNumber,
        date: payment.paymentDate,
        description: `Payment ${payment.paymentNumber} from ${payment.customer?.displayName || ''}`,
        sourceType: 'PAYMENT',
        sourceId: paymentId,
        status: 'POSTED',
        organizationId,
        createdById: userId,
        lines: {
          create: lines,
        },
      },
      include: {
        lines: {
          include: {
            account: {
              select: { id: true, accountCode: true, name: true, type: true },
            },
          },
        },
      },
    });
  }

  private async generateFromBill(
    organizationId: string,
    userId: string,
    billId: string,
    mappingMap: Map<string, string>,
  ) {
    const bill = await this.prisma.bill.findFirst({
      where: { id: billId, organizationId },
      include: {
        vendor: { select: { displayName: true } },
      },
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    const purchaseAccountId = this.getAccountOrThrow(mappingMap, 'PURCHASE', 'Purchases/Expense');
    const payableAccountId = this.getAccountOrThrow(mappingMap, 'PAYMENT_MADE', 'Accounts Payable');
    const taxInputAccountId = mappingMap.get('TAX_INPUT');

    const lines: { accountId: string; debit: number; credit: number; description?: string }[] = [];

    // DR Expense/Inventory (subtotal minus discount)
    const netAmount = Number(bill.subtotal) - Number(bill.discountAmount);
    if (netAmount > 0) {
      lines.push({
        accountId: purchaseAccountId,
        debit: netAmount,
        credit: 0,
        description: `Bill ${bill.billNumber} - ${bill.vendor?.displayName || ''}`,
      });
    }

    // DR Tax Receivable
    if (Number(bill.taxAmount) > 0 && taxInputAccountId) {
      lines.push({
        accountId: taxInputAccountId,
        debit: Number(bill.taxAmount),
        credit: 0,
        description: `Input tax - ${bill.billNumber}`,
      });
    }

    // CR Accounts Payable
    lines.push({
      accountId: payableAccountId,
      debit: 0,
      credit: Number(bill.total),
      description: `Accounts payable - ${bill.billNumber}`,
    });

    const entryNumber = await this.generateEntryNumber(organizationId);

    return this.prisma.journalEntry.create({
      data: {
        entryNumber,
        date: bill.billDate,
        description: `Bill ${bill.billNumber} from ${bill.vendor?.displayName || ''}`,
        sourceType: 'BILL',
        sourceId: billId,
        status: 'POSTED',
        organizationId,
        createdById: userId,
        lines: {
          create: lines,
        },
      },
      include: {
        lines: {
          include: {
            account: {
              select: { id: true, accountCode: true, name: true, type: true },
            },
          },
        },
      },
    });
  }

  private async generateFromVendorPayment(
    organizationId: string,
    userId: string,
    paymentId: string,
    mappingMap: Map<string, string>,
  ) {
    const payment = await this.prisma.vendorPayment.findFirst({
      where: { id: paymentId, organizationId },
      include: {
        vendor: { select: { displayName: true } },
      },
    });

    if (!payment) {
      throw new NotFoundException('Vendor payment not found');
    }

    const payableAccountId = this.getAccountOrThrow(mappingMap, 'PAYMENT_MADE', 'Accounts Payable');
    const cashAccountId = this.getAccountOrThrow(mappingMap, 'PAYMENT_RECEIVED', 'Cash/Bank');

    // DR Accounts Payable, CR Cash/Bank
    const lines = [
      {
        accountId: payableAccountId,
        debit: Number(payment.amount),
        credit: 0,
        description: `Payment to vendor ${payment.paymentNumber} - ${payment.vendor?.displayName || ''}`,
      },
      {
        accountId: cashAccountId,
        debit: 0,
        credit: Number(payment.amount),
        description: `Cash/bank payment ${payment.paymentNumber}`,
      },
    ];

    const entryNumber = await this.generateEntryNumber(organizationId);

    return this.prisma.journalEntry.create({
      data: {
        entryNumber,
        date: payment.paymentDate,
        description: `Payment ${payment.paymentNumber} to ${payment.vendor?.displayName || ''}`,
        sourceType: 'VENDOR_PAYMENT',
        sourceId: paymentId,
        status: 'POSTED',
        organizationId,
        createdById: userId,
        lines: {
          create: lines,
        },
      },
      include: {
        lines: {
          include: {
            account: {
              select: { id: true, accountCode: true, name: true, type: true },
            },
          },
        },
      },
    });
  }

  private getAccountOrThrow(
    mappingMap: Map<string, string>,
    transactionType: string,
    label: string,
  ): string {
    const accountId = mappingMap.get(transactionType);
    if (!accountId) {
      throw new BadRequestException(
        `Account mapping for '${label}' (${transactionType}) not configured. Please set up account mappings first.`,
      );
    }
    return accountId;
  }

  private async generateEntryNumber(organizationId: string): Promise<string> {
    const lastEntry = await this.prisma.journalEntry.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { entryNumber: true },
    });

    const nextNum = lastEntry
      ? parseInt(lastEntry.entryNumber.replace('JE-', '')) + 1
      : 1;

    return `JE-${String(nextNum).padStart(5, '0')}`;
  }

  // ============ Account Mappings ============

  async getAccountMappings(organizationId: string) {
    return this.prisma.accountMapping.findMany({
      where: { organizationId },
      include: {
        account: {
          select: { id: true, accountCode: true, name: true, type: true },
        },
      },
      orderBy: { transactionType: 'asc' },
    });
  }

  async updateAccountMappings(organizationId: string, dto: UpdateAccountMappingsDto) {
    // Validate all account IDs
    const accountIds = [...new Set(dto.mappings.map((m) => m.accountId))];
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { id: { in: accountIds }, organizationId, isActive: true },
    });

    if (accounts.length !== accountIds.length) {
      throw new BadRequestException('One or more accounts not found or inactive');
    }

    // Upsert mappings in a transaction
    return this.prisma.$transaction(
      dto.mappings.map((mapping) =>
        this.prisma.accountMapping.upsert({
          where: {
            organizationId_transactionType: {
              organizationId,
              transactionType: mapping.transactionType,
            },
          },
          update: {
            accountId: mapping.accountId,
          },
          create: {
            organizationId,
            transactionType: mapping.transactionType,
            accountId: mapping.accountId,
          },
          include: {
            account: {
              select: { id: true, accountCode: true, name: true, type: true },
            },
          },
        }),
      ),
    );
  }

  // ============ Trial Balance ============

  async getTrialBalance(organizationId: string, asOfDate?: Date) {
    const dateFilter = asOfDate || new Date();

    // Get all accounts with their journal entry line totals up to the as-of date
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { organizationId, isActive: true },
      orderBy: { accountCode: 'asc' },
    });

    const entries = await this.prisma.journalEntryLine.findMany({
      where: {
        journalEntry: {
          organizationId,
          status: 'POSTED',
          date: { lte: dateFilter },
        },
        account: { organizationId },
      },
      select: {
        accountId: true,
        debit: true,
        credit: true,
      },
    });

    // Aggregate by account
    const balanceMap = new Map<string, { totalDebit: number; totalCredit: number }>();
    for (const entry of entries) {
      const existing = balanceMap.get(entry.accountId) || { totalDebit: 0, totalCredit: 0 };
      existing.totalDebit += Number(entry.debit);
      existing.totalCredit += Number(entry.credit);
      balanceMap.set(entry.accountId, existing);
    }

    const trialBalance = accounts.map((account) => {
      const balance = balanceMap.get(account.id) || { totalDebit: 0, totalCredit: 0 };
      return {
        accountId: account.id,
        accountCode: account.accountCode,
        accountName: account.name,
        accountType: account.type,
        totalDebit: Math.round(balance.totalDebit * 100) / 100,
        totalCredit: Math.round(balance.totalCredit * 100) / 100,
      };
    }).filter((row) => row.totalDebit !== 0 || row.totalCredit !== 0);

    const totals = trialBalance.reduce(
      (acc, row) => {
        acc.totalDebit += row.totalDebit;
        acc.totalCredit += row.totalCredit;
        return acc;
      },
      { totalDebit: 0, totalCredit: 0 },
    );

    return {
      asOfDate: dateFilter.toISOString(),
      accounts: trialBalance,
      totals: {
        totalDebit: Math.round(totals.totalDebit * 100) / 100,
        totalCredit: Math.round(totals.totalCredit * 100) / 100,
        isBalanced:
          Math.abs(totals.totalDebit - totals.totalCredit) < 0.01,
      },
    };
  }

  // ============ Export ============

  async exportJournalEntries(
    organizationId: string,
    format: ExportFormat = ExportFormat.EXCEL,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const where: any = {
      organizationId,
      status: 'POSTED',
    };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = dateFrom;
      if (dateTo) where.date.lte = dateTo;
    }

    const entries = await this.prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: {
              select: { accountCode: true, name: true, type: true },
            },
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    if (format === ExportFormat.CSV) {
      return this.exportToCsv(entries);
    }

    return this.exportToExcel(entries);
  }

  private async exportToExcel(entries: any[]): Promise<{
    buffer: Buffer;
    contentType: string;
    filename: string;
  }> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IMS Pro';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Journal Entries');

    // Header row
    sheet.columns = [
      { header: 'Entry Number', key: 'entryNumber', width: 15 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Source Type', key: 'sourceType', width: 15 },
      { header: 'Account Code', key: 'accountCode', width: 15 },
      { header: 'Account Name', key: 'accountName', width: 30 },
      { header: 'Debit (MYR)', key: 'debit', width: 15 },
      { header: 'Credit (MYR)', key: 'credit', width: 15 },
      { header: 'Line Description', key: 'lineDescription', width: 40 },
    ];

    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8E8E8' },
    };

    // Data rows
    for (const entry of entries) {
      for (const line of entry.lines) {
        sheet.addRow({
          entryNumber: entry.entryNumber,
          date: new Date(entry.date).toISOString().split('T')[0],
          description: entry.description,
          sourceType: entry.sourceType || 'MANUAL',
          accountCode: line.account.accountCode,
          accountName: line.account.name,
          debit: Number(line.debit) || '',
          credit: Number(line.credit) || '',
          lineDescription: line.description || '',
        });
      }

      // Blank row between entries
      sheet.addRow({});
    }

    // Format number columns
    sheet.getColumn('debit').numFmt = '#,##0.00';
    sheet.getColumn('credit').numFmt = '#,##0.00';

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const dateStr = new Date().toISOString().split('T')[0];

    return {
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `journal-entries-${dateStr}.xlsx`,
    };
  }

  private async exportToCsv(entries: any[]): Promise<{
    buffer: Buffer;
    contentType: string;
    filename: string;
  }> {
    // SQL Accounting compatible CSV format
    const headers = [
      'Entry Number',
      'Date',
      'Description',
      'Source Type',
      'Account Code',
      'Account Name',
      'Debit',
      'Credit',
      'Line Description',
    ];

    const rows: string[] = [headers.join(',')];

    for (const entry of entries) {
      for (const line of entry.lines) {
        const row = [
          this.escapeCsv(entry.entryNumber),
          new Date(entry.date).toISOString().split('T')[0],
          this.escapeCsv(entry.description),
          entry.sourceType || 'MANUAL',
          line.account.accountCode,
          this.escapeCsv(line.account.name),
          Number(line.debit) || 0,
          Number(line.credit) || 0,
          this.escapeCsv(line.description || ''),
        ];
        rows.push(row.join(','));
      }
    }

    const csvContent = rows.join('\r\n');
    const buffer = Buffer.from(csvContent, 'utf-8');
    const dateStr = new Date().toISOString().split('T')[0];

    return {
      buffer,
      contentType: 'text/csv',
      filename: `journal-entries-${dateStr}.csv`,
    };
  }

  private escapeCsv(value: string): string {
    if (!value) return '';
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  // ============ Seed Default Chart of Accounts ============

  async seedDefaultAccounts(organizationId: string) {
    const existingCount = await this.prisma.chartOfAccount.count({
      where: { organizationId },
    });

    if (existingCount > 0) {
      throw new BadRequestException(
        'Chart of accounts already has entries. Cannot seed defaults.',
      );
    }

    const defaultAccounts = getDefaultChartOfAccounts();

    const created = await this.prisma.$transaction(
      defaultAccounts.map((account) =>
        this.prisma.chartOfAccount.create({
          data: {
            accountCode: account.accountCode,
            name: account.name,
            type: account.type as any,
            isSystem: true,
            isActive: true,
            organizationId,
          },
        }),
      ),
    );

    return { message: `Created ${created.length} default accounts`, count: created.length };
  }
}

// Default chart of accounts for Malaysian businesses
function getDefaultChartOfAccounts() {
  return [
    // Assets
    { accountCode: '1000', name: 'Cash', type: 'ASSET' },
    { accountCode: '1100', name: 'Bank', type: 'ASSET' },
    { accountCode: '1200', name: 'Accounts Receivable', type: 'ASSET' },
    { accountCode: '1300', name: 'Inventory', type: 'ASSET' },

    // Liabilities
    { accountCode: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
    { accountCode: '2100', name: 'Tax Payable (SST)', type: 'LIABILITY' },

    // Equity
    { accountCode: '3000', name: "Owner's Equity", type: 'EQUITY' },
    { accountCode: '3100', name: 'Retained Earnings', type: 'EQUITY' },

    // Revenue
    { accountCode: '4000', name: 'Sales Revenue', type: 'REVENUE' },
    { accountCode: '4100', name: 'Other Income', type: 'REVENUE' },

    // Expenses
    { accountCode: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' },
    { accountCode: '5100', name: 'Purchases', type: 'EXPENSE' },
    { accountCode: '6000', name: 'Operating Expenses', type: 'EXPENSE' },
    { accountCode: '6100', name: 'Salaries', type: 'EXPENSE' },
    { accountCode: '6200', name: 'Rent', type: 'EXPENSE' },
    { accountCode: '6300', name: 'Utilities', type: 'EXPENSE' },
  ];
}
