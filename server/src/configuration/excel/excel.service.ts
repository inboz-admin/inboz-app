import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExcelService {
  async generateExcel(
    data: any[],
    headers: string[],
    filename: string,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet 1');

    // Add headers
    worksheet.addRow(headers);

    // Add data rows
    data.forEach((item) => {
      const row = headers.map((header) => item[header]);
      worksheet.addRow(row);
    });

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async parseExcel(buffer: Buffer | Uint8Array): Promise<any[]> {
    const workbook = new ExcelJS.Workbook();

    // Use type assertion to bypass TypeScript type checking for ExcelJS compatibility
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.getWorksheet(1);
    const data: any[] = [];

    // Get headers from first row
    const headers = worksheet.getRow(1).values as string[];
    headers.shift(); // Remove the first empty cell

    // Read data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        // Skip header row
        const rowData = {};
        row.eachCell((cell, colNumber) => {
          rowData[headers[colNumber - 1]] = cell.value;
        });
        data.push(rowData);
      }
    });

    return data;
  }

  async createTemplate(headers: string[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template');

    // Add headers
    worksheet.addRow(headers);

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async parseCSV(csvContent: string): Promise<any[]> {
    const lines = csvContent.split('\n').filter((line) => line.trim());
    if (lines.length === 0) return [];

    // Parse headers
    const headers = this.parseCSVLine(lines[0]);
    const data: any[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const rowData: any = {};

      headers.forEach((header, index) => {
        rowData[header] = values[index] || '';
      });

      data.push(rowData);
    }

    return data;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  detectFileType(filename: string): 'excel' | 'csv' {
    const extension = filename.toLowerCase().split('.').pop();
    if (extension === 'csv') return 'csv';
    if (['xlsx', 'xls'].includes(extension || '')) return 'excel';
    throw new Error(`Unsupported file type: ${extension}`);
  }

  createCSVTemplate(headers: string[]): Buffer {
    const csvLine = headers.map(h => `"${h}"`).join(',');
    const csvContent = csvLine + '\n';
    return Buffer.from(csvContent, 'utf-8');
  }
}
