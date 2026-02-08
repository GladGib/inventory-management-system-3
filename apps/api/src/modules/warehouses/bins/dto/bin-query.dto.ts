import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { BinType } from './create-bin.dto';

export class BinQueryDto {
  @ApiPropertyOptional({ description: 'Filter by zone ID' })
  @IsOptional()
  @IsString()
  warehouseZoneId?: string;

  @ApiPropertyOptional({ enum: BinType, description: 'Filter by bin type' })
  @IsOptional()
  @IsEnum(BinType)
  type?: BinType;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Search by code or name' })
  @IsOptional()
  @IsString()
  search?: string;
}
