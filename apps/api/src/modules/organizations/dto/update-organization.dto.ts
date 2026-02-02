import { IsString, IsOptional, IsEnum, IsEmail, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum Industry {
  AUTO_PARTS = 'AUTO_PARTS',
  HARDWARE = 'HARDWARE',
  SPARE_PARTS = 'SPARE_PARTS',
  GENERAL = 'GENERAL',
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional({
    example: 'ABC Auto Parts Sdn Bhd',
    description: 'Organization name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    enum: Industry,
    example: Industry.AUTO_PARTS,
    description: 'Industry type',
  })
  @IsOptional()
  @IsEnum(Industry)
  industry?: Industry;

  @ApiPropertyOptional({
    example: 'MYR',
    description: 'Base currency code',
  })
  @IsOptional()
  @IsString()
  baseCurrency?: string;

  @ApiPropertyOptional({
    example: 'Asia/Kuala_Lumpur',
    description: 'Timezone',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    example: 'B10-1234-56789012',
    description: 'SST registration number',
  })
  @IsOptional()
  @IsString()
  sstNumber?: string;

  @ApiPropertyOptional({
    example: '123456-A',
    description: 'SSM business registration number',
  })
  @IsOptional()
  @IsString()
  businessRegNo?: string;

  @ApiPropertyOptional({
    example: 'C1234567890',
    description: 'Tax Identification Number (TIN) for MyInvois',
  })
  @IsOptional()
  @IsString()
  tin?: string;

  @ApiPropertyOptional({
    example: 'info@example.com',
    description: 'Organization email',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '+60312345678',
    description: 'Organization phone',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: 'https://example.com',
    description: 'Organization website',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    description: 'Organization address',
  })
  @IsOptional()
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}
