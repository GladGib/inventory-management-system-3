import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GenerateBarcodeQueryDto {
  @ApiPropertyOptional({ example: 'code128', description: 'Barcode format' })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({ example: 200, description: 'Barcode width in pixels' })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(600)
  @Type(() => Number)
  width?: number;

  @ApiPropertyOptional({ example: 80, description: 'Barcode height in pixels' })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(300)
  @Type(() => Number)
  height?: number;
}

export class BatchBarcodeDto {
  @ApiProperty({
    example: ['clxxxx1', 'clxxxx2'],
    description: 'Array of item IDs to generate barcodes for',
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  itemIds: string[];

  @ApiPropertyOptional({ example: 'code128', description: 'Barcode format' })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({
    example: 'thermal',
    description: 'Label template: thermal (2x1 inch) or a4 (grid on A4)',
  })
  @IsOptional()
  @IsString()
  labelTemplate?: string;
}
