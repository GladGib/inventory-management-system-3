import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMakeDto {
  @ApiProperty({ example: 'Toyota', description: 'Vehicle make name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Japan', description: 'Country of origin' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}

export class UpdateMakeDto {
  @ApiPropertyOptional({ example: 'Toyota', description: 'Vehicle make name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Japan', description: 'Country of origin' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}
