import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BOMComponentDto {
  @ApiProperty({ description: 'Component item ID' })
  @IsString()
  @IsNotEmpty()
  componentItemId: string;

  @ApiProperty({ description: 'Quantity required per unit of composite item' })
  @IsNumber()
  @Min(0.0001)
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({ description: 'Notes about this component' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Sort order for display' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sortOrder?: number;
}

export class CreateCompositeDto {
  @ApiProperty({ description: 'Item ID to mark as composite' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiPropertyOptional({
    description: 'Assembly method',
    enum: ['MANUAL', 'ON_SALE'],
    default: 'MANUAL',
  })
  @IsOptional()
  @IsEnum(['MANUAL', 'ON_SALE'])
  assemblyMethod?: 'MANUAL' | 'ON_SALE';

  @ApiProperty({ description: 'BOM components', type: [BOMComponentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BOMComponentDto)
  components: BOMComponentDto[];
}
