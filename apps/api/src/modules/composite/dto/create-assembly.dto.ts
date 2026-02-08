import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDate,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateAssemblyDto {
  @ApiProperty({ description: 'Composite item ID (must have a BOM defined)' })
  @IsString()
  @IsNotEmpty()
  compositeItemId: string;

  @ApiProperty({ description: 'Quantity to assemble' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ description: 'Warehouse ID where assembly takes place' })
  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @ApiPropertyOptional({ description: 'Assembly date (defaults to now)' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  assemblyDate?: Date;

  @ApiPropertyOptional({ description: 'Notes about the assembly' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateDisassemblyDto {
  @ApiProperty({ description: 'Composite item ID' })
  @IsString()
  @IsNotEmpty()
  compositeItemId: string;

  @ApiProperty({ description: 'Quantity to disassemble' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ description: 'Warehouse ID where disassembly takes place' })
  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @ApiPropertyOptional({ description: 'Notes about the disassembly' })
  @IsOptional()
  @IsString()
  notes?: string;
}
