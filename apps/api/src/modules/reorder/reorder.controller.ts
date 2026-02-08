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
import { ReorderService } from './reorder.service';
import { UpdateReorderSettingsDto } from './dto/update-reorder-settings.dto';
import { BulkReorderSettingsDto } from './dto/bulk-reorder-settings.dto';
import { CreateAutoPODto, BulkCreatePOsDto } from './dto/create-auto-po.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Reorder Automation')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ReorderController {
  constructor(private readonly reorderService: ReorderService) {}

  // ============ Reorder Settings ============

  // Bulk route must come before :itemId to avoid "bulk" being captured as a param
  @Put('inventory/reorder-settings/bulk')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Bulk update reorder settings' })
  @ApiResponse({ status: 200, description: 'Bulk update completed' })
  async bulkUpdateReorderSettings(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: BulkReorderSettingsDto,
  ) {
    return this.reorderService.bulkUpdateReorderSettings(organizationId, dto);
  }

  @Get('inventory/reorder-settings/:itemId')
  @ApiOperation({ summary: 'Get reorder settings for an item' })
  @ApiResponse({ status: 200, description: 'Reorder settings' })
  async getReorderSettings(
    @Param('itemId') itemId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.reorderService.getReorderSettings(itemId, organizationId);
  }

  @Put('inventory/reorder-settings/:itemId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update reorder settings for an item' })
  @ApiResponse({ status: 200, description: 'Reorder settings updated' })
  async updateReorderSettings(
    @Param('itemId') itemId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateReorderSettingsDto,
  ) {
    return this.reorderService.updateReorderSettings(itemId, organizationId, dto);
  }

  // ============ Reorder Suggestions & Alerts ============

  @Get('inventory/reorder-suggestions')
  @ApiOperation({ summary: 'Get items that need reorder' })
  @ApiResponse({ status: 200, description: 'Reorder suggestions' })
  async getReorderSuggestions(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.reorderService.getReorderSuggestions(organizationId);
  }

  @Post('inventory/check-reorder')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Check all items and create reorder alerts' })
  @ApiResponse({ status: 200, description: 'Reorder check completed' })
  async checkReorderPoints(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.reorderService.checkReorderPoints(organizationId);
  }

  @Post('inventory/auto-reorder/:alertId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a draft PO from a reorder alert' })
  @ApiResponse({ status: 201, description: 'Purchase order created' })
  async createAutoReorderPO(
    @Param('alertId') alertId: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAutoPODto,
  ) {
    return this.reorderService.createAutoReorderPO(alertId, organizationId, userId, dto);
  }

  @Post('inventory/bulk-po')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Bulk create POs from reorder alerts' })
  @ApiResponse({ status: 201, description: 'Purchase orders created' })
  async bulkCreatePOs(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: BulkCreatePOsDto,
  ) {
    return this.reorderService.bulkCreatePOs(dto.alertIds, organizationId, userId);
  }

  @Get('inventory/reorder-alerts')
  @ApiOperation({ summary: 'List reorder alerts' })
  @ApiResponse({ status: 200, description: 'Reorder alerts' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getAlerts(
    @CurrentUser('organizationId') organizationId: string,
    @Query('status') status?: string,
    @Query('itemId') itemId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reorderService.getAlerts(organizationId, {
      status,
      itemId,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Put('inventory/reorder-alerts/:id/acknowledge')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Acknowledge a reorder alert' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  async acknowledgeAlert(
    @Param('id') alertId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.reorderService.acknowledgeAlert(alertId, organizationId);
  }

  @Put('inventory/reorder-alerts/:id/resolve')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Resolve a reorder alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  async resolveAlert(
    @Param('id') alertId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.reorderService.resolveAlert(alertId, organizationId);
  }

  // ============ Demand Forecast ============

  @Get('inventory/demand-forecast/:itemId')
  @ApiOperation({ summary: 'Get demand forecast for an item' })
  @ApiResponse({ status: 200, description: 'Demand forecast' })
  @ApiQuery({ name: 'periods', required: false, description: 'Number of future periods to forecast' })
  async getDemandForecast(
    @Param('itemId') itemId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Query('periods') periods?: string,
  ) {
    return this.reorderService.forecastDemand(
      itemId,
      organizationId,
      periods ? parseInt(periods) : 3,
    );
  }

  // ============ Reports ============

  @Get('reports/reorder')
  @ApiOperation({ summary: 'Get reorder report' })
  @ApiResponse({ status: 200, description: 'Reorder report' })
  async getReorderReport(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.reorderService.getReorderReport(organizationId);
  }
}
