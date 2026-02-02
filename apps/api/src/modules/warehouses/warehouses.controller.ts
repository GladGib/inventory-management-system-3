import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Warehouses')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  @ApiOperation({ summary: 'List all warehouses' })
  @ApiResponse({ status: 200, description: 'List of warehouses with stock summary' })
  async findAll(@CurrentUser('organizationId') organizationId: string) {
    return this.warehousesService.findAll(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  @ApiResponse({ status: 200, description: 'Warehouse details' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.warehousesService.findById(id, organizationId);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a new warehouse' })
  @ApiResponse({ status: 201, description: 'Warehouse created' })
  @ApiResponse({ status: 409, description: 'Warehouse code already exists' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() createDto: CreateWarehouseDto
  ) {
    return this.warehousesService.create(organizationId, createDto);
  }

  @Put(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse updated' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  @ApiResponse({ status: 409, description: 'Warehouse code already exists' })
  async update(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdateWarehouseDto
  ) {
    return this.warehousesService.update(id, organizationId, updateDto);
  }

  @Put(':id/set-default')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Set warehouse as default' })
  @ApiResponse({ status: 200, description: 'Warehouse set as default' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async setDefault(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.warehousesService.setDefault(id, organizationId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a warehouse' })
  @ApiResponse({ status: 204, description: 'Warehouse deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete warehouse with stock or default warehouse' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    await this.warehousesService.delete(id, organizationId);
  }
}
