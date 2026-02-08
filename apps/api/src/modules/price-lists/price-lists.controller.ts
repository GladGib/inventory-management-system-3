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
import { PriceListsService } from './price-lists.service';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { PriceListQueryDto } from './dto/price-list-query.dto';
import {
  AddPriceListItemsDto,
  UpdatePriceListItemDto,
  BulkPriceUpdateDto,
} from './dto/price-list-item.dto';
import { EffectivePriceQueryDto } from './dto/effective-price-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Price Lists')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('price-lists')
export class PriceListsController {
  constructor(private readonly priceListsService: PriceListsService) {}

  @Get()
  @ApiOperation({ summary: 'List price lists with filtering' })
  @ApiResponse({ status: 200, description: 'Paginated list of price lists' })
  async findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: PriceListQueryDto,
  ) {
    return this.priceListsService.findAll(organizationId, query);
  }

  @Get('effective-price')
  @ApiOperation({ summary: 'Get effective price for item + contact + quantity' })
  @ApiResponse({ status: 200, description: 'Effective price details' })
  async getEffectivePrice(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: EffectivePriceQueryDto,
  ) {
    return this.priceListsService.getEffectivePrice(organizationId, query);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a new price list' })
  @ApiResponse({ status: 201, description: 'Price list created' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() createDto: CreatePriceListDto,
  ) {
    return this.priceListsService.create(organizationId, createDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get price list by ID with items' })
  @ApiResponse({ status: 200, description: 'Price list details' })
  @ApiResponse({ status: 404, description: 'Price list not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.priceListsService.findById(id, organizationId);
  }

  @Put(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a price list' })
  @ApiResponse({ status: 200, description: 'Price list updated' })
  @ApiResponse({ status: 404, description: 'Price list not found' })
  async update(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdatePriceListDto,
  ) {
    return this.priceListsService.update(id, organizationId, updateDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a price list (soft delete)' })
  @ApiResponse({ status: 204, description: 'Price list deleted' })
  @ApiResponse({ status: 404, description: 'Price list not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    await this.priceListsService.delete(id, organizationId);
  }

  @Post(':id/items')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Add items to price list' })
  @ApiResponse({ status: 201, description: 'Items added to price list' })
  async addItems(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: AddPriceListItemsDto,
  ) {
    return this.priceListsService.addItems(id, organizationId, dto);
  }

  @Put(':id/items/:itemId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update price list item' })
  @ApiResponse({ status: 200, description: 'Price list item updated' })
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdatePriceListItemDto,
  ) {
    return this.priceListsService.updateItem(id, itemId, organizationId, dto);
  }

  @Delete(':id/items/:itemId')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove item from price list' })
  @ApiResponse({ status: 204, description: 'Item removed from price list' })
  async removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    await this.priceListsService.removeItem(id, itemId, organizationId);
  }

  @Post(':id/bulk-update')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Bulk update all prices in a price list' })
  @ApiResponse({ status: 200, description: 'Prices updated' })
  async bulkUpdatePrices(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: BulkPriceUpdateDto,
  ) {
    return this.priceListsService.bulkUpdatePrices(id, organizationId, dto);
  }

  @Post(':id/import')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Import items from CSV data' })
  @ApiResponse({ status: 200, description: 'Import results' })
  async importItems(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() body: { data: Array<{ sku: string; customPrice: number; minQuantity?: number }> },
  ) {
    return this.priceListsService.importItems(id, organizationId, body.data);
  }
}
