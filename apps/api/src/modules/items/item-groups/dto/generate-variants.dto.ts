import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';

export class GenerateVariantsDto {
  @ApiProperty({ description: 'Base SKU for variants (e.g., "TSHIRT")' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  baseSku: string;

  @ApiProperty({ description: 'Base name for variants (e.g., "T-Shirt")' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  baseName: string;

  @ApiPropertyOptional({ description: 'Description for all variants' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Unit of measurement', default: 'pcs' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional({ description: 'Base cost price for variants', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseCostPrice?: number;

  @ApiPropertyOptional({ description: 'Base selling price for variants', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseSellingPrice?: number;

  @ApiPropertyOptional({ description: 'Category ID for all variants' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}
