import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImportStatementDto {
  @ApiProperty({
    description: 'Import file format',
    enum: ['CSV', 'OFX'],
    example: 'CSV',
  })
  @IsString()
  @IsIn(['CSV', 'OFX'])
  format: string;
}
