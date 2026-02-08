import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ValidateTinDto {
  @ApiProperty({ description: 'Tax Identification Number to validate' })
  @IsString()
  @IsNotEmpty()
  tin: string;

  @ApiPropertyOptional({ description: 'ID type: BRN, NRIC, PASSPORT, ARMY' })
  @IsString()
  @IsOptional()
  idType?: string;

  @ApiPropertyOptional({ description: 'ID value corresponding to the ID type' })
  @IsString()
  @IsOptional()
  idValue?: string;
}
