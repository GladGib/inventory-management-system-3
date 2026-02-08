import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateEInvoiceSettingsDto {
  @ApiPropertyOptional({ description: 'Tax Identification Number' })
  @IsString()
  @IsOptional()
  tin?: string;

  @ApiPropertyOptional({ description: 'Business Registration Number' })
  @IsString()
  @IsOptional()
  brn?: string;

  @ApiPropertyOptional({ description: 'MyInvois API Client ID' })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({ description: 'MyInvois API Client Secret' })
  @IsString()
  @IsOptional()
  clientSecret?: string;

  @ApiPropertyOptional({ description: 'Digital certificate file path' })
  @IsString()
  @IsOptional()
  certificatePath?: string;

  @ApiPropertyOptional({ description: 'Use production environment' })
  @IsBoolean()
  @IsOptional()
  isProduction?: boolean;

  @ApiPropertyOptional({ description: 'Enable e-Invoice integration' })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Auto-submit invoices to MyInvois' })
  @IsBoolean()
  @IsOptional()
  autoSubmit?: boolean;
}
