import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum Industry {
  AUTO_PARTS = 'AUTO_PARTS',
  HARDWARE = 'HARDWARE',
  SPARE_PARTS = 'SPARE_PARTS',
  GENERAL = 'GENERAL',
}

export class RegisterDto {
  @ApiProperty({
    example: 'admin@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password (min 8 characters)',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
  })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({
    example: '+60123456789',
    description: 'User phone number',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 'ABC Auto Parts Sdn Bhd',
    description: 'Organization/Company name',
  })
  @IsString()
  @MinLength(2)
  organizationName: string;

  @ApiPropertyOptional({
    enum: Industry,
    example: Industry.AUTO_PARTS,
    description: 'Industry type',
  })
  @IsOptional()
  @IsEnum(Industry)
  industry?: Industry;
}
