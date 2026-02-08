import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AccountingService } from './accounting.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/create-account.dto';
import {
  CreateJournalEntryDto,
  GenerateJournalEntryDto,
} from './dto/create-journal-entry.dto';
import { UpdateAccountMappingsDto } from './dto/account-mapping.dto';
import { ExportQueryDto, ExportFormat, TrialBalanceQueryDto } from './dto/export-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Accounting')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // ============ Chart of Accounts ============

  @Get('chart-of-accounts')
  @ApiOperation({ summary: 'List chart of accounts (flat with tree info)' })
  @ApiResponse({ status: 200, description: 'List of accounts' })
  @ApiQuery({ name: 'tree', required: false, description: 'Return tree structure' })
  async getChartOfAccounts(
    @CurrentUser('organizationId') organizationId: string,
    @Query('tree') tree?: string,
  ) {
    if (tree === 'true') {
      return this.accountingService.getChartOfAccountsTree(organizationId);
    }
    return this.accountingService.getChartOfAccounts(organizationId);
  }

  @Post('chart-of-accounts')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create chart of account' })
  @ApiResponse({ status: 201, description: 'Account created' })
  async createAccount(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateAccountDto,
  ) {
    return this.accountingService.createAccount(organizationId, dto);
  }

  @Put('chart-of-accounts/:id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update chart of account' })
  @ApiResponse({ status: 200, description: 'Account updated' })
  async updateAccount(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountingService.updateAccount(id, organizationId, dto);
  }

  @Delete('chart-of-accounts/:id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Delete chart of account' })
  @ApiResponse({ status: 200, description: 'Account deleted' })
  async deleteAccount(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.accountingService.deleteAccount(id, organizationId);
  }

  @Post('chart-of-accounts/seed')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Seed default chart of accounts for Malaysian businesses' })
  @ApiResponse({ status: 201, description: 'Default accounts created' })
  async seedDefaultAccounts(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.accountingService.seedDefaultAccounts(organizationId);
  }

  // ============ Journal Entries ============

  @Get('journal-entries')
  @ApiOperation({ summary: 'List journal entries with filters' })
  @ApiResponse({ status: 200, description: 'List of journal entries' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'sourceType', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getJournalEntries(
    @CurrentUser('organizationId') organizationId: string,
    @Query('status') status?: string,
    @Query('sourceType') sourceType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.accountingService.getJournalEntries(organizationId, {
      status,
      sourceType,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('journal-entries/:id')
  @ApiOperation({ summary: 'Get journal entry by ID' })
  @ApiResponse({ status: 200, description: 'Journal entry details' })
  async getJournalEntry(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.accountingService.getJournalEntry(id, organizationId);
  }

  @Post('journal-entries')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create manual journal entry' })
  @ApiResponse({ status: 201, description: 'Journal entry created' })
  async createJournalEntry(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateJournalEntryDto,
  ) {
    return this.accountingService.createJournalEntry(organizationId, userId, dto);
  }

  @Post('journal-entries/generate')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Auto-generate journal entry from source document' })
  @ApiResponse({ status: 201, description: 'Journal entry generated' })
  async generateJournalEntry(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateJournalEntryDto,
  ) {
    return this.accountingService.generateFromSource(organizationId, userId, dto);
  }

  // ============ Account Mappings ============

  @Get('account-mappings')
  @ApiOperation({ summary: 'List account mappings' })
  @ApiResponse({ status: 200, description: 'List of account mappings' })
  async getAccountMappings(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.accountingService.getAccountMappings(organizationId);
  }

  @Put('account-mappings')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Bulk update account mappings' })
  @ApiResponse({ status: 200, description: 'Account mappings updated' })
  async updateAccountMappings(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateAccountMappingsDto,
  ) {
    return this.accountingService.updateAccountMappings(organizationId, dto);
  }

  // ============ Export ============

  @Post('export')
  @ApiOperation({ summary: 'Export journal entries to CSV or Excel' })
  @ApiResponse({ status: 200, description: 'File download' })
  @ApiQuery({ name: 'format', required: false, enum: ExportFormat })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async exportJournalEntries(
    @CurrentUser('organizationId') organizationId: string,
    @Query('format') format?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Res() res?: Response,
  ) {
    const exportFormat =
      format === 'csv' ? ExportFormat.CSV : ExportFormat.EXCEL;

    const result = await this.accountingService.exportJournalEntries(
      organizationId,
      exportFormat,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
    );

    res!.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': result.buffer.length,
    });

    res!.send(result.buffer);
  }

  // ============ Trial Balance ============

  @Get('trial-balance')
  @ApiOperation({ summary: 'Get trial balance report' })
  @ApiResponse({ status: 200, description: 'Trial balance data' })
  @ApiQuery({ name: 'asOfDate', required: false })
  async getTrialBalance(
    @CurrentUser('organizationId') organizationId: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.accountingService.getTrialBalance(
      organizationId,
      asOfDate ? new Date(asOfDate) : undefined,
    );
  }
}
