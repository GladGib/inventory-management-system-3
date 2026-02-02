import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum TaxType {
  SST = 'SST',
  SERVICE_TAX = 'SERVICE_TAX',
  EXEMPT = 'EXEMPT',
  ZERO_RATED = 'ZERO_RATED',
}

export class CreateTaxRateDto {
  @ApiProperty({ example: 'SST 10%', description: 'Tax rate name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 10, description: 'Tax rate percentage' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  rate: number;

  @ApiProperty({ enum: TaxType, example: TaxType.SST, description: 'Tax type' })
  @IsEnum(TaxType)
  type: TaxType;

  @ApiPropertyOptional({ description: 'Description of the tax rate' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ default: false, description: 'Set as default tax rate' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateTaxRateDto {
  @ApiPropertyOptional({ example: 'SST 10%' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  rate?: number;

  @ApiPropertyOptional({ enum: TaxType })
  @IsOptional()
  @IsEnum(TaxType)
  type?: TaxType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  status?: boolean;
}

// Malaysian SST Standard Rates
export const MALAYSIAN_TAX_RATES = {
  SST_SALES: { name: 'SST (Sales Tax)', rate: 10, type: TaxType.SST },
  SST_SERVICE: { name: 'Service Tax', rate: 6, type: TaxType.SERVICE_TAX },
  EXEMPT: { name: 'Tax Exempt', rate: 0, type: TaxType.EXEMPT },
  ZERO_RATED: { name: 'Zero Rated', rate: 0, type: TaxType.ZERO_RATED },
};
