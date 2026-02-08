import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  MaxLength,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBankAccountDto {
  @ApiProperty({ description: 'Bank name (e.g. Maybank, CIMB, Public Bank)', example: 'Maybank' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bankName: string;

  @ApiProperty({ description: 'Bank code (e.g. MBBEMYKL for Maybank)', example: 'MBBEMYKL' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  bankCode: string;

  @ApiProperty({ description: 'Bank account number', example: '5123-4567-8901' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  accountNumber: string;

  @ApiProperty({ description: 'Account holder name', example: 'Syarikat ABC Sdn Bhd' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  accountName: string;

  @ApiPropertyOptional({ description: 'Account type', enum: ['CURRENT', 'SAVINGS'], default: 'CURRENT' })
  @IsOptional()
  @IsString()
  @IsIn(['CURRENT', 'SAVINGS'])
  accountType?: string;

  @ApiPropertyOptional({ description: 'SWIFT code', example: 'MBBEMYKL' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  swiftCode?: string;

  @ApiPropertyOptional({ description: 'Opening balance in MYR', default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  openingBalance?: number;
}

export class UpdateBankAccountDto {
  @ApiPropertyOptional({ description: 'Bank name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @ApiPropertyOptional({ description: 'Bank code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bankCode?: string;

  @ApiPropertyOptional({ description: 'Account number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'Account holder name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  accountName?: string;

  @ApiPropertyOptional({ description: 'Account type', enum: ['CURRENT', 'SAVINGS'] })
  @IsOptional()
  @IsString()
  @IsIn(['CURRENT', 'SAVINGS'])
  accountType?: string;

  @ApiPropertyOptional({ description: 'SWIFT code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  swiftCode?: string;

  @ApiPropertyOptional({ description: 'Whether this is the default bank account' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Whether this account is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
