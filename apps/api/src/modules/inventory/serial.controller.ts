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
import { SerialService } from './serial.service';
import {
  CreateBulkSerialsDto,
  UpdateSerialDto,
  AssignSerialsDto,
  CreateWarrantyClaimDto,
  UpdateWarrantyClaimDto,
} from './dto/serial.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Serials')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class SerialController {
  constructor(private readonly serialService: SerialService) {}

  // ============ Item-scoped serial routes ============

  @Get('items/:id/serials')
  @ApiOperation({ summary: 'List serials for an item' })
  @ApiResponse({ status: 200, description: 'Paginated list of serials' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listSerialsForItem(
    @Param('id') itemId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.serialService.listSerials(organizationId, {
      itemId,
      warehouseId,
      status,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post('items/:id/serials')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Register serials for an item (bulk)' })
  @ApiResponse({ status: 201, description: 'Serials registered' })
  async registerSerialsForItem(
    @Param('id') itemId: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBulkSerialsDto,
  ) {
    dto.itemId = itemId;
    return this.serialService.registerSerials(organizationId, userId, dto);
  }

  // ============ Serial detail routes ============

  @Get('serials/search')
  @ApiOperation({ summary: 'Search serials by serial number' })
  @ApiResponse({ status: 200, description: 'Matching serial numbers' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  async searchSerials(
    @CurrentUser('organizationId') organizationId: string,
    @Query('q') query: string,
  ) {
    return this.serialService.searchSerials(query, organizationId);
  }

  @Get('serials/available')
  @ApiOperation({ summary: 'Get available serials for sale' })
  @ApiResponse({ status: 200, description: 'Available serial numbers' })
  @ApiQuery({ name: 'itemId', required: true })
  @ApiQuery({ name: 'warehouseId', required: true })
  async getAvailableSerials(
    @CurrentUser('organizationId') organizationId: string,
    @Query('itemId') itemId: string,
    @Query('warehouseId') warehouseId: string,
  ) {
    return this.serialService.getAvailableSerials(
      itemId,
      warehouseId,
      organizationId,
    );
  }

  @Get('serials/:id')
  @ApiOperation({ summary: 'Get serial details' })
  @ApiResponse({ status: 200, description: 'Serial details with history' })
  async getSerial(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.serialService.getSerial(id, organizationId);
  }

  @Put('serials/:id')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Update serial details' })
  @ApiResponse({ status: 200, description: 'Serial updated' })
  async updateSerial(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSerialDto,
  ) {
    return this.serialService.updateSerial(id, organizationId, userId, dto);
  }

  @Get('serials/:id/history')
  @ApiOperation({ summary: 'Get serial lifecycle history' })
  @ApiResponse({ status: 200, description: 'Serial history' })
  async getSerialHistory(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.serialService.getSerialHistory(id, organizationId);
  }

  // ============ Serial assignment ============

  @Post('serials/assign')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Assign serials to a sale' })
  @ApiResponse({ status: 200, description: 'Serials assigned' })
  async assignSerials(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AssignSerialsDto,
  ) {
    return this.serialService.assignSerialsToSale(
      organizationId,
      userId,
      dto,
    );
  }

  // ============ Warranty routes ============

  @Post('serials/:id/warranty-claim')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create warranty claim for serial' })
  @ApiResponse({ status: 201, description: 'Warranty claim created' })
  async createWarrantyClaim(
    @Param('id') serialId: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWarrantyClaimDto,
  ) {
    return this.serialService.createWarrantyClaim(
      serialId,
      organizationId,
      userId,
      dto,
    );
  }

  @Get('warranty-claims')
  @ApiOperation({ summary: 'List warranty claims' })
  @ApiResponse({ status: 200, description: 'Paginated list of claims' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getWarrantyClaims(
    @CurrentUser('organizationId') organizationId: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.serialService.getWarrantyClaims(organizationId, {
      status,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Put('warranty-claims/:id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update warranty claim' })
  @ApiResponse({ status: 200, description: 'Warranty claim updated' })
  async updateWarrantyClaim(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateWarrantyClaimDto,
  ) {
    return this.serialService.updateWarrantyClaim(id, organizationId, dto);
  }

  // ============ Reports ============

  @Get('reports/serials/warranty')
  @ApiOperation({ summary: 'Get warranty report' })
  @ApiResponse({ status: 200, description: 'Warranty report' })
  async getWarrantyReport(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.serialService.getWarrantyReport(organizationId);
  }

  // ============ All serials list ============

  @Get('inventory/serials')
  @ApiOperation({ summary: 'List all serials in organization' })
  @ApiResponse({ status: 200, description: 'Paginated list of all serials' })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listAllSerials(
    @CurrentUser('organizationId') organizationId: string,
    @Query('itemId') itemId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.serialService.listSerials(organizationId, {
      itemId,
      warehouseId,
      status,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }
}
