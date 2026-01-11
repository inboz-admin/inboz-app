import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Invoice } from '../entities/invoice.entity';
import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';

type PDFDoc = InstanceType<typeof PDFDocument>;

export interface InvoiceWithRelations {
  id: string;
  organizationId: string;
  subscriptionId?: string;
  invoiceNumber: string;
  status: any;
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: any;
  issueDate: Date;
  dueDate: Date;
  paidAt?: Date;
  billingAddress?: any;
  stripeInvoiceId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  pdfUrl?: string;
  pdfGeneratedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  organization?: Organization;
  subscription?: Subscription & { plan?: SubscriptionPlan };
}

@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  /**
   * Generate PDF buffer for an invoice
   */
  async generatePdf(fullInvoice: InvoiceWithRelations): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (error) => reject(error));

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const margin = 50;
        const currencySymbol = '$';

        // Get invoice details from billingAddress JSON if available
        const invoiceDetails = fullInvoice.billingAddress || {};
        const subscription = fullInvoice.subscription;
        const organization = fullInvoice.organization;

        // Debug: Log proration details sources
        this.logger.debug(
          `Invoice ${fullInvoice.id} - Subscription prorationDetails:`,
          subscription?.prorationDetails,
        );
        this.logger.debug(
          `Invoice ${fullInvoice.id} - InvoiceDetails proration:`,
          invoiceDetails.proration,
        );

        // Get Razorpay details from invoice or invoiceDetails
        const razorpayOrderId =
          fullInvoice.razorpayOrderId ||
          invoiceDetails.razorpayOrderId ||
          'N/A';
        const razorpayPaymentId =
          fullInvoice.razorpayPaymentId ||
          invoiceDetails.razorpayPaymentId ||
          'N/A';

        // Calculate volume discount once for reuse
        const volumeDiscount = parseFloat(
          String(invoiceDetails.volumeDiscount?.amount || 0),
        );

        // Render header
        this.renderHeader(doc, margin);

        // Render invoice details
        this.renderInvoiceDetails(
          doc,
          fullInvoice,
          pageWidth,
          margin,
          invoiceDetails,
        );

        // Render billed to section
        const billedToEndY = this.renderBilledTo(doc, organization, margin);

        // Render company details
        const companyEndY = this.renderCompanyDetails(doc, margin, billedToEndY);

        // Calculate table start position (without drawing a line)
        const tableTop = companyEndY + 25;

        // Render itemized table
        const tableEndY = this.renderItemizedTable(
          doc,
          fullInvoice,
          invoiceDetails,
          subscription,
          volumeDiscount,
          margin,
          pageWidth,
          tableTop,
          currencySymbol,
        );

        // Render payment method
        this.renderPaymentMethod(
          doc,
          margin,
          tableEndY,
          razorpayOrderId,
          razorpayPaymentId,
        );

        doc.end();
      } catch (error) {
        this.logger.error(
          `Error generating PDF for invoice ${fullInvoice.id}:`,
          error,
        );
        reject(error);
      }
    });
  }

  private renderHeader(doc: PDFDoc, margin: number): void {
    doc.fontSize(32).font('Times-Bold').text('INVOICE', margin, 50);
  }

  private renderInvoiceDetails(
    doc: PDFDoc,
    fullInvoice: InvoiceWithRelations,
    pageWidth: number,
    margin: number,
    invoiceDetails: any,
  ): void {
    const invoiceDetailsY = 50;
    const invoiceDetailsRight = pageWidth - margin;
    const invoiceLabelWidth = 100;
    const invoiceValueWidth = 100;
    const invoiceLabelX = invoiceDetailsRight - invoiceLabelWidth - invoiceValueWidth;
    const invoiceValueX = invoiceDetailsRight - invoiceValueWidth;

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('INVOICE NO:', invoiceLabelX, invoiceDetailsY, {
        width: invoiceLabelWidth,
      })
      .text('INVOICE DATE:', invoiceLabelX, invoiceDetailsY + 15, {
        width: invoiceLabelWidth,
      });

    const invoiceDate = new Date(fullInvoice.issueDate);
    const invoiceNumber = fullInvoice.invoiceNumber || 'N/A';
    // Truncate invoice number if too long (max 40 characters)
    const displayInvoiceNumber =
      invoiceNumber.length > 40
        ? invoiceNumber.substring(0, 40)
        : invoiceNumber;

    doc
      .font('Helvetica')
      .fontSize(10)
      .text(
        displayInvoiceNumber,
        invoiceValueX,
        invoiceDetailsY,
        { width: invoiceValueWidth, align: 'right' },
      )
      .text(
        invoiceDate
          .toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
          .replace(/\//g, '.'),
        invoiceValueX,
        invoiceDetailsY + 15,
        { width: invoiceValueWidth, align: 'right' },
      );
  }

  private renderBilledTo(
    doc: PDFDoc,
    organization: Organization | undefined,
    margin: number,
  ): number {
    const billedToY = 130;
    doc.fontSize(11).font('Helvetica-Bold').text('BILLED TO:', margin, billedToY);

    doc.font('Helvetica').fontSize(10);
    let currentY = billedToY + 20;

    if (organization) {
      doc.text(organization.name || 'N/A', margin, currentY);
      currentY += 15;

      if (organization.address) {
        doc.text(organization.address, margin, currentY);
        currentY += 15;
      }

      const cityStateZip = [
        organization.city,
        organization.state,
        organization.postalCode ? `Zip Code: ${organization.postalCode}` : null,
      ]
        .filter(Boolean)
        .join(', ');

      if (cityStateZip) {
        doc.text(cityStateZip, margin, currentY);
        currentY += 15;
      }

      if (organization.phone) {
        doc.text(`Phone: ${organization.phone}`, margin, currentY);
        currentY += 15;
      }

      if (organization.billingEmail || organization.email) {
        doc.text(
          `Email: ${organization.billingEmail || organization.email}`,
          margin,
          currentY,
        );
        currentY += 15;
      }
    }

    return currentY;
  }

  private renderCompanyDetails(
    doc: PDFDoc,
    margin: number,
    startY: number,
  ): number {
    const companyY = startY + 20;
    doc.fontSize(11).font('Helvetica-Bold').text('INBOZ', margin, companyY);

    doc.font('Helvetica').fontSize(10);
    let companyDetailsY = companyY + 20;
    doc.text('Bengaluru', margin, companyDetailsY);
    companyDetailsY += 15;
    doc.text('Email: admin@inboz.io', margin, companyDetailsY);

    return companyDetailsY;
  }

  private renderHorizontalLine(
    doc: PDFDoc,
    margin: number,
    pageWidth: number,
    lineY: number,
  ): void {
    doc.moveTo(margin, lineY).lineTo(pageWidth - margin, lineY).stroke();
  }

  private renderItemizedTable(
    doc: PDFDoc,
    fullInvoice: InvoiceWithRelations,
    invoiceDetails: any,
    subscription: (Subscription & { plan?: SubscriptionPlan }) | undefined,
    volumeDiscount: number,
    margin: number,
    pageWidth: number,
    tableTop: number,
    currencySymbol: string,
  ): number {
    const tableLeft = margin;
    const tableRight = pageWidth - margin;
    const availableWidth = tableRight - tableLeft;

    // Column widths
    const spacing = 8;
    const colWidths = {
      no: 30,
      item: 180,
      unitPrice: 75,
      quantity: 55,
      total: 90,
    };

    // Calculate column positions
    let currentX = tableLeft;
    const colPositions: {
      no: number;
      item: number;
      unitPrice: number;
      quantity: number;
      total: number;
    } = {
      no: currentX,
      item: 0,
      unitPrice: 0,
      quantity: 0,
      total: 0,
    };
    currentX += colWidths.no + spacing;
    colPositions.item = currentX;
    currentX += colWidths.item + spacing;
    colPositions.unitPrice = currentX;
    currentX += colWidths.unitPrice + spacing;
    colPositions.quantity = currentX;
    colPositions.total = tableRight - colWidths.total;

    // Table Header
    const headerFontSize = 10;
    // In PDFKit, text is positioned at baseline, so we need to account for:
    // - Font size (10px)
    // - Descenders (letters like p, y, g extend below baseline)
    // - Proper spacing to avoid overlap
    const headerTextHeight = headerFontSize * 1.5; // Account for descenders
    const headerBottomPadding = 12; // Space between bottom of text and underline (increased to prevent overlap)
    
    doc
      .fontSize(headerFontSize)
      .font('Helvetica-Bold')
      .text('NO.', colPositions.no, tableTop, { width: colWidths.no })
      .text('ITEM', colPositions.item, tableTop, { width: colWidths.item })
      .text('UNIT PRICE', colPositions.unitPrice, tableTop, {
        width: colWidths.unitPrice,
        align: 'right',
      })
      .text('QUANTITY', colPositions.quantity, tableTop, {
        width: colWidths.quantity,
        align: 'right',
      })
      .text('TOTAL', colPositions.total, tableTop, {
        width: colWidths.total,
        align: 'right',
      });

    // Build items
    const items = this.buildInvoiceItems(
      fullInvoice,
      invoiceDetails,
      subscription,
      volumeDiscount,
    );

    // Render items - start after header with proper spacing
    const itemRowSpacing = 10; // Space between header and first item
    const headerBottomY = tableTop + headerTextHeight + headerBottomPadding;
    let itemY = headerBottomY + itemRowSpacing;
    items.forEach((item) => {
      const unitPrice = parseFloat(String(item.unitPrice || 0));
      const itemTotal = parseFloat(String(item.total || 0));

      const totalDisplay =
        itemTotal < 0
          ? `-${currencySymbol}${Math.abs(itemTotal).toFixed(2)}`
          : `${currencySymbol}${itemTotal.toFixed(2)}`;

      doc
        .font('Helvetica')
        .fontSize(10)
        .text(item.no.toString(), colPositions.no, itemY, {
          width: colWidths.no,
        })
        .text(item.item, colPositions.item, itemY, { width: colWidths.item })
        .text(
          `${currencySymbol}${unitPrice.toFixed(2)}`,
          colPositions.unitPrice,
          itemY,
          { width: colWidths.unitPrice, align: 'right' },
        )
        .text(item.quantity.toString(), colPositions.quantity, itemY, {
          width: colWidths.quantity,
          align: 'right',
        })
        .text(totalDisplay, colPositions.total, itemY, {
          width: colWidths.total,
          align: 'right',
        });

      itemY += 20;
    });

    // Calculate total and paid amount
    const calculatedTotal = items.reduce((sum, item) => sum + item.total, 0);
    const paidAmount = parseFloat(
      String(
        fullInvoice.amountPaid ||
          calculatedTotal ||
          fullInvoice.total ||
          0,
      ),
    );

    // Add TOTAL and PAID rows
    itemY += 15;
    const totalLabelWidth =
      colPositions.quantity + colWidths.quantity - colPositions.item;
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('TOTAL', colPositions.item, itemY, {
        width: totalLabelWidth,
        align: 'right',
      })
      .text(`${currencySymbol}${calculatedTotal.toFixed(2)}`, colPositions.total, itemY, {
        width: colWidths.total,
        align: 'right',
      });

    itemY += 20;
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('PAID', colPositions.item, itemY, {
        width: totalLabelWidth,
        align: 'right',
      })
      .text(`${currencySymbol}${paidAmount.toFixed(2)}`, colPositions.total, itemY, {
        width: colWidths.total,
        align: 'right',
      });

    return itemY;
  }

  private buildInvoiceItems(
    fullInvoice: InvoiceWithRelations,
    invoiceDetails: any,
    subscription: (Subscription & { plan?: SubscriptionPlan }) | undefined,
    volumeDiscount: number,
  ): Array<{
    no: number;
    item: string;
    unitPrice: number;
    quantity: number;
    total: number;
  }> {
    const items: Array<{
      no: number;
      item: string;
      unitPrice: number;
      quantity: number;
      total: number;
    }> = [];

    let itemNumber = 1;

    // Get current subscription details
    const planName =
      subscription?.plan?.name ||
      invoiceDetails.plan?.name ||
      'Subscription';
    const billingCycle =
      subscription?.billingCycle ||
      invoiceDetails.billingCycle ||
      'MONTHLY';
    const userCount =
      subscription?.userCount || invoiceDetails.userCount || 1;

    // Get base price per user
    const basePricePerUser = parseFloat(
      String(
        invoiceDetails.plan?.basePricePerUser ||
          invoiceDetails.basePricePerUser ||
          (subscription?.amount && subscription?.userCount
            ? subscription.amount / subscription.userCount
            : 0) ||
          (invoiceDetails.subtotal && invoiceDetails.userCount
            ? invoiceDetails.subtotal / invoiceDetails.userCount
            : 0) ||
          (fullInvoice.subtotal && userCount
            ? fullInvoice.subtotal / userCount
            : 0) ||
          0,
      ),
    );

    // Calculate total base price
    const baseTotal = basePricePerUser * userCount;

    // Add main subscription item
    items.push({
      no: itemNumber++,
      item: `${planName} - ${billingCycle}`,
      unitPrice: basePricePerUser,
      quantity: userCount,
      total: baseTotal,
    });

    // Add volume discount if applicable
    if (volumeDiscount > 0) {
      const discountPercent = invoiceDetails.volumeDiscount?.percent || 0;
      items.push({
        no: itemNumber++,
        item: `Volume Discount (${discountPercent}%)`,
        unitPrice: 0,
        quantity: 1,
        total: -volumeDiscount,
      });
    }

    // Add adjustments/credits from subscription prorationDetails
    const prorationSource =
      subscription?.prorationDetails || invoiceDetails.proration;

    if (prorationSource) {
      const proration =
        typeof prorationSource === 'string'
          ? JSON.parse(prorationSource)
          : prorationSource;
      const creditAmount = parseFloat(String(proration.creditAmount || 0));

      if (creditAmount > 0) {
        items.push({
          no: itemNumber++,
          item: `Credit (${proration.oldPlanName || 'Previous Plan'})`,
          unitPrice: 0,
          quantity: 1,
          total: -creditAmount,
        });
      }
    }

    return items;
  }

  private renderPaymentMethod(
    doc: PDFDoc,
    margin: number,
    startY: number,
    razorpayOrderId: string,
    razorpayPaymentId: string,
  ): void {
    const paymentY = startY + 30;
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('PAYMENT METHOD', margin, paymentY);

    doc.font('Helvetica').fontSize(10);
    let paymentDetailsY = paymentY + 20;

    doc.text('Payment Gateway: Razorpay', margin, paymentDetailsY);
    paymentDetailsY += 15;
    doc.text(`Razorpay Order ID: ${razorpayOrderId}`, margin, paymentDetailsY);
    paymentDetailsY += 15;
    doc.text(
      `Razorpay Payment ID: ${razorpayPaymentId}`,
      margin,
      paymentDetailsY,
    );
  }
}

