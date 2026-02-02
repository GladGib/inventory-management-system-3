import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum } from 'class-validator';

export enum EInvoiceStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  VALIDATED = 'VALIDATED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export class SubmitEInvoiceDto {
  @ApiProperty({ description: 'Invoice ID to submit' })
  @IsString()
  @IsNotEmpty()
  invoiceId: string;
}

export class SubmitBulkEInvoiceDto {
  @ApiProperty({ description: 'Invoice IDs to submit', type: [String] })
  @IsArray()
  @IsString({ each: true })
  invoiceIds: string[];
}

export class CancelEInvoiceDto {
  @ApiProperty({ description: 'Invoice ID to cancel' })
  @IsString()
  @IsNotEmpty()
  invoiceId: string;

  @ApiProperty({ description: 'Cancellation reason' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class EInvoiceSubmissionResult {
  @ApiProperty()
  invoiceId: string;

  @ApiProperty()
  submissionId: string;

  @ApiProperty({ enum: EInvoiceStatus })
  status: EInvoiceStatus;

  @ApiPropertyOptional()
  qrCode?: string;

  @ApiPropertyOptional()
  validationErrors?: string[];

  @ApiPropertyOptional()
  submittedAt?: Date;
}

// MyInvois Document Types
export enum MyInvoisDocumentType {
  INVOICE = '01',
  CREDIT_NOTE = '02',
  DEBIT_NOTE = '03',
  REFUND_NOTE = '04',
  SELF_BILLED_INVOICE = '11',
  SELF_BILLED_CREDIT_NOTE = '12',
  SELF_BILLED_DEBIT_NOTE = '13',
  SELF_BILLED_REFUND_NOTE = '14',
}

// MyInvois Classification Codes
export enum MyInvoisClassificationCode {
  GOODS = '001',
  SERVICES = '002',
  OTHERS = '003',
}
