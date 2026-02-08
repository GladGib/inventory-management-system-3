import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddPriceListItemDto {
  @ApiProperty({ description: 'Item ID' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ example: 25.50, description: 'Custom price for this item' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Type(() => Number)
  customPrice: number;

  @ApiProperty({ example: 1, description: 'Minimum quantity for this price' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(1)
  @Type(() => Number)
  minQuantity: number;
}

export class AddPriceListItemsDto {
  @ApiProperty({ type: [AddPriceListItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddPriceListItemDto)
  items: AddPriceListItemDto[];
}

export class UpdatePriceListItemDto {
  @ApiProperty({ example: 30.00, description: 'Updated custom price' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Type(() => Number)
  customPrice: number;

  @ApiProperty({ example: 1, description: 'Updated minimum quantity' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(1)
  @Type(() => Number)
  minQuantity: number;
}

export class BulkPriceUpdateDto {
  @ApiProperty({ enum: ['PERCENTAGE', 'FIXED'], description: 'Type of adjustment' })
  @IsString()
  @IsNotEmpty()
  adjustmentType: 'PERCENTAGE' | 'FIXED';

  @ApiProperty({ example: 5, description: 'Adjustment value (can be negative for decrease)' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Type(() => Number)
  adjustmentValue: number;
}
