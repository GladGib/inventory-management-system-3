import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDeliveryStatusDto {
  @ApiProperty({ description: 'Expected delivery date' })
  @IsDateString()
  expectedDeliveryDate: string;

  @ApiPropertyOptional({ description: 'Shipment tracking number' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({ description: 'Additional delivery notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
