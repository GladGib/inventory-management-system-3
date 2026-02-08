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
  IsDateString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum TaxType {
  SST = 'SST',
  SERVICE_TAX = 'SERVICE_TAX',
  GST = 'GST',
  EXEMPT = 'EXEMPT',
  ZERO_RATED = 'ZERO_RATED',
  OUT_OF_SCOPE = 'OUT_OF_SCOPE',
}

export enum TaxRegime {
  GST = 'GST',
  TAX_HOLIDAY = 'TAX_HOLIDAY',
  SST = 'SST',
}

export class CreateTaxRateDto {
  @ApiProperty({ example: 'Sales Tax 10%', description: 'Tax rate name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'ST10', description: 'Unique tax code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[A-Z0-9]+$/, { message: 'Code must contain only uppercase letters and numbers' })
  code: string;

  @ApiProperty({ example: 10, description: 'Tax rate percentage' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  rate: number;

  @ApiProperty({ enum: TaxType, example: TaxType.SST, description: 'Tax type' })
  @IsEnum(TaxType)
  type: TaxType;

  @ApiPropertyOptional({ enum: TaxRegime, description: 'Tax regime (GST, TAX_HOLIDAY, SST)' })
  @IsOptional()
  @IsEnum(TaxRegime)
  taxRegime?: TaxRegime;

  @ApiPropertyOptional({ description: 'Description of the tax rate' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ default: false, description: 'Set as default tax rate' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: true, description: 'Is tax rate active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Effective from date' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ description: 'Effective to date' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class UpdateTaxRateDto {
  @ApiPropertyOptional({ example: 'Sales Tax 10%' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'ST10' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Z0-9]+$/, { message: 'Code must contain only uppercase letters and numbers' })
  code?: string;

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

  @ApiPropertyOptional({ enum: TaxRegime })
  @IsOptional()
  @IsEnum(TaxRegime)
  taxRegime?: TaxRegime;

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
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

// Malaysian SST Standard Rates
export const MALAYSIAN_TAX_RATES = {
  SST_SALES: { name: 'Sales Tax 10%', code: 'ST10', rate: 10, type: TaxType.SST },
  SST_SERVICE: { name: 'Service Tax 6%', code: 'ST6', rate: 6, type: TaxType.SERVICE_TAX },
  EXEMPT: { name: 'Tax Exempt', code: 'EX', rate: 0, type: TaxType.EXEMPT },
  ZERO_RATED: { name: 'Zero Rated', code: 'ZR', rate: 0, type: TaxType.ZERO_RATED },
  OUT_OF_SCOPE: { name: 'Out of Scope', code: 'OS', rate: 0, type: TaxType.OUT_OF_SCOPE },
};

// Tax Type Labels for UI
export const TAX_TYPE_LABELS = {
  SST: 'Sales Tax',
  SERVICE_TAX: 'Service Tax',
  GST: 'GST',
  ZERO_RATED: 'Zero Rated',
  EXEMPT: 'Exempt',
  OUT_OF_SCOPE: 'Out of Scope',
};

// Tax Regime Labels for UI
export const TAX_REGIME_LABELS = {
  GST: 'GST Era (Apr 2015 - Aug 2018)',
  TAX_HOLIDAY: 'Tax Holiday (Sep - Dec 2018)',
  SST: 'SST Era (Jan 2019 - present)',
};
