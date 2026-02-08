import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmPurchaseOrderDto {
  @ApiProperty({ description: 'Date the vendor confirms delivery by' })
  @IsDateString()
  confirmedDate: string;

  @ApiPropertyOptional({ description: 'Vendor notes on confirmation' })
  @IsOptional()
  @IsString()
  notes?: string;
}
