import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreatePriceListDto } from './create-price-list.dto';

export enum PriceListStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class UpdatePriceListDto extends PartialType(CreatePriceListDto) {
  @ApiPropertyOptional({ enum: PriceListStatus })
  @IsOptional()
  @IsEnum(PriceListStatus)
  status?: PriceListStatus;
}
