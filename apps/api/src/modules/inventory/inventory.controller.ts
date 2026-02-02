import {
  Controller,
  Get,
  Post,
  Put,
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
import { InventoryService } from './inventory.service';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { CreateBatchDto } from './dto/batch.dto';
import { CreateSerialDto, CreateBulkSerialsDto, TransferSerialDto } from './dto/serial.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Inventory')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ============ Stock Levels ============

  @Get('stock')
  @ApiOperation({ summary: 'Get stock levels' })
  @ApiResponse({ status: 200, description: 'List of stock levels' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'itemId', required: false })
  async getStockLevels(
    @CurrentUser('organizationId') organizationId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('itemId') itemId?: string
  ) {
    return this.inventoryService.getStockLevels(organizationId, warehouseId, itemId);
  }

  @Get('stock/:itemId')
  @ApiOperation({ summary: 'Get item stock across warehouses' })
  @ApiResponse({ status: 200, description: 'Item stock levels' })
  async getItemStock(
    @Param('itemId') itemId: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.inventoryService.getItemStock(itemId, organizationId);
  }

  // ============ Adjustments ============

  @Post('adjustments')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create stock adjustment' })
  @ApiResponse({ status: 201, description: 'Adjustment created' })
  @ApiResponse({ status: 400, description: 'Insufficient stock' })
  async createAdjustment(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAdjustmentDto
  ) {
    return this.inventoryService.createAdjustment(organizationId, userId, dto);
  }

  @Get('adjustments')
  @ApiOperation({ summary: 'List stock adjustments' })
  @ApiResponse({ status: 200, description: 'List of adjustments' })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async getAdjustments(
    @CurrentUser('organizationId') organizationId: string,
    @Query('itemId') itemId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string
  ) {
    return this.inventoryService.getAdjustments(organizationId, {
      itemId,
      warehouseId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  // ============ Transfers ============

  @Post('transfers')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create inventory transfer' })
  @ApiResponse({ status: 201, description: 'Transfer created' })
  @ApiResponse({ status: 400, description: 'Invalid warehouses' })
  async createTransfer(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTransferDto
  ) {
    return this.inventoryService.createTransfer(organizationId, userId, dto);
  }

  @Get('transfers')
  @ApiOperation({ summary: 'List inventory transfers' })
  @ApiResponse({ status: 200, description: 'List of transfers' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'warehouseId', required: false })
  async getTransfers(
    @CurrentUser('organizationId') organizationId: string,
    @Query('status') status?: string,
    @Query('warehouseId') warehouseId?: string
  ) {
    return this.inventoryService.getTransfers(organizationId, status, warehouseId);
  }

  @Put('transfers/:id/issue')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Issue transfer (send from source)' })
  @ApiResponse({ status: 200, description: 'Transfer issued' })
  @ApiResponse({ status: 400, description: 'Cannot issue transfer' })
  async issueTransfer(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.inventoryService.issueTransfer(id, organizationId, userId);
  }

  @Put('transfers/:id/receive')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Receive transfer (at destination)' })
  @ApiResponse({ status: 200, description: 'Transfer received' })
  @ApiResponse({ status: 400, description: 'Cannot receive transfer' })
  async receiveTransfer(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.inventoryService.receiveTransfer(id, organizationId, userId);
  }

  @Put('transfers/:id/cancel')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Cancel transfer' })
  @ApiResponse({ status: 200, description: 'Transfer cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel transfer' })
  async cancelTransfer(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.inventoryService.cancelTransfer(id, organizationId, userId);
  }

  // ============ Batches ============

  @Post('batches')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create batch' })
  @ApiResponse({ status: 201, description: 'Batch created' })
  async createBatch(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateBatchDto
  ) {
    return this.inventoryService.createBatch(organizationId, dto);
  }

  @Get('batches')
  @ApiOperation({ summary: 'List batches' })
  @ApiResponse({ status: 200, description: 'List of batches' })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'expiringWithinDays', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getBatches(
    @CurrentUser('organizationId') organizationId: string,
    @Query('itemId') itemId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('expiringWithinDays') expiringWithinDays?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.inventoryService.getBatches(organizationId, {
      itemId,
      warehouseId,
      expiringWithinDays: expiringWithinDays ? parseInt(expiringWithinDays) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('batches/expiring')
  @ApiOperation({ summary: 'Get expiring batches' })
  @ApiResponse({ status: 200, description: 'Expiring batches' })
  @ApiQuery({ name: 'days', required: false })
  async getExpiringBatches(
    @CurrentUser('organizationId') organizationId: string,
    @Query('days') days?: string
  ) {
    return this.inventoryService.getExpiringBatches(
      organizationId,
      days ? parseInt(days) : 30
    );
  }

  // ============ Serial Numbers ============

  @Post('serials')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create serial number' })
  @ApiResponse({ status: 201, description: 'Serial number created' })
  async createSerial(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateSerialDto
  ) {
    return this.inventoryService.createSerial(organizationId, dto);
  }

  @Post('serials/bulk')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create multiple serial numbers' })
  @ApiResponse({ status: 201, description: 'Serial numbers created' })
  async createBulkSerials(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateBulkSerialsDto
  ) {
    return this.inventoryService.createBulkSerials(organizationId, dto);
  }

  @Get('serials')
  @ApiOperation({ summary: 'List serial numbers' })
  @ApiResponse({ status: 200, description: 'List of serial numbers' })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getSerials(
    @CurrentUser('organizationId') organizationId: string,
    @Query('itemId') itemId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.inventoryService.getSerials(organizationId, {
      itemId,
      warehouseId,
      status,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post('serials/transfer')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Transfer serial number to another warehouse' })
  @ApiResponse({ status: 200, description: 'Serial number transferred' })
  async transferSerial(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: TransferSerialDto
  ) {
    return this.inventoryService.transferSerial(organizationId, dto);
  }
}
