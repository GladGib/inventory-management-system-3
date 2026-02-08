import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CustomerPortalService } from './customer-portal.service';
import { PortalJwtGuard } from '../portal-auth/guards/portal-jwt.guard';

@ApiTags('Customer Portal')
@Controller('portal/customer')
@UseGuards(PortalJwtGuard)
@ApiBearerAuth('JWT-auth')
export class CustomerPortalController {
  constructor(private readonly customerPortalService: CustomerPortalService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get portal dashboard summary' })
  @ApiResponse({ status: 200, description: 'Dashboard summary data' })
  async getDashboard(@Request() req: any) {
    return this.customerPortalService.getDashboardSummary(req.user.id);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List customer orders' })
  @ApiResponse({ status: 200, description: 'Paginated list of orders' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getOrders(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customerPortalService.getMyOrders(req.user.id, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get order detail' })
  @ApiResponse({ status: 200, description: 'Order detail with line items' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderDetail(@Request() req: any, @Param('id') id: string) {
    return this.customerPortalService.getOrderDetail(req.user.id, id);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List customer invoices' })
  @ApiResponse({ status: 200, description: 'Paginated list of invoices' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getInvoices(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customerPortalService.getMyInvoices(req.user.id, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice detail' })
  @ApiResponse({ status: 200, description: 'Invoice detail with payment status' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async getInvoiceDetail(@Request() req: any, @Param('id') id: string) {
    return this.customerPortalService.getInvoiceDetail(req.user.id, id);
  }

  @Get('payments')
  @ApiOperation({ summary: 'List customer payments' })
  @ApiResponse({ status: 200, description: 'Paginated list of payments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPayments(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customerPortalService.getMyPayments(req.user.id, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('statement')
  @ApiOperation({ summary: 'Get account statement' })
  @ApiResponse({ status: 200, description: 'Account statement with balance' })
  @ApiQuery({ name: 'startDate', required: false, description: 'ISO date string' })
  @ApiQuery({ name: 'endDate', required: false, description: 'ISO date string' })
  async getStatement(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.customerPortalService.getStatement(req.user.id, {
      startDate,
      endDate,
    });
  }
}
