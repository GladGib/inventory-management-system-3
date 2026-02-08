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
import { CreateCrossReferenceDto } from './dto/create-cross-reference.dto';
import { UpdateCrossReferenceDto } from './dto/update-cross-reference.dto';
import { GenerateBarcodeQueryDto, BatchBarcodeDto } from './dto/generate-barcode.dto';
import { CreateSupersessionDto } from './dto/supersession.dto';
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

  @Get('search/by-part-number')
  @ApiOperation({ summary: 'Search items by part number across all references' })
  @ApiResponse({ status: 200, description: 'Items matching the part number query' })
  async searchByPartNumber(
    @CurrentUser('organizationId') organizationId: string,
    @Query('query') query: string
  ) {
    return this.itemsService.searchByPartNumber(query, organizationId);
  }

  @Post('barcode/batch')
  @ApiOperation({ summary: 'Generate barcodes for multiple items' })
  @ApiResponse({ status: 200, description: 'Array of barcode SVGs with item info' })
  async getBatchBarcodes(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: BatchBarcodeDto
  ) {
    return this.itemsService.generateBatchBarcodes(
      dto.itemIds,
      organizationId,
      { format: dto.format, labelTemplate: dto.labelTemplate },
    );
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

  // ============ Cross-Reference Endpoints ============

  @Get(':id/cross-references')
  @ApiOperation({ summary: 'List cross-references for an item' })
  @ApiResponse({ status: 200, description: 'List of cross-references' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async getCrossReferences(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.itemsService.getCrossReferences(id, organizationId);
  }

  @Post(':id/cross-references')
  @ApiOperation({ summary: 'Add a cross-reference to an item' })
  @ApiResponse({ status: 201, description: 'Cross-reference added' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async addCrossReference(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateCrossReferenceDto
  ) {
    return this.itemsService.addCrossReference(id, dto, organizationId);
  }

  @Put('cross-references/:crossRefId')
  @ApiOperation({ summary: 'Update a cross-reference' })
  @ApiResponse({ status: 200, description: 'Cross-reference updated' })
  @ApiResponse({ status: 404, description: 'Cross-reference not found' })
  async updateCrossReference(
    @Param('crossRefId') crossRefId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateCrossReferenceDto
  ) {
    return this.itemsService.updateCrossReference(crossRefId, dto, organizationId);
  }

  @Delete('cross-references/:crossRefId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a cross-reference' })
  @ApiResponse({ status: 204, description: 'Cross-reference deleted' })
  @ApiResponse({ status: 404, description: 'Cross-reference not found' })
  async deleteCrossReference(
    @Param('crossRefId') crossRefId: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    await this.itemsService.deleteCrossReference(crossRefId, organizationId);
  }

  // ============ Barcode Endpoints ============

  @Get(':id/barcode')
  @ApiOperation({ summary: 'Generate barcode SVG for an item' })
  @ApiResponse({ status: 200, description: 'Barcode SVG string' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async getBarcode(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: GenerateBarcodeQueryDto
  ) {
    const svg = await this.itemsService.generateBarcode(id, organizationId, {
      format: query.format,
      width: query.width,
      height: query.height,
    });
    return { svg };
  }

  // ============ Supersession Endpoints ============

  @Post(':id/supersede')
  @ApiOperation({ summary: 'Mark an item as superseded by another item' })
  @ApiResponse({ status: 201, description: 'Supersession record created' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  @ApiResponse({ status: 409, description: 'Supersession already exists' })
  async supersedeItem(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateSupersessionDto
  ) {
    return this.itemsService.supersedeItem(id, organizationId, dto);
  }

  @Get(':id/supersession-chain')
  @ApiOperation({ summary: 'Get supersession chain for an item' })
  @ApiResponse({ status: 200, description: 'Supersession chain including predecessors and successors' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async getSupersessionChain(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.itemsService.getSupersessionChain(id, organizationId);
  }
}
