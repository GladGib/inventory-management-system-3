import {
  IsArray,
  ValidateNested,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UpdateReorderSettingsDto } from './update-reorder-settings.dto';

export class BulkReorderSettingItemDto extends UpdateReorderSettingsDto {
  @ApiProperty({ description: 'Item ID' })
  @IsString()
  @IsNotEmpty()
  itemId: string;
}

export class BulkReorderSettingsDto {
  @ApiProperty({ description: 'Array of items with their reorder settings', type: [BulkReorderSettingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkReorderSettingItemDto)
  items: BulkReorderSettingItemDto[];
}
