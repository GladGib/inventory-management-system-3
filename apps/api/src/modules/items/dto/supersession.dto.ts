import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupersessionDto {
  @ApiProperty({ example: 'clxxxxxxxxxxxx', description: 'ID of the new item that supersedes this one' })
  @IsString()
  @IsNotEmpty()
  newItemId: string;

  @ApiPropertyOptional({ example: 'Updated design with improved durability', description: 'Reason for supersession' })
  @IsOptional()
  @IsString()
  reason?: string;
}
