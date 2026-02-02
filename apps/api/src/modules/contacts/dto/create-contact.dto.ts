import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsEmail,
  IsNumber,
  MaxLength,
  ValidateNested,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ContactType {
  CUSTOMER = 'CUSTOMER',
  VENDOR = 'VENDOR',
  BOTH = 'BOTH',
}

export class AddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  line1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postcode?: string;

  @ApiPropertyOptional({ default: 'Malaysia' })
  @IsOptional()
  @IsString()
  country?: string;
}

export class CreateContactDto {
  @ApiProperty({ enum: ContactType, example: ContactType.CUSTOMER })
  @IsEnum(ContactType)
  type: ContactType;

  @ApiProperty({ example: 'ABC Auto Parts Sdn Bhd', description: 'Company/business name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  companyName: string;

  @ApiProperty({ example: 'ABC Auto Parts', description: 'Display name for quick reference' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName: string;

  @ApiPropertyOptional({ example: 'sales@abcauto.com.my' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+60312345678' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: '+60123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobile?: string;

  @ApiPropertyOptional({ example: 'https://www.abcauto.com.my' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress?: AddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress?: AddressDto;

  @ApiPropertyOptional({ example: 'B10-1234-56789012', description: 'SST registration number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxNumber?: string;

  @ApiPropertyOptional({ example: 10000, description: 'Credit limit for customer' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  creditLimit?: number;

  @ApiPropertyOptional({ description: 'Payment term ID' })
  @IsOptional()
  @IsString()
  paymentTermId?: string;

  @ApiPropertyOptional({ description: 'Price list ID for customer-specific pricing' })
  @IsOptional()
  @IsString()
  priceListId?: string;

  @ApiPropertyOptional({ example: 7, description: 'Vendor lead time in days' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  leadTimeDays?: number;

  @ApiPropertyOptional({ example: 500, description: 'Minimum order amount for vendor' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  minimumOrderAmount?: number;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
