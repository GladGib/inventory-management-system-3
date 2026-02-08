import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsEnum,
  IsDate,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum SerialStatus {
  IN_STOCK = 'IN_STOCK',
  SOLD = 'SOLD',
  RETURNED = 'RETURNED',
  DAMAGED = 'DAMAGED',
  DEFECTIVE = 'DEFECTIVE',
  IN_REPAIR = 'IN_REPAIR',
  SCRAPPED = 'SCRAPPED',
  IN_TRANSIT = 'IN_TRANSIT',
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

  @ApiPropertyOptional({ description: 'Purchase receive ID' })
  @IsOptional()
  @IsString()
  purchaseReceiveId?: string;

  @ApiPropertyOptional({ description: 'Supplier ID' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Purchase cost per unit' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  purchaseCost?: number;

  @ApiPropertyOptional({ description: 'Warranty months' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  warrantyMonths?: number;
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

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ description: 'Warranty months' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  warrantyMonths?: number;

  @ApiPropertyOptional({ description: 'Warranty start date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  warrantyStartDate?: Date;

  @ApiPropertyOptional({ description: 'Warranty end date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  warrantyEndDate?: Date;
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

export class AssignSerialsDto {
  @ApiProperty({ description: 'Serial number IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  serialIds: string[];

  @ApiPropertyOptional({ description: 'Sales order item ID' })
  @IsOptional()
  @IsString()
  salesOrderItemId?: string;

  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  @IsNotEmpty()
  customerId: string;
}

export class CreateWarrantyClaimDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ description: 'Claim date' })
  @IsDate()
  @Type(() => Date)
  claimDate: Date;

  @ApiProperty({ description: 'Issue description' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  issueDescription: string;
}

export class UpdateWarrantyClaimDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'RESOLVED'] })
  @IsOptional()
  @IsEnum(['PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'RESOLVED'])
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS' | 'RESOLVED';

  @ApiPropertyOptional({ description: 'Resolution description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolution?: string;

  @ApiPropertyOptional({ description: 'Resolved date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  resolvedDate?: Date;

  @ApiPropertyOptional({ description: 'Replacement serial ID' })
  @IsOptional()
  @IsString()
  replacementSerialId?: string;
}
