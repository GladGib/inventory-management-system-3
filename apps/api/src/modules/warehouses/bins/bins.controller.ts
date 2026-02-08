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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BinsService } from './bins.service';
import { CreateZoneDto, UpdateZoneDto } from './dto/create-zone.dto';
import { CreateBinDto, UpdateBinDto } from './dto/create-bin.dto';
import { BinStockActionDto } from './dto/bin-stock-action.dto';
import { BinQueryDto } from './dto/bin-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Warehouse Bins')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('warehouses')
export class BinsController {
  constructor(private readonly binsService: BinsService) {}

  // ============ Zones ============

  @Get(':warehouseId/zones')
  @ApiOperation({ summary: 'List zones for a warehouse' })
  @ApiResponse({ status: 200, description: 'List of zones' })
  async findAllZones(
    @Param('warehouseId') warehouseId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.binsService.findAllZones(warehouseId, organizationId);
  }

  @Post(':warehouseId/zones')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a zone in a warehouse' })
  @ApiResponse({ status: 201, description: 'Zone created' })
  @ApiResponse({ status: 409, description: 'Zone name already exists' })
  async createZone(
    @Param('warehouseId') warehouseId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateZoneDto,
  ) {
    return this.binsService.createZone(warehouseId, organizationId, dto);
  }

  @Put('zones/:zoneId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a zone' })
  @ApiResponse({ status: 200, description: 'Zone updated' })
  @ApiResponse({ status: 404, description: 'Zone not found' })
  async updateZone(
    @Param('zoneId') zoneId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateZoneDto,
  ) {
    return this.binsService.updateZone(zoneId, organizationId, dto);
  }

  @Delete('zones/:zoneId')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a zone' })
  @ApiResponse({ status: 204, description: 'Zone deleted' })
  @ApiResponse({ status: 400, description: 'Zone has bins' })
  @ApiResponse({ status: 404, description: 'Zone not found' })
  async deleteZone(
    @Param('zoneId') zoneId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    await this.binsService.deleteZone(zoneId, organizationId);
  }

  // ============ Bins ============

  @Get(':warehouseId/bins')
  @ApiOperation({ summary: 'List bins for a warehouse' })
  @ApiResponse({ status: 200, description: 'List of bins' })
  async findAllBins(
    @Param('warehouseId') warehouseId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: BinQueryDto,
  ) {
    return this.binsService.findAllBins(warehouseId, organizationId, query);
  }

  @Post(':warehouseId/bins')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a bin in a warehouse' })
  @ApiResponse({ status: 201, description: 'Bin created' })
  @ApiResponse({ status: 409, description: 'Bin code already exists' })
  async createBin(
    @Param('warehouseId') warehouseId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateBinDto,
  ) {
    return this.binsService.createBin(warehouseId, organizationId, dto);
  }

  @Put('bins/:binId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a bin' })
  @ApiResponse({ status: 200, description: 'Bin updated' })
  @ApiResponse({ status: 404, description: 'Bin not found' })
  async updateBin(
    @Param('binId') binId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateBinDto,
  ) {
    return this.binsService.updateBin(binId, organizationId, dto);
  }

  @Delete('bins/:binId')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a bin (must be empty)' })
  @ApiResponse({ status: 204, description: 'Bin deleted' })
  @ApiResponse({ status: 400, description: 'Bin has stock' })
  @ApiResponse({ status: 404, description: 'Bin not found' })
  async deleteBin(
    @Param('binId') binId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    await this.binsService.deleteBin(binId, organizationId);
  }

  // ============ Bin Stock ============

  @Get('bins/:binId/stock')
  @ApiOperation({ summary: 'Get stock breakdown for a bin' })
  @ApiResponse({ status: 200, description: 'Bin stock details' })
  @ApiResponse({ status: 404, description: 'Bin not found' })
  async getBinStock(
    @Param('binId') binId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.binsService.getBinStock(binId, organizationId);
  }

  @Post('bins/put-away')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Put away items into a bin' })
  @ApiResponse({ status: 201, description: 'Item put away successfully' })
  @ApiResponse({ status: 400, description: 'Capacity exceeded or inactive bin' })
  async putAway(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: BinStockActionDto,
  ) {
    return this.binsService.putAway(organizationId, dto);
  }

  @Post('bins/pick')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Pick items from a bin' })
  @ApiResponse({ status: 201, description: 'Item picked successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient stock' })
  async pick(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: BinStockActionDto,
  ) {
    return this.binsService.pick(organizationId, dto);
  }
}
