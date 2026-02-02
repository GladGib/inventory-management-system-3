import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  IsDate,
  ValidateNested,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ReceiveItemDto {
  @ApiProperty({ description: 'Purchase order item ID' })
  @IsString()
  @IsNotEmpty()
  purchaseOrderItemId: string;

  @ApiProperty({ example: 10, description: 'Quantity received' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  receivedQty: number;

  @ApiPropertyOptional({ example: 0, description: 'Quantity rejected' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  rejectedQty?: number;

  @ApiPropertyOptional({ description: 'Rejection reason' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Batch number (if batch tracking)' })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiPropertyOptional({ description: 'Serial numbers (if serial tracking)' })
  @IsOptional()
  @IsArray()
  serialNumbers?: string[];
}

export class CreateReceiveDto {
  @ApiProperty({ description: 'Purchase order ID' })
  @IsString()
  @IsNotEmpty()
  purchaseOrderId: string;

  @ApiPropertyOptional({ description: 'Receive date (defaults to now)' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  receiveDate?: Date;

  @ApiPropertyOptional({ description: 'Destination warehouse ID (overrides PO)' })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiProperty({ type: [ReceiveItemDto], description: 'Items received' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items: ReceiveItemDto[];

  @ApiPropertyOptional({ description: 'Receive notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
