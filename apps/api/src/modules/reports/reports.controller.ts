import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ============ Sales Reports ============

  @Get('sales/summary')
  @ApiOperation({ summary: 'Get sales summary report' })
  @ApiResponse({ status: 200, description: 'Sales summary' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getSalesSummary(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.getSalesSummary(organizationId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  @Get('sales/by-customer')
  @ApiOperation({ summary: 'Get sales by customer report' })
  @ApiResponse({ status: 200, description: 'Sales by customer' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getSalesByCustomer(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.reportsService.getSalesByCustomer(
      organizationId,
      { fromDate: new Date(fromDate), toDate: new Date(toDate) },
      { page: page ? parseInt(page) : undefined, limit: limit ? parseInt(limit) : undefined }
    );
  }

  @Get('sales/by-item')
  @ApiOperation({ summary: 'Get sales by item report' })
  @ApiResponse({ status: 200, description: 'Sales by item' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getSalesByItem(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.reportsService.getSalesByItem(
      organizationId,
      { fromDate: new Date(fromDate), toDate: new Date(toDate) },
      { page: page ? parseInt(page) : undefined, limit: limit ? parseInt(limit) : undefined }
    );
  }

  @Get('sales/receivables-aging')
  @ApiOperation({ summary: 'Get accounts receivable aging report' })
  @ApiResponse({ status: 200, description: 'Receivables aging' })
  async getReceivablesAging(
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.reportsService.getReceivablesAging(organizationId);
  }

  // ============ Inventory Reports ============

  @Get('inventory/summary')
  @ApiOperation({ summary: 'Get inventory summary report' })
  @ApiResponse({ status: 200, description: 'Inventory summary' })
  async getInventorySummary(
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.reportsService.getInventorySummary(organizationId);
  }

  @Get('inventory/valuation')
  @ApiOperation({ summary: 'Get inventory valuation report' })
  @ApiResponse({ status: 200, description: 'Inventory valuation' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getInventoryValuation(
    @CurrentUser('organizationId') organizationId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.reportsService.getInventoryValuation(
      organizationId,
      warehouseId,
      { page: page ? parseInt(page) : undefined, limit: limit ? parseInt(limit) : undefined }
    );
  }

  @Get('inventory/stock-movement/:itemId')
  @ApiOperation({ summary: 'Get stock movement report for an item' })
  @ApiResponse({ status: 200, description: 'Stock movement' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getStockMovement(
    @CurrentUser('organizationId') organizationId: string,
    @Param('itemId') itemId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.getStockMovement(organizationId, itemId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  // ============ Purchase Reports ============

  @Get('purchases/summary')
  @ApiOperation({ summary: 'Get purchases summary report' })
  @ApiResponse({ status: 200, description: 'Purchases summary' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getPurchasesSummary(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.getPurchasesSummary(organizationId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  @Get('purchases/by-vendor')
  @ApiOperation({ summary: 'Get purchases by vendor report' })
  @ApiResponse({ status: 200, description: 'Purchases by vendor' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getPurchasesByVendor(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.reportsService.getPurchasesByVendor(
      organizationId,
      { fromDate: new Date(fromDate), toDate: new Date(toDate) },
      { page: page ? parseInt(page) : undefined, limit: limit ? parseInt(limit) : undefined }
    );
  }

  @Get('purchases/payables-aging')
  @ApiOperation({ summary: 'Get accounts payable aging report' })
  @ApiResponse({ status: 200, description: 'Payables aging' })
  async getPayablesAging(
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.reportsService.getPayablesAging(organizationId);
  }
}
