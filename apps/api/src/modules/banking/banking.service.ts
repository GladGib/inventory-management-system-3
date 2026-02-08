import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateBankAccountDto, UpdateBankAccountDto } from './dto/create-bank-account.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BankingService {
  constructor(private readonly prisma: PrismaService) {}

  // ============ Bank Accounts ============

  async createBankAccount(organizationId: string, dto: CreateBankAccountDto) {
    const openingBalance = dto.openingBalance || 0;

    return this.prisma.bankAccount.create({
      data: {
        bankName: dto.bankName,
        bankCode: dto.bankCode,
        accountNumber: dto.accountNumber,
        accountName: dto.accountName,
        accountType: dto.accountType || 'CURRENT',
        swiftCode: dto.swiftCode,
        openingBalance,
        currentBalance: openingBalance,
        organizationId,
      },
    });
  }

  async getBankAccounts(organizationId: string) {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { bankName: 'asc' }],
    });

    return accounts;
  }

  async getBankAccount(id: string, organizationId: string) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    return account;
  }

  async updateBankAccount(
    id: string,
    organizationId: string,
    dto: UpdateBankAccountDto,
  ) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id, organizationId },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    // If setting as default, unset other defaults
    if (dto.isDefault === true) {
      await this.prisma.bankAccount.updateMany({
        where: { organizationId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.bankAccount.update({
      where: { id },
      data: {
        ...(dto.bankName !== undefined && { bankName: dto.bankName }),
        ...(dto.bankCode !== undefined && { bankCode: dto.bankCode }),
        ...(dto.accountNumber !== undefined && { accountNumber: dto.accountNumber }),
        ...(dto.accountName !== undefined && { accountName: dto.accountName }),
        ...(dto.accountType !== undefined && { accountType: dto.accountType }),
        ...(dto.swiftCode !== undefined && { swiftCode: dto.swiftCode }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  // ============ Bank Transactions ============

  async recordTransaction(
    accountId: string,
    organizationId: string,
    dto: CreateTransactionDto,
  ) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id: accountId, organizationId },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    if (!account.isActive) {
      throw new BadRequestException('Cannot record transactions on an inactive bank account');
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Transaction amount must be positive');
    }

    // Calculate new balance
    const currentBalance = Number(account.currentBalance);
    let newBalance: number;

    switch (dto.type) {
      case 'DEPOSIT':
      case 'INTEREST':
        newBalance = currentBalance + dto.amount;
        break;
      case 'WITHDRAWAL':
      case 'FEE':
        newBalance = currentBalance - dto.amount;
        break;
      case 'TRANSFER':
        // Transfers are treated as withdrawals from the source account
        newBalance = currentBalance - dto.amount;
        break;
      default:
        throw new BadRequestException(`Invalid transaction type: ${dto.type}`);
    }

    // Create transaction and update balance atomically
    const [transaction] = await this.prisma.$transaction([
      this.prisma.bankTransaction.create({
        data: {
          type: dto.type,
          amount: dto.amount,
          date: new Date(dto.date),
          description: dto.description,
          reference: dto.reference,
          bankAccountId: accountId,
          organizationId,
        },
      }),
      this.prisma.bankAccount.update({
        where: { id: accountId },
        data: { currentBalance: newBalance },
      }),
    ]);

    return transaction;
  }

  async getTransactions(
    accountId: string,
    organizationId: string,
    query: {
      dateFrom?: string;
      dateTo?: string;
      type?: string;
      reconciled?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id: accountId, organizationId },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    const { dateFrom, dateTo, type, reconciled, page = 1, limit = 25 } = query;

    const where: any = {
      bankAccountId: accountId,
      organizationId,
    };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    if (type) {
      where.type = type;
    }

    if (reconciled !== undefined) {
      where.reconciled = reconciled === 'true';
    }

    const [transactions, total] = await Promise.all([
      this.prisma.bankTransaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.bankTransaction.count({ where }),
    ]);

    return {
      data: transactions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============ Reconciliation ============

  async reconcileTransactions(
    organizationId: string,
    transactionIds: string[],
  ) {
    // Verify all transactions belong to this organization
    const transactions = await this.prisma.bankTransaction.findMany({
      where: {
        id: { in: transactionIds },
        organizationId,
      },
    });

    if (transactions.length !== transactionIds.length) {
      throw new BadRequestException(
        'One or more transactions not found or do not belong to this organization',
      );
    }

    const alreadyReconciled = transactions.filter((t) => t.reconciled);
    if (alreadyReconciled.length > 0) {
      throw new BadRequestException(
        `${alreadyReconciled.length} transaction(s) are already reconciled`,
      );
    }

    const now = new Date();
    await this.prisma.bankTransaction.updateMany({
      where: {
        id: { in: transactionIds },
        organizationId,
      },
      data: {
        reconciled: true,
        reconciledAt: now,
      },
    });

    return {
      message: `${transactionIds.length} transaction(s) reconciled successfully`,
      reconciledCount: transactionIds.length,
      reconciledAt: now.toISOString(),
    };
  }

  async getReconciliationSummary(
    accountId: string,
    organizationId: string,
  ) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id: accountId, organizationId },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    // Get unreconciled transactions
    const unreconciledTransactions = await this.prisma.bankTransaction.findMany({
      where: {
        bankAccountId: accountId,
        organizationId,
        reconciled: false,
      },
      orderBy: { date: 'desc' },
    });

    const unreconciledCount = unreconciledTransactions.length;

    // Calculate unreconciled totals
    let unreconciledDeposits = 0;
    let unreconciledWithdrawals = 0;

    for (const txn of unreconciledTransactions) {
      const amount = Number(txn.amount);
      if (txn.type === 'DEPOSIT' || txn.type === 'INTEREST') {
        unreconciledDeposits += amount;
      } else {
        unreconciledWithdrawals += amount;
      }
    }

    // Get reconciled balance
    const reconciledTransactions = await this.prisma.bankTransaction.findMany({
      where: {
        bankAccountId: accountId,
        organizationId,
        reconciled: true,
      },
    });

    let reconciledBalance = Number(account.openingBalance);
    for (const txn of reconciledTransactions) {
      const amount = Number(txn.amount);
      if (txn.type === 'DEPOSIT' || txn.type === 'INTEREST') {
        reconciledBalance += amount;
      } else {
        reconciledBalance -= amount;
      }
    }

    return {
      accountId,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      currentBalance: Number(account.currentBalance),
      reconciledBalance: Math.round(reconciledBalance * 100) / 100,
      unreconciledCount,
      unreconciledDeposits: Math.round(unreconciledDeposits * 100) / 100,
      unreconciledWithdrawals: Math.round(unreconciledWithdrawals * 100) / 100,
      unreconciledNet: Math.round((unreconciledDeposits - unreconciledWithdrawals) * 100) / 100,
      unreconciledTransactions,
    };
  }

  // ============ Import Bank Statement ============

  async importBankStatement(
    accountId: string,
    organizationId: string,
    format: string,
    fileContent: string,
  ) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id: accountId, organizationId },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    if (!account.isActive) {
      throw new BadRequestException('Cannot import statements to an inactive bank account');
    }

    let transactions: Array<{
      type: string;
      amount: number;
      date: Date;
      description: string;
      reference: string;
    }>;

    if (format === 'CSV') {
      transactions = this.parseCsvStatement(fileContent);
    } else if (format === 'OFX') {
      transactions = this.parseOfxStatement(fileContent);
    } else {
      throw new BadRequestException(`Unsupported format: ${format}`);
    }

    if (transactions.length === 0) {
      throw new BadRequestException('No valid transactions found in the uploaded file');
    }

    // Create all transactions and update balance
    let balanceChange = 0;
    for (const txn of transactions) {
      if (txn.type === 'DEPOSIT' || txn.type === 'INTEREST') {
        balanceChange += txn.amount;
      } else {
        balanceChange -= txn.amount;
      }
    }

    const newBalance = Number(account.currentBalance) + balanceChange;

    await this.prisma.$transaction([
      ...transactions.map((txn) =>
        this.prisma.bankTransaction.create({
          data: {
            type: txn.type,
            amount: txn.amount,
            date: txn.date,
            description: txn.description,
            reference: txn.reference,
            bankAccountId: accountId,
            organizationId,
          },
        }),
      ),
      this.prisma.bankAccount.update({
        where: { id: accountId },
        data: { currentBalance: newBalance },
      }),
    ]);

    return {
      message: `Successfully imported ${transactions.length} transaction(s)`,
      importedCount: transactions.length,
      balanceChange: Math.round(balanceChange * 100) / 100,
      newBalance: Math.round(newBalance * 100) / 100,
    };
  }

  /**
   * Parse CSV bank statement.
   * Expected columns: Date, Description, Reference, Debit, Credit
   * Malaysian banks typically use this format.
   */
  private parseCsvStatement(content: string): Array<{
    type: string;
    amount: number;
    date: Date;
    description: string;
    reference: string;
  }> {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      return [];
    }

    // Skip header row
    const dataLines = lines.slice(1);
    const transactions: Array<{
      type: string;
      amount: number;
      date: Date;
      description: string;
      reference: string;
    }> = [];

    for (const line of dataLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Parse CSV - handle quoted values
      const columns = this.parseCsvLine(trimmed);
      if (columns.length < 4) continue;

      const dateStr = columns[0]?.trim();
      const description = columns[1]?.trim() || '';
      const reference = columns[2]?.trim() || '';
      const debitStr = columns[3]?.trim() || '0';
      const creditStr = columns[4]?.trim() || '0';

      const date = this.parseDate(dateStr);
      if (!date) continue;

      const debit = parseFloat(debitStr.replace(/,/g, '')) || 0;
      const credit = parseFloat(creditStr.replace(/,/g, '')) || 0;

      if (debit > 0) {
        transactions.push({
          type: 'WITHDRAWAL',
          amount: debit,
          date,
          description,
          reference,
        });
      } else if (credit > 0) {
        transactions.push({
          type: 'DEPOSIT',
          amount: credit,
          date,
          description,
          reference,
        });
      }
    }

    return transactions;
  }

  /**
   * Parse OFX (Open Financial Exchange) bank statement.
   * Basic XML-based parsing for Malaysian bank statements.
   */
  private parseOfxStatement(content: string): Array<{
    type: string;
    amount: number;
    date: Date;
    description: string;
    reference: string;
  }> {
    const transactions: Array<{
      type: string;
      amount: number;
      date: Date;
      description: string;
      reference: string;
    }> = [];

    // Simple regex-based OFX parsing
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;

    while ((match = stmtTrnRegex.exec(content)) !== null) {
      const block = match[1];

      const trnType = this.extractOfxValue(block, 'TRNTYPE');
      const dtPosted = this.extractOfxValue(block, 'DTPOSTED');
      const trnAmt = this.extractOfxValue(block, 'TRNAMT');
      const name = this.extractOfxValue(block, 'NAME') || this.extractOfxValue(block, 'MEMO');
      const fitId = this.extractOfxValue(block, 'FITID');

      if (!dtPosted || !trnAmt) continue;

      const amount = parseFloat(trnAmt);
      if (isNaN(amount) || amount === 0) continue;

      // OFX date format: YYYYMMDD or YYYYMMDDHHMMSS
      const year = parseInt(dtPosted.substring(0, 4));
      const month = parseInt(dtPosted.substring(4, 6)) - 1;
      const day = parseInt(dtPosted.substring(6, 8));
      const date = new Date(year, month, day);

      if (isNaN(date.getTime())) continue;

      let type: string;
      if (amount > 0) {
        type = 'DEPOSIT';
      } else if (trnType === 'FEE' || trnType === 'SRVCHG') {
        type = 'FEE';
      } else if (trnType === 'INT') {
        type = amount > 0 ? 'INTEREST' : 'FEE';
      } else {
        type = 'WITHDRAWAL';
      }

      transactions.push({
        type,
        amount: Math.abs(amount),
        date,
        description: name || '',
        reference: fitId || '',
      });
    }

    return transactions;
  }

  private extractOfxValue(block: string, tag: string): string | null {
    // Try XML-style tags first: <TAG>value</TAG>
    const xmlRegex = new RegExp(`<${tag}>([^<]+)</${tag}>`, 'i');
    const xmlMatch = xmlRegex.exec(block);
    if (xmlMatch) return xmlMatch[1].trim();

    // Try SGML-style tags: <TAG>value
    const sgmlRegex = new RegExp(`<${tag}>([^\\n<]+)`, 'i');
    const sgmlMatch = sgmlRegex.exec(block);
    if (sgmlMatch) return sgmlMatch[1].trim();

    return null;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);

    return result;
  }

  /**
   * Parse date strings in various Malaysian bank formats.
   * Supports: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD MMM YYYY
   */
  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    // Try YYYY-MM-DD (ISO format)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d;
    }

    // Try DD/MM/YYYY or DD-MM-YYYY (common Malaysian format)
    const dmyMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(dateStr);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1]);
      const month = parseInt(dmyMatch[2]) - 1;
      const year = parseInt(dmyMatch[3]);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }

    // Try DD MMM YYYY (e.g. "08 Feb 2026")
    const dmmyMatch = /^(\d{1,2})\s+(\w{3})\s+(\d{4})$/.exec(dateStr);
    if (dmmyMatch) {
      const d = new Date(`${dmmyMatch[2]} ${dmmyMatch[1]}, ${dmmyMatch[3]}`);
      if (!isNaN(d.getTime())) return d;
    }

    return null;
  }
}
