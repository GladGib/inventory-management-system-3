import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEmailSettingsDto {
  @ApiPropertyOptional({ example: 'smtp.gmail.com' })
  @IsOptional()
  @IsString()
  smtpHost?: string;

  @ApiPropertyOptional({ example: 587 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  smtpPort?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  smtpSecure?: boolean;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsString()
  smtpUser?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smtpPass?: string;

  @ApiPropertyOptional({ example: 'My Company' })
  @IsOptional()
  @IsString()
  fromName?: string;

  @ApiPropertyOptional({ example: 'invoices@mycompany.com' })
  @IsOptional()
  @IsEmail()
  fromEmail?: string;

  @ApiPropertyOptional({ example: 'support@mycompany.com' })
  @IsOptional()
  @IsEmail()
  replyTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  autoSendInvoice?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  autoSendPayment?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  autoSendOrder?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  autoSendPO?: boolean;
}

export class SendTestEmailDto {
  @ApiProperty({ example: 'test@example.com' })
  @IsEmail()
  email: string;
}

export class SendEmailDto {
  @ApiProperty({ example: 'recipient@example.com' })
  @IsEmail()
  to: string;

  @ApiPropertyOptional({ example: 'cc@example.com' })
  @IsOptional()
  @IsEmail()
  cc?: string;

  @ApiProperty({ example: 'Subject line' })
  @IsString()
  subject: string;

  @ApiProperty({ example: '<p>Email body</p>' })
  @IsString()
  html: string;
}
