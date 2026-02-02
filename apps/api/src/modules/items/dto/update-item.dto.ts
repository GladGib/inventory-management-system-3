import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ItemType } from './create-item.dto';

export enum ItemStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class UpdateItemDto {
  @ApiPropertyOptional({ example: 'BRK-001', description: 'Stock Keeping Unit' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @ApiPropertyOptional({ example: 'Brake Pad Set - Toyota Vios', description: 'Item name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Set Pad Brek - Toyota Vios', description: 'Item name in Bahasa Malaysia' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameMalay?: string;

  @ApiPropertyOptional({ description: 'Item description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: ItemType, description: 'Item type' })
  @IsOptional()
  @IsEnum(ItemType)
  type?: ItemType;

  @ApiPropertyOptional({ example: 'SET', description: 'Unit of measurement' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional({ example: 'Bosch', description: 'Brand name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ example: '04465-0D150', description: 'Part number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  partNumber?: string;

  @ApiPropertyOptional({ description: 'Cross-reference part numbers' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  crossReferences?: string[];

  @ApiPropertyOptional({ description: 'Compatible vehicle models' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vehicleModels?: string[];

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @ApiPropertyOptional({ example: 85.00, description: 'Cost price' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  costPrice?: number;

  @ApiPropertyOptional({ example: 120.00, description: 'Selling price' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  sellingPrice?: number;

  @ApiPropertyOptional({ description: 'Reorder level' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  reorderLevel?: number;

  @ApiPropertyOptional({ description: 'Reorder quantity' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  reorderQty?: number;

  @ApiPropertyOptional({ description: 'Is item taxable' })
  @IsOptional()
  @IsBoolean()
  taxable?: boolean;

  @ApiPropertyOptional({ description: 'Tax rate ID' })
  @IsOptional()
  @IsString()
  taxRateId?: string | null;

  @ApiPropertyOptional({ description: 'Track inventory' })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional({ description: 'Track batches' })
  @IsOptional()
  @IsBoolean()
  trackBatches?: boolean;

  @ApiPropertyOptional({ description: 'Track serials' })
  @IsOptional()
  @IsBoolean()
  trackSerials?: boolean;

  @ApiPropertyOptional({ enum: ItemStatus, description: 'Item status' })
  @IsOptional()
  @IsEnum(ItemStatus)
  status?: ItemStatus;

  @ApiPropertyOptional({ description: 'Image paths array' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
