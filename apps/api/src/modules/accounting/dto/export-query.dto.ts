import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'excel',
}

export class ExportQueryDto {
  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.EXCEL })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;

  @ApiPropertyOptional({ description: 'Start date filter (ISO string)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO string)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class TrialBalanceQueryDto {
  @ApiPropertyOptional({ description: 'As-of date for trial balance (ISO string)' })
  @IsOptional()
  @IsDateString()
  asOfDate?: string;
}
