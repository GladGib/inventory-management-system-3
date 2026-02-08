import { IsString, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AccountMappingItemDto {
  @ApiProperty({
    description: 'Transaction type',
    example: 'SALES',
    enum: [
      'SALES',
      'PURCHASE',
      'PAYMENT_RECEIVED',
      'PAYMENT_MADE',
      'INVENTORY_ADJUSTMENT',
      'TAX_OUTPUT',
      'TAX_INPUT',
    ],
  })
  @IsString()
  @IsNotEmpty()
  transactionType: string;

  @ApiProperty({ description: 'Chart of account ID' })
  @IsString()
  @IsNotEmpty()
  accountId: string;
}

export class UpdateAccountMappingsDto {
  @ApiProperty({
    type: [AccountMappingItemDto],
    description: 'Array of transaction type to account mappings',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountMappingItemDto)
  mappings: AccountMappingItemDto[];
}
