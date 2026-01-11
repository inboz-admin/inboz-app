import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

@Injectable()
export class PdfService {
  async generatePdf(content: any): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Add content to PDF
      doc.fontSize(16).text('Generated Document', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(JSON.stringify(content, null, 2));

      doc.end();
    });
  }

  async createTemplate(title: string, fields: string[]): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      doc.fontSize(16).text(title, { align: 'center' });
      doc.moveDown();

      fields.forEach((field) => {
        doc.fontSize(12).text(`${field}: _______________`);
        doc.moveDown();
      });

      doc.end();
    });
  }
}
