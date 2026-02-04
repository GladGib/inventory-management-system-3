import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsDateString,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ReturnReason {
  DEFECTIVE = 'DEFECTIVE',
  WRONG_ITEM = 'WRONG_ITEM',
  CHANGED_MIND = 'CHANGED_MIND',
  NOT_AS_DESCRIBED = 'NOT_AS_DESCRIBED',
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  DUPLICATE_ORDER = 'DUPLICATE_ORDER',
  OTHER = 'OTHER',
}

export enum ItemCondition {
  GOOD = 'GOOD',
  DAMAGED = 'DAMAGED',
  DEFECTIVE = 'DEFECTIVE',
}

export class SalesReturnItemDto {
  @ApiProperty()
  @IsString()
  itemId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @ApiPropertyOptional({ enum: ItemCondition })
  @IsOptional()
  @IsEnum(ItemCondition)
  condition?: ItemCondition;
}

export class CreateSalesReturnDto {
  @ApiProperty()
  @IsString()
  customerId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  salesOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  returnDate?: Date;

  @ApiProperty({ enum: ReturnReason })
  @IsEnum(ReturnReason)
  reason: ReturnReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  restockItems?: boolean;

  @ApiProperty({ type: [SalesReturnItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesReturnItemDto)
  items: SalesReturnItemDto[];
}

export class UpdateSalesReturnDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  salesOrderId?: string;

  @ApiPropertyOptional({ enum: ReturnReason })
  @IsOptional()
  @IsEnum(ReturnReason)
  reason?: ReturnReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  restockItems?: boolean;

  @ApiPropertyOptional({ type: [SalesReturnItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesReturnItemDto)
  items?: SalesReturnItemDto[];
}

export interface SalesReturnQueryParams {
  status?: string;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export class ApplyCreditNoteDto {
  @ApiProperty({ type: [Object] })
  @IsArray()
  applications: { invoiceId: string; amount: number }[];
}
