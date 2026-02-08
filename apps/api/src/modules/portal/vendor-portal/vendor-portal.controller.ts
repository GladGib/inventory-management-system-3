import {
  Controller,
  Get,
  Patch,
  Body,
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
import { VendorPortalService } from './vendor-portal.service';
import { ConfirmPurchaseOrderDto } from './dto/confirm-po.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery.dto';
import { PortalJwtGuard } from '../portal-auth/guards/portal-jwt.guard';

@ApiTags('Vendor Portal')
@Controller('portal/vendor')
@UseGuards(PortalJwtGuard)
@ApiBearerAuth('JWT-auth')
export class VendorPortalController {
  constructor(private readonly vendorPortalService: VendorPortalService) {}

  // ============ Dashboard ============

  @Get('dashboard')
  @ApiOperation({ summary: 'Get vendor portal dashboard summary' })
  @ApiResponse({ status: 200, description: 'Dashboard summary data' })
  async getDashboard(@Request() req: any) {
    return this.vendorPortalService.getDashboardSummary(req.user.id);
  }

  // ============ Purchase Orders ============

  @Get('purchase-orders')
  @ApiOperation({ summary: 'List purchase orders for the vendor' })
  @ApiResponse({ status: 200, description: 'Paginated list of purchase orders' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPurchaseOrders(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.vendorPortalService.getMyPurchaseOrders(req.user.id, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('purchase-orders/:id')
  @ApiOperation({ summary: 'Get purchase order detail' })
  @ApiResponse({ status: 200, description: 'Purchase order with line items' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  async getPurchaseOrderDetail(
    @Request() req: any,
    @Param('id') poId: string,
  ) {
    return this.vendorPortalService.getPurchaseOrderDetail(req.user.id, poId);
  }

  @Patch('purchase-orders/:id/confirm')
  @ApiOperation({ summary: 'Confirm/acknowledge a purchase order' })
  @ApiResponse({ status: 200, description: 'Purchase order confirmed' })
  @ApiResponse({ status: 400, description: 'Cannot confirm PO in current status' })
  async confirmPurchaseOrder(
    @Request() req: any,
    @Param('id') poId: string,
    @Body() dto: ConfirmPurchaseOrderDto,
  ) {
    return this.vendorPortalService.confirmPurchaseOrder(
      req.user.id,
      poId,
      dto,
    );
  }

  @Patch('purchase-orders/:id/delivery')
  @ApiOperation({ summary: 'Update delivery status for a purchase order' })
  @ApiResponse({ status: 200, description: 'Delivery status updated' })
  @ApiResponse({ status: 400, description: 'Cannot update delivery for PO in current status' })
  async updateDeliveryStatus(
    @Request() req: any,
    @Param('id') poId: string,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    return this.vendorPortalService.updateDeliveryStatus(
      req.user.id,
      poId,
      dto,
    );
  }

  // ============ Bills ============

  @Get('bills')
  @ApiOperation({ summary: 'List bills for the vendor' })
  @ApiResponse({ status: 200, description: 'Paginated list of bills' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getBills(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.vendorPortalService.getMyBills(req.user.id, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('bills/:id')
  @ApiOperation({ summary: 'Get bill detail' })
  @ApiResponse({ status: 200, description: 'Bill with line items and payments' })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  async getBillDetail(
    @Request() req: any,
    @Param('id') billId: string,
  ) {
    return this.vendorPortalService.getBillDetail(req.user.id, billId);
  }

  // ============ Payments ============

  @Get('payments')
  @ApiOperation({ summary: 'List payments received by the vendor' })
  @ApiResponse({ status: 200, description: 'Paginated list of payments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPayments(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.vendorPortalService.getMyPayments(req.user.id, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
