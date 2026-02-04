import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export interface ReportColumn {
  title: string;
  dataIndex: string;
  type?: 'string' | 'number' | 'currency' | 'date' | 'percentage';
  width?: number;
}

export interface ReportData {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, any>[];
  summary?: Record<string, any>;
  filters?: Record<string, any>;
  generatedAt?: Date;
}

@Injectable()
export class ExcelExportService {
  async generateWorkbook(report: ReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IMS - Inventory Management System';
    workbook.created = new Date();

    // Add data sheet
    const sheet = workbook.addWorksheet(report.title);

    // Add report title
    sheet.mergeCells('A1:' + this.getColumnLetter(report.columns.length) + '1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = report.title;
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };

    // Add generation timestamp
    sheet.mergeCells('A2:' + this.getColumnLetter(report.columns.length) + '2');
    const dateCell = sheet.getCell('A2');
    dateCell.value = `Generated: ${(report.generatedAt || new Date()).toLocaleString('en-MY')}`;
    dateCell.font = { italic: true, size: 10, color: { argb: 'FF666666' } };
    dateCell.alignment = { horizontal: 'center' };

    // Add filters if present
    let startRow = 4;
    if (report.filters && Object.keys(report.filters).length > 0) {
      sheet.getCell('A3').value = 'Filters:';
      sheet.getCell('A3').font = { bold: true };
      const filterText = Object.entries(report.filters)
        .map(([key, value]) => `${key}: ${value}`)
        .join(' | ');
      sheet.getCell('B3').value = filterText;
      startRow = 5;
    }

    // Add header row with styling
    const headerRow = sheet.getRow(startRow);
    report.columns.forEach((col, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = col.title;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1890FF' },
      };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
      };
      cell.alignment = { horizontal: col.type === 'number' || col.type === 'currency' || col.type === 'percentage' ? 'right' : 'left' };
    });

    // Add data rows
    report.rows.forEach((row, rowIndex) => {
      const dataRow = sheet.getRow(startRow + 1 + rowIndex);
      report.columns.forEach((col, colIndex) => {
        const cell = dataRow.getCell(colIndex + 1);
        cell.value = row[col.dataIndex];

        // Apply formatting based on column type
        switch (col.type) {
          case 'currency':
            cell.numFmt = '"RM "#,##0.00';
            cell.alignment = { horizontal: 'right' };
            break;
          case 'number':
            cell.numFmt = '#,##0';
            cell.alignment = { horizontal: 'right' };
            break;
          case 'percentage':
            cell.numFmt = '0.00%';
            cell.alignment = { horizontal: 'right' };
            break;
          case 'date':
            if (cell.value) {
              cell.value = new Date(cell.value as string | number | Date);
              cell.numFmt = 'dd/mm/yyyy';
            }
            break;
        }

        // Alternate row colors
        if (rowIndex % 2 === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF5F5F5' },
          };
        }
      });
    });

    // Add summary row if present
    if (report.summary) {
      const summaryRow = sheet.getRow(startRow + report.rows.length + 2);
      summaryRow.getCell(1).value = 'Total';
      summaryRow.getCell(1).font = { bold: true };

      report.columns.forEach((col, colIndex) => {
        if (report.summary![col.dataIndex] !== undefined) {
          const cell = summaryRow.getCell(colIndex + 1);
          cell.value = report.summary![col.dataIndex];
          cell.font = { bold: true };

          switch (col.type) {
            case 'currency':
              cell.numFmt = '"RM "#,##0.00';
              cell.alignment = { horizontal: 'right' };
              break;
            case 'number':
              cell.numFmt = '#,##0';
              cell.alignment = { horizontal: 'right' };
              break;
            case 'percentage':
              cell.numFmt = '0.00%';
              cell.alignment = { horizontal: 'right' };
              break;
          }
        }
      });

      summaryRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F7FF' },
      };
    }

    // Auto-fit column widths
    sheet.columns.forEach((column, index) => {
      const col = report.columns[index];
      let maxLength = col?.title.length || 10;

      report.rows.forEach(row => {
        const value = row[col?.dataIndex];
        const cellLength = value ? String(value).length : 0;
        maxLength = Math.max(maxLength, cellLength);
      });

      column.width = Math.min(Math.max(maxLength + 2, col?.width || 12), 50);
    });

    // Return as buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private getColumnLetter(colNumber: number): string {
    let letter = '';
    while (colNumber > 0) {
      const remainder = (colNumber - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      colNumber = Math.floor((colNumber - 1) / 26);
    }
    return letter;
  }
}
