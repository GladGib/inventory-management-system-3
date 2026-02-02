import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ItemType {
  INVENTORY = 'INVENTORY',
  SERVICE = 'SERVICE',
  NON_INVENTORY = 'NON_INVENTORY',
}

export class CreateItemDto {
  @ApiProperty({ example: 'BRK-001', description: 'Stock Keeping Unit (unique per organization)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sku: string;

  @ApiProperty({ example: 'Brake Pad Set - Toyota Vios', description: 'Item name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Set Pad Brek - Toyota Vios', description: 'Item name in Bahasa Malaysia' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameMalay?: string;

  @ApiPropertyOptional({ example: 'High-quality brake pads for Toyota Vios 2014-2023', description: 'Item description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ enum: ItemType, example: ItemType.INVENTORY, description: 'Item type' })
  @IsEnum(ItemType)
  type: ItemType;

  @ApiProperty({ example: 'SET', description: 'Unit of measurement' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unit: string;

  @ApiPropertyOptional({ example: 'Bosch', description: 'Brand name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ example: '04465-0D150', description: 'OEM/Aftermarket part number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  partNumber?: string;

  @ApiPropertyOptional({
    example: ['04465-0D160', '04465-0D170'],
    description: 'Alternative part numbers for cross-reference',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  crossReferences?: string[];

  @ApiPropertyOptional({
    example: ['Toyota Vios 2014-2023', 'Toyota Yaris 2013-2020'],
    description: 'Compatible vehicle models',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vehicleModels?: string[];

  @ApiPropertyOptional({ example: 'clxxxxxxxxxxxxxxxx', description: 'Category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ example: 85.00, description: 'Cost price' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  costPrice: number;

  @ApiProperty({ example: 120.00, description: 'Selling price' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  sellingPrice: number;

  @ApiPropertyOptional({ example: 10, description: 'Reorder level (low stock threshold)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  reorderLevel?: number;

  @ApiPropertyOptional({ example: 20, description: 'Reorder quantity' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  reorderQty?: number;

  @ApiPropertyOptional({ example: true, description: 'Is item taxable', default: true })
  @IsOptional()
  @IsBoolean()
  taxable?: boolean;

  @ApiPropertyOptional({ example: 'clxxxxxxxxxxxxxxxx', description: 'Tax rate ID' })
  @IsOptional()
  @IsString()
  taxRateId?: string;

  @ApiPropertyOptional({ example: true, description: 'Track inventory for this item', default: true })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Track batch/lot numbers', default: false })
  @IsOptional()
  @IsBoolean()
  trackBatches?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Track serial numbers', default: false })
  @IsOptional()
  @IsBoolean()
  trackSerials?: boolean;

  @ApiPropertyOptional({ example: 50, description: 'Opening stock quantity' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  openingStock?: number;

  @ApiPropertyOptional({ example: 'clxxxxxxxxxxxxxxxx', description: 'Warehouse ID for opening stock' })
  @IsOptional()
  @IsString()
  openingStockWarehouseId?: string;
}
