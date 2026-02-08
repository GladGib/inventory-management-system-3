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
import { BatchService } from './batch.service';
import {
  CreateBatchDto,
  UpdateBatchDto,
  BatchAdjustmentDto,
  BatchAllocationDto,
} from './dto/batch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Batches')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  // ============ Item-scoped batch routes ============

  @Get('items/:id/batches')
  @ApiOperation({ summary: 'List batches for an item' })
  @ApiResponse({ status: 200, description: 'Paginated list of batches' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listBatchesForItem(
    @Param('id') itemId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.batchService.listBatches(organizationId, {
      itemId,
      warehouseId,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post('items/:id/batches')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create batch for an item' })
  @ApiResponse({ status: 201, description: 'Batch created' })
  async createBatchForItem(
    @Param('id') itemId: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBatchDto,
  ) {
    dto.itemId = itemId;
    return this.batchService.createBatch(organizationId, userId, dto);
  }

  // ============ Batch detail routes ============

  @Get('batches/:id')
  @ApiOperation({ summary: 'Get batch details' })
  @ApiResponse({ status: 200, description: 'Batch details with transactions' })
  async getBatch(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.batchService.getBatch(id, organizationId);
  }

  @Put('batches/:id')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Update batch details' })
  @ApiResponse({ status: 200, description: 'Batch updated' })
  async updateBatch(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateBatchDto,
  ) {
    return this.batchService.updateBatch(id, organizationId, dto);
  }

  @Get('batches/:id/history')
  @ApiOperation({ summary: 'Get batch transaction history' })
  @ApiResponse({ status: 200, description: 'Batch transaction history' })
  async getBatchHistory(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.batchService.getBatchHistory(id, organizationId);
  }

  // ============ Report routes ============

  @Get('reports/batches/expiring')
  @ApiOperation({ summary: 'Get expiring batches report' })
  @ApiResponse({ status: 200, description: 'Expiring batches' })
  @ApiQuery({ name: 'days', required: false, description: 'Days ahead (default 30)' })
  async getExpiringBatches(
    @CurrentUser('organizationId') organizationId: string,
    @Query('days') days?: string,
  ) {
    return this.batchService.getExpiringBatches(
      organizationId,
      days ? parseInt(days) : 30,
    );
  }

  @Get('reports/batches/expired')
  @ApiOperation({ summary: 'Get expired batches report' })
  @ApiResponse({ status: 200, description: 'Expired batches' })
  async getExpiredBatches(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.batchService.getExpiredBatches(organizationId);
  }

  // ============ Batch adjustment ============

  @Post('inventory/adjustments/batch')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Adjust batch-specific stock' })
  @ApiResponse({ status: 201, description: 'Batch adjustment completed' })
  async adjustBatch(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: BatchAdjustmentDto,
  ) {
    return this.batchService.adjustBatch(organizationId, userId, dto);
  }

  // ============ Batch allocation ============

  @Post('inventory/batches/allocate')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Allocate batches for sale (FIFO/FEFO)' })
  @ApiResponse({ status: 200, description: 'Batch allocation result' })
  async allocateBatches(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: BatchAllocationDto,
  ) {
    return this.batchService.selectBatchesForSale(
      dto.itemId,
      dto.warehouseId,
      dto.quantity,
      dto.method || 'FEFO',
      organizationId,
    );
  }

  // ============ Batch list (all org batches) ============

  @Get('inventory/batches')
  @ApiOperation({ summary: 'List all batches in organization' })
  @ApiResponse({ status: 200, description: 'Paginated list of all batches' })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'expiryFrom', required: false })
  @ApiQuery({ name: 'expiryTo', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listAllBatches(
    @CurrentUser('organizationId') organizationId: string,
    @Query('itemId') itemId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: string,
    @Query('expiryFrom') expiryFrom?: string,
    @Query('expiryTo') expiryTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.batchService.listBatches(organizationId, {
      itemId,
      warehouseId,
      status,
      expiryFrom: expiryFrom ? new Date(expiryFrom) : undefined,
      expiryTo: expiryTo ? new Date(expiryTo) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }
}
