import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BinStockActionDto {
  @ApiProperty({ description: 'Bin ID' })
  @IsString()
  @IsNotEmpty()
  binId: string;

  @ApiProperty({ description: 'Item ID' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ example: 10, description: 'Quantity to put away or pick' })
  @IsNumber()
  @Min(0.0001)
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({ description: 'Batch ID (if tracking batches)' })
  @IsOptional()
  @IsString()
  batchId?: string;
}
