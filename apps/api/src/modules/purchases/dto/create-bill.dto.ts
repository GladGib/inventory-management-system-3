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

export class BillItemDto {
  @ApiPropertyOptional({ description: 'Item ID (for inventory items)' })
  @IsOptional()
  @IsString()
  itemId?: string;

  @ApiProperty({ description: 'Line description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 10, description: 'Quantity' })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ example: 50.0, description: 'Unit price' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Tax rate ID' })
  @IsOptional()
  @IsString()
  taxRateId?: string;

  @ApiPropertyOptional({ description: 'Account ID (for expense categorization)' })
  @IsOptional()
  @IsString()
  accountId?: string;
}

export class CreateBillDto {
  @ApiPropertyOptional({ description: 'Purchase order ID' })
  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @ApiPropertyOptional({ description: 'Purchase receive ID' })
  @IsOptional()
  @IsString()
  purchaseReceiveId?: string;

  @ApiProperty({ description: 'Vendor ID' })
  @IsString()
  @IsNotEmpty()
  vendorId: string;

  @ApiPropertyOptional({ description: 'Vendor bill number/reference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vendorBillNumber?: string;

  @ApiPropertyOptional({ description: 'Bill date (defaults to now)' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  billDate?: Date;

  @ApiPropertyOptional({ description: 'Due date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @ApiProperty({ type: [BillItemDto], description: 'Bill line items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillItemDto)
  items: BillItemDto[];

  @ApiPropertyOptional({ example: 0, description: 'Overall discount amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Bill notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CreateBillFromPODto {
  @ApiPropertyOptional({ description: 'Vendor bill number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vendorBillNumber?: string;

  @ApiPropertyOptional({ description: 'Bill date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  billDate?: Date;

  @ApiPropertyOptional({ description: 'Due date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;
}
