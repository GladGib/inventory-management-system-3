import {
  IsArray,
  ValidateNested,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BOMComponentDto } from './create-composite.dto';

export class UpdateBOMDto {
  @ApiPropertyOptional({
    description: 'Assembly method',
    enum: ['MANUAL', 'ON_SALE'],
  })
  @IsOptional()
  @IsEnum(['MANUAL', 'ON_SALE'])
  assemblyMethod?: 'MANUAL' | 'ON_SALE';

  @ApiProperty({ description: 'Updated BOM components (replaces existing)', type: [BOMComponentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BOMComponentDto)
  components: BOMComponentDto[];
}
