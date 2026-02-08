import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TaxService } from './tax.service';
import { CreateTaxRateDto, UpdateTaxRateDto } from './dto/create-tax-rate.dto';
import { UpdateOrganizationTaxSettingsDto } from './dto/organization-tax-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Tax')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tax')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  // ============ Tax Rates ============

  @Post('rates')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create tax rate' })
  @ApiResponse({ status: 201, description: 'Tax rate created' })
  async createTaxRate(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateTaxRateDto
  ) {
    return this.taxService.createTaxRate(organizationId, dto);
  }

  @Get('rates')
  @ApiOperation({ summary: 'List tax rates' })
  @ApiResponse({ status: 200, description: 'List of tax rates' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTaxRates(
    @CurrentUser('organizationId') organizationId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.taxService.getTaxRates(organizationId, {
      type,
      status,
      isActive: isActive ? isActive === 'true' : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('rates/default')
  @ApiOperation({ summary: 'Get default tax rate' })
  @ApiResponse({ status: 200, description: 'Default tax rate' })
  async getDefaultTaxRate(
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.taxService.getDefaultTaxRate(organizationId);
  }

  @Get('rates/:id')
  @ApiOperation({ summary: 'Get tax rate by ID' })
  @ApiResponse({ status: 200, description: 'Tax rate details' })
  async getTaxRate(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.taxService.getTaxRate(id, organizationId);
  }

  @Put('rates/:id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update tax rate' })
  @ApiResponse({ status: 200, description: 'Tax rate updated' })
  async updateTaxRate(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateTaxRateDto
  ) {
    return this.taxService.updateTaxRate(id, organizationId, dto);
  }

  @Patch('rates/:id/default')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Set tax rate as default' })
  @ApiResponse({ status: 200, description: 'Tax rate set as default' })
  async setDefaultTaxRate(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.taxService.setDefaultTaxRate(id, organizationId);
  }

  @Delete('rates/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete tax rate' })
  @ApiResponse({ status: 200, description: 'Tax rate deleted' })
  async deleteTaxRate(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.taxService.deleteTaxRate(id, organizationId);
  }

  // ============ Organization Tax Settings ============

  @Get('settings')
  @ApiOperation({ summary: 'Get organization tax settings' })
  @ApiResponse({ status: 200, description: 'Organization tax settings' })
  async getOrganizationTaxSettings(
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.taxService.getOrganizationTaxSettings(organizationId);
  }

  @Put('settings')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update organization tax settings' })
  @ApiResponse({ status: 200, description: 'Organization tax settings updated' })
  async updateOrganizationTaxSettings(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateOrganizationTaxSettingsDto
  ) {
    return this.taxService.updateOrganizationTaxSettings(organizationId, dto);
  }

  // ============ Malaysian SST ============

  @Post('rates/initialize')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Initialize default Malaysian tax rates' })
  @ApiResponse({ status: 201, description: 'Default rates created' })
  async initializeDefaultRates(
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.taxService.initializeDefaultTaxRates(organizationId);
  }

  @Get('sst/summary')
  @ApiOperation({ summary: 'Get SST summary for period' })
  @ApiResponse({ status: 200, description: 'SST summary report' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getSSTSummary(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.taxService.getSSTSummary(
      organizationId,
      new Date(fromDate),
      new Date(toDate)
    );
  }

  // ============ Effective Tax Rate Resolution ============

  @Get('rates/:id/effective')
  @ApiOperation({ summary: 'Get effective tax rate for a transaction date' })
  @ApiResponse({ status: 200, description: 'Effective tax rate details' })
  @ApiQuery({ name: 'transactionDate', required: true, description: 'Transaction date (ISO 8601)' })
  async getEffectiveTaxRate(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Query('transactionDate') transactionDate: string,
  ) {
    return this.taxService.getEffectiveTaxRate(id, new Date(transactionDate), organizationId);
  }

  @Get('regime')
  @ApiOperation({ summary: 'Get the Malaysian tax regime for a given date' })
  @ApiResponse({ status: 200, description: 'Tax regime name' })
  @ApiQuery({ name: 'date', required: true, description: 'Date to check (ISO 8601)' })
  async getTaxRegimeForDate(@Query('date') date: string) {
    const regime = this.taxService.getTaxRegimeForDate(new Date(date));
    return { date, regime };
  }

  // ============ Tax Calculation (Utility) ============

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate tax for line items' })
  @ApiResponse({ status: 200, description: 'Tax calculation result' })
  async calculateTax(
    @CurrentUser('organizationId') organizationId: string,
    @Body() body: { lineItems: { amount: number; taxRateId?: string }[] }
  ) {
    return this.taxService.calculateTax(organizationId, body.lineItems);
  }
}
