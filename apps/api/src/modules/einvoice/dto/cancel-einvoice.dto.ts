import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CancelEInvoiceDto {
  @ApiProperty({ description: 'Reason for cancellation' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Cancellation reason must be at least 10 characters' })
  @MaxLength(500, { message: 'Cancellation reason must not exceed 500 characters' })
  reason: string;
}
