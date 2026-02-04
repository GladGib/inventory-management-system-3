import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum RoundingMethod {
  NORMAL = 'NORMAL',
  ROUND_DOWN = 'ROUND_DOWN',
  ROUND_UP = 'ROUND_UP',
}

export class UpdateOrganizationTaxSettingsDto {
  @ApiPropertyOptional({ description: 'Is SST registered' })
  @IsOptional()
  @IsBoolean()
  isSstRegistered?: boolean;

  @ApiPropertyOptional({ example: 'W10-1234-56789012', description: 'SST registration number' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]\d{2}-\d{4}-\d{8}$/, {
    message: 'SST Registration Number must be in format: W10-1234-56789012',
  })
  sstRegistrationNo?: string;

  @ApiPropertyOptional({ description: 'SST registration date' })
  @IsOptional()
  @IsDateString()
  sstRegisteredDate?: string;

  @ApiPropertyOptional({ example: 500000, description: 'SST threshold amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sstThreshold?: number;

  @ApiPropertyOptional({ description: 'Default sales tax rate ID' })
  @IsOptional()
  @IsString()
  defaultSalesTaxId?: string;

  @ApiPropertyOptional({ description: 'Default purchase tax rate ID' })
  @IsOptional()
  @IsString()
  defaultPurchaseTaxId?: string;

  @ApiPropertyOptional({ default: false, description: 'Tax inclusive pricing' })
  @IsOptional()
  @IsBoolean()
  taxInclusive?: boolean;

  @ApiPropertyOptional({ enum: RoundingMethod, default: RoundingMethod.NORMAL })
  @IsOptional()
  @IsEnum(RoundingMethod)
  roundingMethod?: RoundingMethod;
}

export class OrganizationTaxSettingsResponseDto {
  id: string;
  organizationId: string;
  isSstRegistered: boolean;
  sstRegistrationNo: string | null;
  sstRegisteredDate: Date | null;
  sstThreshold: number | null;
  defaultSalesTaxId: string | null;
  defaultPurchaseTaxId: string | null;
  taxInclusive: boolean;
  roundingMethod: RoundingMethod;
  defaultSalesTax?: {
    id: string;
    name: string;
    code: string;
    rate: number;
  } | null;
  defaultPurchaseTax?: {
    id: string;
    name: string;
    code: string;
    rate: number;
  } | null;
}
