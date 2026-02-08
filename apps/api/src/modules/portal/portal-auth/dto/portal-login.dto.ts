import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PortalLoginDto {
  @ApiProperty({
    example: 'customer@example.com',
    description: 'Portal user email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Portal user password (min 8 characters)',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: 'acme-parts',
    description: 'Organization slug to identify which org portal to log into',
  })
  @IsString()
  organizationSlug: string;
}
