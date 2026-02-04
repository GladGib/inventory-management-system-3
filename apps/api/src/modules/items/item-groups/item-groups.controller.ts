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
import { ItemGroupsService } from './item-groups.service';
import { CreateItemGroupDto } from './dto/create-item-group.dto';
import { UpdateItemGroupDto } from './dto/update-item-group.dto';
import { ItemGroupQueryDto } from './dto/item-group-query.dto';
import { GenerateVariantsDto } from './dto/generate-variants.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Item Groups')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('item-groups')
export class ItemGroupsController {
  constructor(private readonly itemGroupsService: ItemGroupsService) {}

  @Get()
  @ApiOperation({ summary: 'List all item groups' })
  @ApiResponse({ status: 200, description: 'List of item groups with item count' })
  async findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: ItemGroupQueryDto
  ) {
    return this.itemGroupsService.findAll(organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get item group by ID with variants' })
  @ApiResponse({ status: 200, description: 'Item group details with variants' })
  @ApiResponse({ status: 404, description: 'Item group not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.itemGroupsService.findById(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new item group' })
  @ApiResponse({ status: 201, description: 'Item group created' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() createDto: CreateItemGroupDto
  ) {
    return this.itemGroupsService.create(organizationId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an item group' })
  @ApiResponse({ status: 200, description: 'Item group updated' })
  @ApiResponse({ status: 404, description: 'Item group not found' })
  async update(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdateItemGroupDto
  ) {
    return this.itemGroupsService.update(id, organizationId, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an item group' })
  @ApiResponse({ status: 204, description: 'Item group deleted' })
  @ApiResponse({ status: 404, description: 'Item group not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete - has associated items' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    await this.itemGroupsService.delete(id, organizationId);
  }

  @Post(':id/variants')
  @ApiOperation({ summary: 'Generate variants for an item group' })
  @ApiResponse({ status: 201, description: 'Variants generated' })
  async generateVariants(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: GenerateVariantsDto
  ) {
    return this.itemGroupsService.generateVariants(id, organizationId, dto);
  }

  @Delete(':id/variants/:variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a variant from an item group' })
  @ApiResponse({ status: 204, description: 'Variant removed' })
  async removeVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    await this.itemGroupsService.removeVariant(id, variantId, organizationId);
  }

  @Put(':id/variants/bulk')
  @ApiOperation({ summary: 'Bulk update variants pricing' })
  @ApiResponse({ status: 200, description: 'Variants updated' })
  async bulkUpdateVariants(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() updates: Array<{ variantId: string; costPrice?: number; sellingPrice?: number }>
  ) {
    return this.itemGroupsService.bulkUpdateVariants(id, organizationId, updates);
  }
}
