import { IsEmail, IsString, MinLength, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PortalRegisterDto {
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
    description: 'Contact ID to link the portal user to',
  })
  @IsString()
  contactId: string;

  @ApiProperty({
    description: 'Organization ID the portal user belongs to',
  })
  @IsString()
  organizationId: string;
}
