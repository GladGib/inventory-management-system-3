import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCompatibilityDto {
  @ApiProperty({ example: 'clxxxxxxxxxxxxxxxx', description: 'Vehicle make ID' })
  @IsString()
  @IsNotEmpty()
  vehicleMakeId: string;

  @ApiPropertyOptional({ example: 'clxxxxxxxxxxxxxxxx', description: 'Vehicle model ID' })
  @IsOptional()
  @IsString()
  vehicleModelId?: string;

  @ApiPropertyOptional({ example: 2014, description: 'Year range start' })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  @Type(() => Number)
  yearFrom?: number;

  @ApiPropertyOptional({ example: 2023, description: 'Year range end' })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  @Type(() => Number)
  yearTo?: number;

  @ApiPropertyOptional({ example: 'Front axle only', description: 'Additional notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
