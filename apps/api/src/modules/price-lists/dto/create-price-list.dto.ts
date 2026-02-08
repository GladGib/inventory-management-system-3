import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PriceListType {
  SALES = 'SALES',
  PURCHASE = 'PURCHASE',
}

export enum MarkupType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export class CreatePriceListDto {
  @ApiProperty({ example: 'VIP Customer Pricing', description: 'Price list name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Special pricing for VIP customers' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: PriceListType, example: PriceListType.SALES })
  @IsEnum(PriceListType)
  type: PriceListType;

  @ApiProperty({ enum: MarkupType, example: MarkupType.PERCENTAGE })
  @IsEnum(MarkupType)
  markupType: MarkupType;

  @ApiProperty({ example: 10, description: 'Markup value (% or fixed amount)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  markupValue: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Effective from date' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ description: 'Effective to date' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
