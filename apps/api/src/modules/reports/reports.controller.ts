import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Res,
  StreamableFile,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService, AgeBucket, StockAgingItem } from './reports.service';
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

  // ============ NEW Sales Reports ============

  @Get('sales/by-salesperson')
  @ApiOperation({ summary: 'Get sales by salesperson report' })
  @ApiResponse({ status: 200, description: 'Sales grouped by salesperson' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getSalesBySalesperson(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.salesBySalesperson(organizationId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  @Get('sales/by-category')
  @ApiOperation({ summary: 'Get sales by category report' })
  @ApiResponse({ status: 200, description: 'Sales grouped by item category' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getSalesByCategory(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.salesByCategory(organizationId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  @Get('sales/by-region')
  @ApiOperation({ summary: 'Get sales by region report' })
  @ApiResponse({ status: 200, description: 'Sales grouped by customer state/region' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getSalesByRegion(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.salesByRegion(organizationId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  @Get('sales/monthly-summary')
  @ApiOperation({ summary: 'Get monthly sales summary for a year' })
  @ApiResponse({ status: 200, description: 'Monthly sales summary' })
  @ApiQuery({ name: 'year', required: true })
  async getMonthlySalesSummary(
    @CurrentUser('organizationId') organizationId: string,
    @Query('year') year: string
  ) {
    return this.reportsService.monthlySalesSummary(organizationId, parseInt(year));
  }

  @Get('sales/growth-comparison')
  @ApiOperation({ summary: 'Get sales growth comparison (period vs previous period)' })
  @ApiResponse({ status: 200, description: 'Sales growth comparison' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getSalesGrowthComparison(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.salesGrowthComparison(organizationId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  @Get('sales/average-order-value')
  @ApiOperation({ summary: 'Get average order value trend' })
  @ApiResponse({ status: 200, description: 'Average order value by month' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getAverageOrderValue(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.averageOrderValue(organizationId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  @Get('sales/customer-acquisition')
  @ApiOperation({ summary: 'Get customer acquisition report' })
  @ApiResponse({ status: 200, description: 'New customers by period' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getCustomerAcquisition(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.customerAcquisition(organizationId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  @Get('sales/top-products')
  @ApiOperation({ summary: 'Get top selling products' })
  @ApiResponse({ status: 200, description: 'Top products by revenue' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  @ApiQuery({ name: 'limit', required: false })
  async getTopProducts(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('limit') limit?: string
  ) {
    return this.reportsService.topProducts(
      organizationId,
      { fromDate: new Date(fromDate), toDate: new Date(toDate) },
      limit ? parseInt(limit) : 20,
    );
  }

  // ============ NEW Inventory Reports ============

  @Get('inventory/turnover')
  @ApiOperation({ summary: 'Get inventory turnover report' })
  @ApiResponse({ status: 200, description: 'Inventory turnover rates per item' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getInventoryTurnover(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.inventoryTurnover(organizationId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  @Get('inventory/dead-stock')
  @ApiOperation({ summary: 'Get dead stock report' })
  @ApiResponse({ status: 200, description: 'Items with no sales in N days' })
  @ApiQuery({ name: 'daysSinceLastSale', required: false })
  async getDeadStock(
    @CurrentUser('organizationId') organizationId: string,
    @Query('daysSinceLastSale') daysSinceLastSale?: string
  ) {
    return this.reportsService.deadStock(
      organizationId,
      daysSinceLastSale ? parseInt(daysSinceLastSale) : 90,
    );
  }

  @Get('inventory/stock-movement-history/:itemId')
  @ApiOperation({ summary: 'Get stock movement history for an item' })
  @ApiResponse({ status: 200, description: 'Stock movement history' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getStockMovementHistory(
    @CurrentUser('organizationId') organizationId: string,
    @Param('itemId') itemId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.stockMovementHistory(organizationId, itemId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  @Get('inventory/warehouse-utilization')
  @ApiOperation({ summary: 'Get warehouse utilization report' })
  @ApiResponse({ status: 200, description: 'Stock value and count per warehouse' })
  async getWarehouseUtilization(
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.reportsService.warehouseUtilization(organizationId);
  }

  @Get('inventory/abc-analysis')
  @ApiOperation({ summary: 'Get ABC analysis report' })
  @ApiResponse({ status: 200, description: 'ABC classification of inventory' })
  async getAbcAnalysis(
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.reportsService.abcAnalysis(organizationId);
  }

  @Get('inventory/item-profitability')
  @ApiOperation({ summary: 'Get item profitability report' })
  @ApiResponse({ status: 200, description: 'Revenue - COGS per item' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getItemProfitability(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.itemProfitability(organizationId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  // ============ NEW Purchase Reports ============

  @Get('purchases/by-category')
  @ApiOperation({ summary: 'Get purchases by category report' })
  @ApiResponse({ status: 200, description: 'Purchases grouped by category' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getPurchasesByCategory(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.purchaseByCategory(organizationId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  @Get('purchases/by-item')
  @ApiOperation({ summary: 'Get purchases by item report' })
  @ApiResponse({ status: 200, description: 'Purchase history per item' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getPurchasesByItem(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.reportsService.purchaseByItem(
      organizationId,
      { fromDate: new Date(fromDate), toDate: new Date(toDate) },
      { page: page ? parseInt(page) : undefined, limit: limit ? parseInt(limit) : undefined },
    );
  }

  @Get('purchases/vendor-performance')
  @ApiOperation({ summary: 'Get vendor performance report' })
  @ApiResponse({ status: 200, description: 'Vendor delivery, lead time, reject rate' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getVendorPerformance(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.vendorPerformance(organizationId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  @Get('purchases/price-variance')
  @ApiOperation({ summary: 'Get purchase price variance report' })
  @ApiResponse({ status: 200, description: 'Actual vs standard price per item' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getPurchasePriceVariance(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.purchasePriceVariance(organizationId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  @Get('purchases/outstanding-pos')
  @ApiOperation({ summary: 'Get outstanding purchase orders' })
  @ApiResponse({ status: 200, description: 'All open/partially received POs' })
  async getOutstandingPOs(
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.reportsService.outstandingPOs(organizationId);
  }

  // ============ NEW Financial Reports ============

  @Get('financial/profit-and-loss')
  @ApiOperation({ summary: 'Get profit and loss report' })
  @ApiResponse({ status: 200, description: 'P&L statement' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getProfitAndLoss(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.profitAndLoss(organizationId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  @Get('financial/cash-flow')
  @ApiOperation({ summary: 'Get cash flow summary' })
  @ApiResponse({ status: 200, description: 'Cash inflows vs outflows' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getCashFlowSummary(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.cashFlowSummary(organizationId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  @Get('financial/revenue-by-month')
  @ApiOperation({ summary: 'Get monthly revenue breakdown' })
  @ApiResponse({ status: 200, description: 'Revenue by month' })
  @ApiQuery({ name: 'year', required: true })
  async getRevenueByMonth(
    @CurrentUser('organizationId') organizationId: string,
    @Query('year') year: string
  ) {
    return this.reportsService.revenueByMonth(organizationId, parseInt(year));
  }

  @Get('financial/expense-analysis')
  @ApiOperation({ summary: 'Get expense analysis report' })
  @ApiResponse({ status: 200, description: 'Expenses by category' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getExpenseAnalysis(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.expenseAnalysis(organizationId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  @Get('financial/outstanding-payments')
  @ApiOperation({ summary: 'Get outstanding payments report' })
  @ApiResponse({ status: 200, description: 'All unpaid invoices/bills' })
  async getOutstandingPayments(
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.reportsService.outstandingPayments(organizationId);
  }

  @Get('financial/payment-method-analysis')
  @ApiOperation({ summary: 'Get payment method analysis' })
  @ApiResponse({ status: 200, description: 'Breakdown by payment method' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getPaymentMethodAnalysis(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.paymentMethodAnalysis(organizationId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  @Get('financial/customer-lifetime-value')
  @ApiOperation({ summary: 'Get customer lifetime value report' })
  @ApiResponse({ status: 200, description: 'Total revenue per customer, all time' })
  async getCustomerLifetimeValue(
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.reportsService.customerLifetimeValue(organizationId);
  }

  // ============ NEW Compliance Reports ============

  @Get('compliance/sst-filing')
  @ApiOperation({ summary: 'Get SST filing summary' })
  @ApiResponse({ status: 200, description: 'SST filing summary' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getSSTFilingSummary(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.sstFilingSummary(organizationId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  @Get('compliance/einvoice-log')
  @ApiOperation({ summary: 'Get e-Invoice submission log' })
  @ApiResponse({ status: 200, description: 'E-invoice submissions with statuses' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getEInvoiceSubmissionLog(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.eInvoiceSubmissionLog(organizationId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  @Get('compliance/tax-audit-trail')
  @ApiOperation({ summary: 'Get tax audit trail' })
  @ApiResponse({ status: 200, description: 'All tax-related transactions' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getTaxAuditTrail(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.reportsService.taxAuditTrail(organizationId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  @Get('compliance/annual-tax-summary')
  @ApiOperation({ summary: 'Get annual tax summary' })
  @ApiResponse({ status: 200, description: 'Full year tax summary by month' })
  @ApiQuery({ name: 'year', required: true })
  async getAnnualTaxSummary(
    @CurrentUser('organizationId') organizationId: string,
    @Query('year') year: string
  ) {
    return this.reportsService.annualTaxSummary(organizationId, parseInt(year));
  }

  // ============ SST Tax Report ============

  @Get('sst')
  @ApiOperation({ summary: 'Get SST-03 tax report' })
  @ApiResponse({ status: 200, description: 'SST tax report in SST-03 format' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getSSTReport(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.reportsService.getSSTReport(organizationId, {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });
  }

  // ============ Stock Aging Report ============

  @Get('inventory/stock-aging')
  @ApiOperation({ summary: 'Get stock aging report' })
  @ApiResponse({ status: 200, description: 'Stock aging report' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'asOfDate', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'xlsx', 'pdf'] })
  async getStockAgingReport(
    @CurrentUser('organizationId') organizationId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('asOfDate') asOfDate?: string,
    @Query('format') format?: 'json' | 'xlsx' | 'pdf',
    @Res({ passthrough: true }) res?: Response
  ) {
    const filters = {
      warehouseId,
      categoryId,
      asOfDate: asOfDate ? new Date(asOfDate) : undefined,
    };

    if (format === 'xlsx') {
      const buffer = await this.reportsService.exportStockAgingToExcel(organizationId, filters);
      const filename = `stock-aging-report-${new Date().toISOString().split('T')[0]}.xlsx`;

      res!.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res!.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      return new StreamableFile(buffer);
    }

    if (format === 'pdf') {
      const buffer = await this.reportsService.exportStockAgingToPdf(organizationId, filters);
      const filename = `stock-aging-report-${new Date().toISOString().split('T')[0]}.html`;

      res!.setHeader('Content-Type', 'text/html');
      res!.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      return new StreamableFile(buffer);
    }

    return this.reportsService.getStockAgingReport(organizationId, filters);
  }
}
