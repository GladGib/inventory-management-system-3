import {
  IsString,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCrossReferenceDto {
  @ApiPropertyOptional({ example: '04465-0D150', description: 'OEM part number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  oemNumber?: string;

  @ApiPropertyOptional({ example: 'DB1802', description: 'Aftermarket part number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  aftermarketNumber?: string;

  @ApiPropertyOptional({ example: 'Bosch', description: 'Brand name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ example: 'Equivalent to Toyota genuine part', description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
