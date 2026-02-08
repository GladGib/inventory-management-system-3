import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { BankingService } from './banking.service';
import { CreateBankAccountDto, UpdateBankAccountDto } from './dto/create-bank-account.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ReconcileTransactionsDto } from './dto/reconcile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Banking')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('banking')
export class BankingController {
  constructor(private readonly bankingService: BankingService) {}

  // ============ Bank Accounts ============

  @Post('accounts')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a new bank account' })
  @ApiResponse({ status: 201, description: 'Bank account created' })
  async createBankAccount(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateBankAccountDto,
  ) {
    return this.bankingService.createBankAccount(organizationId, dto);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'List all bank accounts for the organization' })
  @ApiResponse({ status: 200, description: 'List of bank accounts' })
  async getBankAccounts(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.bankingService.getBankAccounts(organizationId);
  }

  @Get('accounts/:id')
  @ApiOperation({ summary: 'Get bank account details' })
  @ApiResponse({ status: 200, description: 'Bank account details' })
  async getBankAccount(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.bankingService.getBankAccount(id, organizationId);
  }

  @Patch('accounts/:id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a bank account' })
  @ApiResponse({ status: 200, description: 'Bank account updated' })
  async updateBankAccount(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateBankAccountDto,
  ) {
    return this.bankingService.updateBankAccount(id, organizationId, dto);
  }

  // ============ Bank Transactions ============

  @Post('accounts/:id/transactions')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Record a bank transaction' })
  @ApiResponse({ status: 201, description: 'Transaction recorded' })
  async recordTransaction(
    @Param('id') accountId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.bankingService.recordTransaction(accountId, organizationId, dto);
  }

  @Get('accounts/:id/transactions')
  @ApiOperation({ summary: 'List transactions for a bank account' })
  @ApiResponse({ status: 200, description: 'List of transactions' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter from date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter to date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by transaction type' })
  @ApiQuery({ name: 'reconciled', required: false, description: 'Filter by reconciliation status' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTransactions(
    @Param('id') accountId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('type') type?: string,
    @Query('reconciled') reconciled?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bankingService.getTransactions(accountId, organizationId, {
      dateFrom,
      dateTo,
      type,
      reconciled,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  // ============ Reconciliation ============

  @Patch('transactions/reconcile')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Mark transactions as reconciled' })
  @ApiResponse({ status: 200, description: 'Transactions reconciled' })
  async reconcileTransactions(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: ReconcileTransactionsDto,
  ) {
    return this.bankingService.reconcileTransactions(
      organizationId,
      dto.transactionIds,
    );
  }

  @Get('accounts/:id/reconciliation')
  @ApiOperation({ summary: 'Get reconciliation summary for a bank account' })
  @ApiResponse({ status: 200, description: 'Reconciliation summary' })
  async getReconciliationSummary(
    @Param('id') accountId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.bankingService.getReconciliationSummary(accountId, organizationId);
  }

  // ============ Import ============

  @Post('accounts/:id/import')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Import bank statement (CSV or OFX)' })
  @ApiResponse({ status: 200, description: 'Statement imported' })
  async importBankStatement(
    @Param('id') accountId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() body: { format: string; content: string },
  ) {
    if (!body.format || !body.content) {
      throw new BadRequestException('Both format and content are required');
    }

    if (!['CSV', 'OFX'].includes(body.format)) {
      throw new BadRequestException('Format must be CSV or OFX');
    }

    return this.bankingService.importBankStatement(
      accountId,
      organizationId,
      body.format,
      body.content,
    );
  }
}
