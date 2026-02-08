import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDate,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBatchDto {
  @ApiProperty({ description: 'Item ID' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ description: 'Warehouse ID' })
  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ description: 'Batch number' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  batchNumber: string;

  @ApiPropertyOptional({ description: 'Manufacture date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  manufactureDate?: Date;

  @ApiPropertyOptional({ description: 'Expiry date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiryDate?: Date;

  @ApiProperty({ description: 'Initial quantity' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ description: 'Purchase receive ID' })
  @IsOptional()
  @IsString()
  purchaseReceiveId?: string;

  @ApiPropertyOptional({ description: 'Supplier ID' })
  @IsOptional()
  @IsString()
  supplierId?: string;
}

export class UpdateBatchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  manufactureDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiryDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'EXPIRED', 'DEPLETED', 'RECALLED'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'EXPIRED', 'DEPLETED', 'RECALLED'])
  status?: 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'RECALLED';
}

export class TransferBatchDto {
  @ApiProperty({ description: 'Batch ID' })
  @IsString()
  @IsNotEmpty()
  batchId: string;

  @ApiProperty({ description: 'Destination warehouse ID' })
  @IsString()
  @IsNotEmpty()
  toWarehouseId: string;

  @ApiProperty({ description: 'Quantity to transfer' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class BatchAdjustmentDto {
  @ApiProperty({ description: 'Batch ID' })
  @IsString()
  @IsNotEmpty()
  batchId: string;

  @ApiProperty({ description: 'Quantity adjustment (positive or negative)' })
  @IsNumber()
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ description: 'Reason for adjustment' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  reason: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class BatchAllocationDto {
  @ApiProperty({ description: 'Item ID' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ description: 'Warehouse ID' })
  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ description: 'Total quantity to allocate' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Allocation method: FIFO or FEFO',
    enum: ['FIFO', 'FEFO'],
    default: 'FEFO',
  })
  @IsOptional()
  @IsEnum(['FIFO', 'FEFO'])
  method?: 'FIFO' | 'FEFO';
}
