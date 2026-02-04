import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ description: 'Address label (e.g., "Main Office", "Warehouse KL")' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label: string;

  @ApiProperty({ description: 'Address line 1' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  addressLine1: string;

  @ApiPropertyOptional({ description: 'Address line 2' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city: string;

  @ApiProperty({ description: 'State (Malaysian state)' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  state: string;

  @ApiProperty({ description: '5-digit Malaysian postcode' })
  @IsString()
  @Matches(/^\d{5}$/, { message: 'Postcode must be a 5-digit number' })
  postcode: string;

  @ApiPropertyOptional({ description: 'Country', default: 'Malaysia' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'Is this the default address?', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Is this a billing address?', default: true })
  @IsOptional()
  @IsBoolean()
  isBilling?: boolean;

  @ApiPropertyOptional({ description: 'Is this a shipping address?', default: true })
  @IsOptional()
  @IsBoolean()
  isShipping?: boolean;

  @ApiPropertyOptional({ description: 'Phone number for this address' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Contact person at this address' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  attention?: string;
}
