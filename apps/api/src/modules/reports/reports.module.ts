import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ExcelExportService } from './services/excel-export.service';
import { PdfExportService } from './services/pdf-export.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ExcelExportService, PdfExportService],
  exports: [ReportsService, ExcelExportService, PdfExportService],
})
export class ReportsModule {}
