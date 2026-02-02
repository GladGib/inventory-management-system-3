import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  IsDate,
  IsEnum,
  ValidateNested,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
  FPX = 'FPX',
  DUITNOW = 'DUITNOW',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  TNG_EWALLET = 'TNG_EWALLET',
  GRABPAY = 'GRABPAY',
  OTHER = 'OTHER',
}

export class PaymentAllocationDto {
  @ApiProperty({ description: 'Invoice ID' })
  @IsString()
  @IsNotEmpty()
  invoiceId: string;

  @ApiProperty({ example: 500, description: 'Amount to apply' })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;
}

export class CreatePaymentDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional({ description: 'Payment date (defaults to now)' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  paymentDate?: Date;

  @ApiProperty({ example: 1000, description: 'Total payment amount' })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.BANK_TRANSFER })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ description: 'Reference number (cheque no, transaction ref)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @ApiPropertyOptional({ description: 'Bank account ID' })
  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @ApiPropertyOptional({ type: [PaymentAllocationDto], description: 'Allocate to invoices' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  allocations?: PaymentAllocationDto[];

  @ApiPropertyOptional({ description: 'Payment notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
