import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  IsDate,
  IsEnum,
  ValidateNested,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum JournalEntryStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
}

export class JournalEntryLineDto {
  @ApiProperty({ description: 'Chart of account ID' })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({ example: 1000.0, description: 'Debit amount' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  debit: number;

  @ApiProperty({ example: 0, description: 'Credit amount' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  credit: number;

  @ApiPropertyOptional({ description: 'Line description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateJournalEntryDto {
  @ApiProperty({ description: 'Entry date' })
  @IsDate()
  @Type(() => Date)
  date: Date;

  @ApiProperty({ description: 'Entry description' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ description: 'Source type (INVOICE, PAYMENT, BILL, etc.)' })
  @IsOptional()
  @IsString()
  sourceType?: string;

  @ApiPropertyOptional({ description: 'Source document ID' })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiPropertyOptional({ enum: JournalEntryStatus, default: JournalEntryStatus.DRAFT })
  @IsOptional()
  @IsEnum(JournalEntryStatus)
  status?: JournalEntryStatus;

  @ApiProperty({ type: [JournalEntryLineDto], description: 'Journal entry lines' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalEntryLineDto)
  lines: JournalEntryLineDto[];
}

export class GenerateJournalEntryDto {
  @ApiProperty({ description: 'Source type', example: 'INVOICE' })
  @IsString()
  @IsNotEmpty()
  sourceType: string;

  @ApiProperty({ description: 'Source document ID' })
  @IsString()
  @IsNotEmpty()
  sourceId: string;
}
