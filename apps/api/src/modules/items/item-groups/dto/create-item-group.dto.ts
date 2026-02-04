import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  MinLength,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AttributeDto {
  @ApiProperty({ description: 'Attribute name (e.g., "Size", "Color")' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: 'Attribute values (e.g., ["S", "M", "L"])' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  values: string[];
}

export class CreateItemGroupDto {
  @ApiProperty({ description: 'Item group name' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Item group description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Variant attributes', type: [AttributeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeDto)
  attributes: AttributeDto[];
}
