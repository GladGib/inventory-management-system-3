import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray } from 'class-validator';

export class SubmitSingleEInvoiceDto {
  @ApiProperty({ description: 'Invoice ID to submit to MyInvois' })
  @IsString()
  @IsNotEmpty()
  invoiceId: string;
}

export class SubmitBatchEInvoiceDto {
  @ApiProperty({ description: 'Invoice IDs to submit in batch', type: [String] })
  @IsArray()
  @IsString({ each: true })
  invoiceIds: string[];
}
