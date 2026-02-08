import {
  IsString,
  IsOptional,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAutoPODto {
  @ApiPropertyOptional({ description: 'Override vendor ID (otherwise uses preferred vendor)' })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional({ description: 'Override warehouse ID' })
  @IsOptional()
  @IsString()
  warehouseId?: string;
}

export class BulkCreatePOsDto {
  @ApiProperty({ description: 'Alert IDs to create POs for' })
  @IsArray()
  @IsString({ each: true })
  alertIds: string[];
}
