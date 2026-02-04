import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreatePaymentTermDto {
  @ApiProperty({ description: 'Payment term name (e.g., "Net 30", "COD")' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: 'Number of days until payment is due', minimum: 0 })
  @IsInt()
  @Min(0)
  @Max(365)
  days: number;

  @ApiPropertyOptional({ description: 'Description of the payment term' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ description: 'Is this the default payment term?', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Is this payment term active?', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
