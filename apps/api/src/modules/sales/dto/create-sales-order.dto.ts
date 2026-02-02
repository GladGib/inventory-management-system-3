import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  IsDate,
  IsEnum,
  ValidateNested,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SalesOrderItemDto {
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

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export class CreateSalesOrderDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional({ description: 'Order date (defaults to now)' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  orderDate?: Date;

  @ApiPropertyOptional({ description: 'Expected ship date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expectedShipDate?: Date;

  @ApiProperty({ type: [SalesOrderItemDto], description: 'Order line items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesOrderItemDto)
  items: SalesOrderItemDto[];

  @ApiPropertyOptional({ enum: DiscountType, description: 'Order-level discount type' })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ApiPropertyOptional({ example: 10, description: 'Discount value (% or fixed)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountValue?: number;

  @ApiPropertyOptional({ example: 0, description: 'Shipping charges' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  shippingCharges?: number;

  @ApiPropertyOptional({ description: 'Warehouse ID for stock' })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional({ description: 'Salesperson user ID' })
  @IsOptional()
  @IsString()
  salesPersonId?: string;

  @ApiPropertyOptional({ description: 'Order notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Terms and conditions' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  termsConditions?: string;

  @ApiPropertyOptional({ description: 'Shipping address (JSON)' })
  @IsOptional()
  shippingAddress?: any;

  @ApiPropertyOptional({ description: 'Billing address (JSON)' })
  @IsOptional()
  billingAddress?: any;
}

export class UpdateSalesOrderDto {
  @ApiPropertyOptional({ description: 'Customer ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Expected ship date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expectedShipDate?: Date;

  @ApiPropertyOptional({ type: [SalesOrderItemDto], description: 'Order line items' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesOrderItemDto)
  items?: SalesOrderItemDto[];

  @ApiPropertyOptional({ enum: DiscountType })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountValue?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  shippingCharges?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  salesPersonId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  termsConditions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  shippingAddress?: any;

  @ApiPropertyOptional()
  @IsOptional()
  billingAddress?: any;
}
