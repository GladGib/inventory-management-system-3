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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSalesOrderDto, UpdateSalesOrderDto } from './dto/create-sales-order.dto';
import { CreateInvoiceDto, CreateInvoiceFromOrderDto } from './dto/create-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Sales')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // ============ Sales Orders ============

  @Post('orders')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create sales order' })
  @ApiResponse({ status: 201, description: 'Order created' })
  async createSalesOrder(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSalesOrderDto
  ) {
    return this.salesService.createSalesOrder(organizationId, userId, dto);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List sales orders' })
  @ApiResponse({ status: 200, description: 'List of orders' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getSalesOrders(
    @CurrentUser('organizationId') organizationId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.salesService.getSalesOrders(organizationId, {
      status,
      customerId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get sales order by ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  async getSalesOrder(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.salesService.getSalesOrder(id, organizationId);
  }

  @Put('orders/:id')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Update sales order' })
  @ApiResponse({ status: 200, description: 'Order updated' })
  async updateSalesOrder(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateSalesOrderDto
  ) {
    return this.salesService.updateSalesOrder(id, organizationId, dto);
  }

  @Put('orders/:id/confirm')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Confirm sales order' })
  @ApiResponse({ status: 200, description: 'Order confirmed' })
  async confirmSalesOrder(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.salesService.confirmSalesOrder(id, organizationId, userId);
  }

  @Put('orders/:id/ship')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Ship sales order' })
  @ApiResponse({ status: 200, description: 'Order shipped' })
  async shipSalesOrder(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.salesService.shipSalesOrder(id, organizationId, userId);
  }

  @Put('orders/:id/cancel')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Cancel sales order' })
  @ApiResponse({ status: 200, description: 'Order cancelled' })
  async cancelSalesOrder(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.salesService.cancelSalesOrder(id, organizationId, userId);
  }

  @Post('orders/:id/invoice')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create invoice from order' })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  async createInvoiceFromOrder(
    @Param('id') orderId: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto?: CreateInvoiceFromOrderDto
  ) {
    return this.salesService.createInvoiceFromOrder(orderId, organizationId, userId, dto);
  }

  // ============ Invoices ============

  @Post('invoices')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  async createInvoice(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateInvoiceDto
  ) {
    return this.salesService.createInvoice(organizationId, userId, dto);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List invoices' })
  @ApiResponse({ status: 200, description: 'List of invoices' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getInvoices(
    @CurrentUser('organizationId') organizationId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.salesService.getInvoices(organizationId, {
      status,
      customerId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice details' })
  async getInvoice(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.salesService.getInvoice(id, organizationId);
  }

  @Put('invoices/:id/send')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Mark invoice as sent' })
  @ApiResponse({ status: 200, description: 'Invoice marked as sent' })
  async sendInvoice(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.salesService.sendInvoice(id, organizationId);
  }

  @Put('invoices/:id/void')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Void invoice' })
  @ApiResponse({ status: 200, description: 'Invoice voided' })
  async voidInvoice(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.salesService.voidInvoice(id, organizationId);
  }

  // ============ Payments ============

  @Post('payments')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Record payment received' })
  @ApiResponse({ status: 201, description: 'Payment recorded' })
  async recordPayment(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePaymentDto
  ) {
    return this.salesService.recordPayment(organizationId, userId, dto);
  }

  @Get('payments')
  @ApiOperation({ summary: 'List payments received' })
  @ApiResponse({ status: 200, description: 'List of payments' })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getPayments(
    @CurrentUser('organizationId') organizationId: string,
    @Query('customerId') customerId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.salesService.getPayments(organizationId, {
      customerId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  async getPayment(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.salesService.getPayment(id, organizationId);
  }
}
