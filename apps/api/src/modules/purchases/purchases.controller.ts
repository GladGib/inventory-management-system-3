import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { CreateReceiveDto } from './dto/create-receive.dto';
import { CreateBillDto, CreateBillFromPODto } from './dto/create-bill.dto';
import { CreateVendorPaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Purchases')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  // ============ Purchase Orders ============

  @Post('orders')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create purchase order' })
  @ApiResponse({ status: 201, description: 'PO created' })
  async createPurchaseOrder(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePurchaseOrderDto
  ) {
    return this.purchasesService.createPurchaseOrder(organizationId, userId, dto);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List purchase orders' })
  @ApiResponse({ status: 200, description: 'List of POs' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getPurchaseOrders(
    @CurrentUser('organizationId') organizationId: string,
    @Query('status') status?: string,
    @Query('vendorId') vendorId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.purchasesService.getPurchaseOrders(organizationId, {
      status,
      vendorId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get purchase order by ID' })
  @ApiResponse({ status: 200, description: 'PO details' })
  async getPurchaseOrder(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.purchasesService.getPurchaseOrder(id, organizationId);
  }

  @Put('orders/:id/issue')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Issue purchase order' })
  @ApiResponse({ status: 200, description: 'PO issued' })
  async issuePurchaseOrder(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.purchasesService.issuePurchaseOrder(id, organizationId, userId);
  }

  @Put('orders/:id/cancel')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Cancel purchase order' })
  @ApiResponse({ status: 200, description: 'PO cancelled' })
  async cancelPurchaseOrder(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.purchasesService.cancelPurchaseOrder(id, organizationId);
  }

  @Post('orders/:id/bill')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create bill from PO' })
  @ApiResponse({ status: 201, description: 'Bill created' })
  async createBillFromPO(
    @Param('id') purchaseOrderId: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto?: CreateBillFromPODto
  ) {
    return this.purchasesService.createBillFromPO(purchaseOrderId, organizationId, userId, dto);
  }

  // ============ Purchase Receives ============

  @Post('receives')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create purchase receive' })
  @ApiResponse({ status: 201, description: 'Receive created' })
  async createReceive(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReceiveDto
  ) {
    return this.purchasesService.createReceive(organizationId, userId, dto);
  }

  @Get('receives')
  @ApiOperation({ summary: 'List purchase receives' })
  @ApiResponse({ status: 200, description: 'List of receives' })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'purchaseOrderId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getReceives(
    @CurrentUser('organizationId') organizationId: string,
    @Query('vendorId') vendorId?: string,
    @Query('purchaseOrderId') purchaseOrderId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.purchasesService.getReceives(organizationId, {
      vendorId,
      purchaseOrderId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  // ============ Bills ============

  @Post('bills')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create bill' })
  @ApiResponse({ status: 201, description: 'Bill created' })
  async createBill(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBillDto
  ) {
    return this.purchasesService.createBill(organizationId, userId, dto);
  }

  @Get('bills')
  @ApiOperation({ summary: 'List bills' })
  @ApiResponse({ status: 200, description: 'List of bills' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getBills(
    @CurrentUser('organizationId') organizationId: string,
    @Query('status') status?: string,
    @Query('vendorId') vendorId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.purchasesService.getBills(organizationId, {
      status,
      vendorId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('bills/:id')
  @ApiOperation({ summary: 'Get bill by ID' })
  @ApiResponse({ status: 200, description: 'Bill details' })
  async getBill(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.purchasesService.getBill(id, organizationId);
  }

  @Put('bills/:id/approve')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Approve bill' })
  @ApiResponse({ status: 200, description: 'Bill approved' })
  async approveBill(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.purchasesService.approveBill(id, organizationId);
  }

  // ============ Payments Made ============

  @Post('payments')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Record payment to vendor' })
  @ApiResponse({ status: 201, description: 'Payment recorded' })
  async recordVendorPayment(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateVendorPaymentDto
  ) {
    return this.purchasesService.recordVendorPayment(organizationId, userId, dto);
  }

  @Get('payments')
  @ApiOperation({ summary: 'List payments made' })
  @ApiResponse({ status: 200, description: 'List of payments' })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getVendorPayments(
    @CurrentUser('organizationId') organizationId: string,
    @Query('vendorId') vendorId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.purchasesService.getVendorPayments(organizationId, {
      vendorId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  // ============ PDF Downloads ============

  @Get('orders/:id/pdf')
  @ApiOperation({ summary: 'Download purchase order as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file' })
  @ApiQuery({ name: 'locale', required: false, enum: ['en', 'ms'], description: 'Document language (default: en)' })
  async downloadPurchaseOrderPdf(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Query('locale') locale?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const buffer = await this.purchasesService.generatePurchaseOrderPdf(id, organizationId, locale);
    const filename = `purchase-order-${id}.pdf`;

    res!.setHeader('Content-Type', 'application/pdf');
    res!.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return new StreamableFile(buffer);
  }

  @Get('bills/:id/pdf')
  @ApiOperation({ summary: 'Download bill as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file' })
  @ApiQuery({ name: 'locale', required: false, enum: ['en', 'ms'], description: 'Document language (default: en)' })
  async downloadBillPdf(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Query('locale') locale?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const buffer = await this.purchasesService.generateBillPdf(id, organizationId, locale);
    const filename = `bill-${id}.pdf`;

    res!.setHeader('Content-Type', 'application/pdf');
    res!.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return new StreamableFile(buffer);
  }
}
