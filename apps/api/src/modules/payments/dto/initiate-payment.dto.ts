import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsEmail,
} from 'class-validator';

export enum PaymentGatewayType {
  FPX = 'FPX',
  DUITNOW = 'DUITNOW',
  GRABPAY = 'GRABPAY',
  TNG = 'TNG',
}

export class InitiatePaymentDto {
  @ApiProperty({
    enum: PaymentGatewayType,
    description: 'Payment gateway to use',
    example: 'FPX',
  })
  @IsEnum(PaymentGatewayType)
  @IsNotEmpty()
  gateway: PaymentGatewayType;

  @ApiProperty({ description: 'Invoice ID to pay', example: 'clxyz...' })
  @IsString()
  @IsNotEmpty()
  invoiceId: string;

  @ApiPropertyOptional({
    description: 'Bank code for FPX payments',
    example: 'MBB0227',
  })
  @IsString()
  @IsOptional()
  bankCode?: string;

  @ApiPropertyOptional({
    description: 'Buyer email address',
    example: 'buyer@example.com',
  })
  @IsEmail()
  @IsOptional()
  buyerEmail?: string;

  @ApiPropertyOptional({
    description: 'Buyer full name',
    example: 'Ahmad bin Abdullah',
  })
  @IsString()
  @IsOptional()
  buyerName?: string;
}
