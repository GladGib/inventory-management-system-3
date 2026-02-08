import {
  IsString,
  IsOptional,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCrossReferenceDto {
  @ApiProperty({ example: '04465-0D150', description: 'OEM part number' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  oemNumber: string;

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
