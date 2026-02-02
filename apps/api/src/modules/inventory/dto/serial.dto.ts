import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SerialStatus {
  IN_STOCK = 'IN_STOCK',
  SOLD = 'SOLD',
  RETURNED = 'RETURNED',
  DAMAGED = 'DAMAGED',
}

export class CreateSerialDto {
  @ApiProperty({ description: 'Item ID' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ description: 'Warehouse ID' })
  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ description: 'Serial number' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  serialNumber: string;
}

export class CreateBulkSerialsDto {
  @ApiProperty({ description: 'Item ID' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ description: 'Warehouse ID' })
  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ description: 'Serial numbers', type: [String] })
  @IsArray()
  @IsString({ each: true })
  serialNumbers: string[];
}

export class UpdateSerialDto {
  @ApiPropertyOptional({ description: 'Warehouse ID' })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional({ enum: SerialStatus })
  @IsOptional()
  @IsEnum(SerialStatus)
  status?: SerialStatus;
}

export class TransferSerialDto {
  @ApiProperty({ description: 'Serial number ID' })
  @IsString()
  @IsNotEmpty()
  serialId: string;

  @ApiProperty({ description: 'Destination warehouse ID' })
  @IsString()
  @IsNotEmpty()
  toWarehouseId: string;
}

export class TransferBulkSerialsDto {
  @ApiProperty({ description: 'Serial number IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  serialIds: string[];

  @ApiProperty({ description: 'Destination warehouse ID' })
  @IsString()
  @IsNotEmpty()
  toWarehouseId: string;
}
