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
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemQueryDto } from './dto/item-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Items')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  @ApiOperation({ summary: 'List items with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Paginated list of items' })
  async findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: ItemQueryDto
  ) {
    return this.itemsService.findAll(organizationId, query);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'List items below reorder level' })
  @ApiResponse({ status: 200, description: 'List of low stock items' })
  async getLowStock(@CurrentUser('organizationId') organizationId: string) {
    return this.itemsService.getLowStockItems(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get item by ID' })
  @ApiResponse({ status: 200, description: 'Item details with stock levels' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.itemsService.findById(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new item' })
  @ApiResponse({ status: 201, description: 'Item created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'SKU already exists' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() createDto: CreateItemDto
  ) {
    return this.itemsService.create(organizationId, userId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an item' })
  @ApiResponse({ status: 200, description: 'Item updated' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  @ApiResponse({ status: 409, description: 'SKU already exists' })
  async update(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdateItemDto
  ) {
    return this.itemsService.update(id, organizationId, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an item (soft delete)' })
  @ApiResponse({ status: 204, description: 'Item deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete item with stock' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    await this.itemsService.delete(id, organizationId);
  }
}
