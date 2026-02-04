import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateItemGroupDto } from './create-item-group.dto';

enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class UpdateItemGroupDto extends PartialType(CreateItemGroupDto) {
  @ApiPropertyOptional({ description: 'Status of the item group', enum: Status })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
