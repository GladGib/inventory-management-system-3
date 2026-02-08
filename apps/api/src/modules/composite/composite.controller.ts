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
import { CompositeService } from './composite.service';
import { CreateCompositeDto } from './dto/create-composite.dto';
import { UpdateBOMDto } from './dto/update-bom.dto';
import { CreateAssemblyDto, CreateDisassemblyDto } from './dto/create-assembly.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Composite Items')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class CompositeController {
  constructor(private readonly compositeService: CompositeService) {}

  // ============ BOM Management ============

  @Post('items/composite')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create composite item with BOM' })
  @ApiResponse({ status: 201, description: 'Composite item created' })
  async createCompositeItem(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateCompositeDto,
  ) {
    return this.compositeService.createCompositeItem(organizationId, dto);
  }

  @Get('items/:id/bom')
  @ApiOperation({ summary: 'Get BOM for a composite item' })
  @ApiResponse({ status: 200, description: 'Bill of Materials' })
  async getBOM(
    @Param('id') itemId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.compositeService.getCompositeItem(itemId, organizationId);
  }

  @Put('items/:id/bom')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update BOM for a composite item' })
  @ApiResponse({ status: 200, description: 'BOM updated' })
  async updateBOM(
    @Param('id') itemId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateBOMDto,
  ) {
    return this.compositeService.updateBOM(itemId, organizationId, dto);
  }

  @Get('items/:id/bom/availability')
  @ApiOperation({ summary: 'Calculate availability based on component stock' })
  @ApiResponse({ status: 200, description: 'Availability calculation' })
  @ApiQuery({ name: 'warehouseId', required: false })
  async getAvailability(
    @Param('id') itemId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.compositeService.calculateAvailability(itemId, organizationId, warehouseId);
  }

  @Get('items/:id/bom/cost')
  @ApiOperation({ summary: 'Calculate component cost for composite item' })
  @ApiResponse({ status: 200, description: 'Cost calculation' })
  async getComponentCost(
    @Param('id') itemId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.compositeService.calculateComponentCost(itemId, organizationId);
  }

  // ============ Assembly Management ============

  @Post('inventory/assembly')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create a new assembly order' })
  @ApiResponse({ status: 201, description: 'Assembly created' })
  async createAssembly(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAssemblyDto,
  ) {
    return this.compositeService.createAssembly(organizationId, userId, dto);
  }

  @Put('inventory/assembly/:id/complete')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Complete an assembly order' })
  @ApiResponse({ status: 200, description: 'Assembly completed' })
  async completeAssembly(
    @Param('id') assemblyId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.compositeService.completeAssembly(assemblyId, organizationId);
  }

  @Put('inventory/assembly/:id/cancel')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Cancel an assembly order' })
  @ApiResponse({ status: 200, description: 'Assembly cancelled' })
  async cancelAssembly(
    @Param('id') assemblyId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.compositeService.cancelAssembly(assemblyId, organizationId);
  }

  @Post('inventory/disassembly')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create a disassembly order (reverse assembly)' })
  @ApiResponse({ status: 201, description: 'Disassembly created' })
  async createDisassembly(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDisassemblyDto,
  ) {
    return this.compositeService.createDisassembly(organizationId, userId, dto);
  }

  @Get('inventory/assemblies')
  @ApiOperation({ summary: 'List assembly orders' })
  @ApiResponse({ status: 200, description: 'List of assemblies' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'compositeItemId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listAssemblies(
    @CurrentUser('organizationId') organizationId: string,
    @Query('status') status?: string,
    @Query('compositeItemId') compositeItemId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.compositeService.listAssemblies(organizationId, {
      status,
      compositeItemId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('inventory/assemblies/:id')
  @ApiOperation({ summary: 'Get assembly order details' })
  @ApiResponse({ status: 200, description: 'Assembly detail' })
  async getAssembly(
    @Param('id') assemblyId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.compositeService.getAssembly(assemblyId, organizationId);
  }
}
