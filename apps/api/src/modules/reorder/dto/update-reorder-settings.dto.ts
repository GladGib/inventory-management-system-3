import {
  IsNumber,
  IsOptional,
  IsBoolean,
  IsString,
  IsInt,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateReorderSettingsDto {
  @ApiPropertyOptional({ description: 'Warehouse ID (null for global item settings)' })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional({ description: 'Reorder level (stock qty that triggers reorder)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  reorderLevel?: number;

  @ApiPropertyOptional({ description: 'Quantity to reorder' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  reorderQuantity?: number;

  @ApiPropertyOptional({ description: 'Safety stock buffer' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  safetyStock?: number;

  @ApiPropertyOptional({ description: 'Lead time in days' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  leadTimeDays?: number;

  @ApiPropertyOptional({ description: 'Preferred vendor contact ID' })
  @IsOptional()
  @IsString()
  preferredVendorId?: string;

  @ApiPropertyOptional({ description: 'Enable auto-reorder PO creation' })
  @IsOptional()
  @IsBoolean()
  autoReorder?: boolean;

  @ApiPropertyOptional({ description: 'Whether settings are active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
