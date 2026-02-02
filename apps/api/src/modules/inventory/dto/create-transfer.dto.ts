import { IsString, IsNotEmpty, IsArray, IsNumber, IsOptional, IsDate, ValidateNested, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TransferItemDto {
  @ApiProperty({ description: 'Item ID' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ example: 10, description: 'Quantity to transfer' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class CreateTransferDto {
  @ApiProperty({ description: 'Source warehouse ID' })
  @IsString()
  @IsNotEmpty()
  sourceWarehouseId: string;

  @ApiProperty({ description: 'Destination warehouse ID' })
  @IsString()
  @IsNotEmpty()
  destinationWarehouseId: string;

  @ApiProperty({ type: [TransferItemDto], description: 'Items to transfer' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items: TransferItemDto[];

  @ApiPropertyOptional({ description: 'Transfer notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ description: 'Expected transfer date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  transferDate?: Date;
}
