import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsDate, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum AdjustmentReason {
  OPENING_STOCK = 'OPENING_STOCK',
  DAMAGE = 'DAMAGE',
  LOSS = 'LOSS',
  RETURN = 'RETURN',
  FOUND = 'FOUND',
  CORRECTION = 'CORRECTION',
  OTHER = 'OTHER',
}

export class CreateAdjustmentDto {
  @ApiProperty({ description: 'Item ID' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ description: 'Warehouse ID' })
  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ example: 10, description: 'Quantity to adjust (positive or negative)' })
  @IsNumber()
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ enum: AdjustmentReason, example: AdjustmentReason.CORRECTION })
  @IsEnum(AdjustmentReason)
  reason: AdjustmentReason;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ description: 'Adjustment date (defaults to now)' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  adjustmentDate?: Date;
}
