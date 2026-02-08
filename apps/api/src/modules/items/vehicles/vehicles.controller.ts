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
import { VehiclesService } from './vehicles.service';
import { CreateMakeDto, UpdateMakeDto } from './dto/create-make.dto';
import { CreateModelDto, UpdateModelDto } from './dto/create-model.dto';
import { CreateCompatibilityDto } from './dto/create-compatibility.dto';
import { VehicleSearchQueryDto } from './dto/vehicle-search-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Vehicle Compatibility')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller()
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  // ==========================================
  // VEHICLE MAKES
  // ==========================================

  @Get('vehicles/makes')
  @ApiOperation({ summary: 'List all vehicle makes' })
  @ApiResponse({ status: 200, description: 'List of vehicle makes' })
  async findAllMakes(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.vehiclesService.findAllMakes(organizationId);
  }

  @Post('vehicles/makes')
  @ApiOperation({ summary: 'Create a vehicle make' })
  @ApiResponse({ status: 201, description: 'Vehicle make created' })
  @ApiResponse({ status: 409, description: 'Make name already exists' })
  async createMake(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateMakeDto,
  ) {
    return this.vehiclesService.createMake(organizationId, dto);
  }

  @Put('vehicles/makes/:id')
  @ApiOperation({ summary: 'Update a vehicle make' })
  @ApiResponse({ status: 200, description: 'Vehicle make updated' })
  @ApiResponse({ status: 404, description: 'Make not found' })
  async updateMake(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateMakeDto,
  ) {
    return this.vehiclesService.updateMake(id, organizationId, dto);
  }

  @Delete('vehicles/makes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a vehicle make (cascades to models)' })
  @ApiResponse({ status: 204, description: 'Vehicle make deleted' })
  @ApiResponse({ status: 404, description: 'Make not found' })
  async deleteMake(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    await this.vehiclesService.deleteMake(id, organizationId);
  }

  // ==========================================
  // VEHICLE MODELS
  // ==========================================

  @Get('vehicles/makes/:makeId/models')
  @ApiOperation({ summary: 'List models for a vehicle make' })
  @ApiResponse({ status: 200, description: 'List of vehicle models' })
  @ApiResponse({ status: 404, description: 'Make not found' })
  async findModelsByMake(
    @Param('makeId') makeId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.vehiclesService.findModelsByMake(makeId, organizationId);
  }

  @Post('vehicles/makes/:makeId/models')
  @ApiOperation({ summary: 'Create a vehicle model' })
  @ApiResponse({ status: 201, description: 'Vehicle model created' })
  @ApiResponse({ status: 404, description: 'Make not found' })
  @ApiResponse({ status: 409, description: 'Model name already exists for this make' })
  async createModel(
    @Param('makeId') makeId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateModelDto,
  ) {
    return this.vehiclesService.createModel(makeId, organizationId, dto);
  }

  @Put('vehicles/models/:id')
  @ApiOperation({ summary: 'Update a vehicle model' })
  @ApiResponse({ status: 200, description: 'Vehicle model updated' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async updateModel(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateModelDto,
  ) {
    return this.vehiclesService.updateModel(id, organizationId, dto);
  }

  @Delete('vehicles/models/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a vehicle model' })
  @ApiResponse({ status: 204, description: 'Vehicle model deleted' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async deleteModel(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    await this.vehiclesService.deleteModel(id, organizationId);
  }

  // ==========================================
  // ITEM VEHICLE COMPATIBILITY
  // ==========================================

  @Get('items/:itemId/compatibility')
  @ApiOperation({ summary: 'List compatible vehicles for an item' })
  @ApiResponse({ status: 200, description: 'List of vehicle compatibilities' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async findItemCompatibilities(
    @Param('itemId') itemId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.vehiclesService.findItemCompatibilities(itemId, organizationId);
  }

  @Post('items/:itemId/compatibility')
  @ApiOperation({ summary: 'Add a vehicle compatibility to an item' })
  @ApiResponse({ status: 201, description: 'Compatibility added' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  @ApiResponse({ status: 400, description: 'Invalid make/model' })
  async addCompatibility(
    @Param('itemId') itemId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateCompatibilityDto,
  ) {
    return this.vehiclesService.addCompatibility(itemId, organizationId, dto);
  }

  @Delete('items/compatibility/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a vehicle compatibility' })
  @ApiResponse({ status: 204, description: 'Compatibility removed' })
  @ApiResponse({ status: 404, description: 'Compatibility not found' })
  async removeCompatibility(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    await this.vehiclesService.removeCompatibility(id, organizationId);
  }

  // ==========================================
  // VEHICLE SEARCH
  // ==========================================

  @Get('items/search/by-vehicle')
  @ApiOperation({ summary: 'Search items by vehicle compatibility' })
  @ApiResponse({ status: 200, description: 'Paginated list of compatible items' })
  async searchByVehicle(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: VehicleSearchQueryDto,
  ) {
    return this.vehiclesService.searchItemsByVehicle(organizationId, query);
  }
}
