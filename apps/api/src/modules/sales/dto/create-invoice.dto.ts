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

export class InvoiceItemDto {
  @ApiProperty({ description: 'Item ID' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiPropertyOptional({ description: 'Line item description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 10, description: 'Quantity' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ example: 100.0, description: 'Unit price' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitPrice: number;

  @ApiPropertyOptional({ example: 5, description: 'Discount percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountPercent?: number;

  @ApiPropertyOptional({ description: 'Tax rate ID' })
  @IsOptional()
  @IsString()
  taxRateId?: string;
}

export class CreateInvoiceDto {
  @ApiPropertyOptional({ description: 'Sales order ID (if from order)' })
  @IsOptional()
  @IsString()
  salesOrderId?: string;

  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional({ description: 'Invoice date (defaults to now)' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  invoiceDate?: Date;

  @ApiPropertyOptional({ description: 'Due date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @ApiPropertyOptional({ description: 'Payment terms in days' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  paymentTerms?: number;

  @ApiProperty({ type: [InvoiceItemDto], description: 'Invoice line items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @ApiPropertyOptional({ example: 0, description: 'Overall discount amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Invoice notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Terms and conditions' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  termsConditions?: string;

  @ApiPropertyOptional({ description: 'Billing address (JSON)' })
  @IsOptional()
  billingAddress?: any;
}

export class CreateInvoiceFromOrderDto {
  @ApiPropertyOptional({ description: 'Items to invoice (if partial)' })
  @IsOptional()
  @IsArray()
  items?: { salesOrderItemId: string; quantity: number }[];
}
