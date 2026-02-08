import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum BinType {
  STORAGE = 'STORAGE',
  PICKING = 'PICKING',
  RECEIVING = 'RECEIVING',
  SHIPPING = 'SHIPPING',
  STAGING = 'STAGING',
}

export class CreateBinDto {
  @ApiProperty({ example: 'A-01-01', description: 'Unique bin code within warehouse' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({ example: 'Aisle A, Rack 1, Shelf 1', description: 'Bin name/label' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: BinType, default: BinType.STORAGE, description: 'Bin type' })
  @IsOptional()
  @IsEnum(BinType)
  type?: BinType;

  @ApiPropertyOptional({ example: 1000, description: 'Maximum capacity (units)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxCapacity?: number;

  @ApiPropertyOptional({ description: 'Zone ID to assign bin to' })
  @IsOptional()
  @IsString()
  warehouseZoneId?: string;

  @ApiPropertyOptional({ default: true, description: 'Whether bin is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBinDto {
  @ApiPropertyOptional({ example: 'A-01-02', description: 'Bin code' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ example: 'Updated name', description: 'Bin name/label' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: BinType, description: 'Bin type' })
  @IsOptional()
  @IsEnum(BinType)
  type?: BinType;

  @ApiPropertyOptional({ example: 2000, description: 'Maximum capacity' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxCapacity?: number;

  @ApiPropertyOptional({ description: 'Zone ID' })
  @IsOptional()
  @IsString()
  warehouseZoneId?: string;

  @ApiPropertyOptional({ description: 'Whether bin is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
