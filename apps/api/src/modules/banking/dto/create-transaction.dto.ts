import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  IsIn,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTransactionDto {
  @ApiProperty({
    description: 'Transaction type',
    enum: ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'FEE', 'INTEREST'],
    example: 'DEPOSIT',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'FEE', 'INTEREST'])
  type: string;

  @ApiProperty({ description: 'Transaction amount in MYR', example: 1500.00 })
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiProperty({ description: 'Transaction date', example: '2026-02-08' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: 'Transaction description', example: 'Customer payment - INV-001' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Reference number', example: 'REF-20260208-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;
}
