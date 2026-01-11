import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsUUID,
  IsObject,
  Min,
  Length,
} from 'class-validator';
import { InvoiceStatus, Currency } from '../entities/invoice.entity';

export class CreateInvoiceDto {
  @IsNotEmpty()
  @IsUUID()
  organizationId: string;

  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  invoiceNumber: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  subtotal: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  total: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amountDue: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsNotEmpty()
  @IsDateString()
  issueDate: string;

  @IsNotEmpty()
  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsObject()
  billingAddress?: any;

  @IsOptional()
  @IsString()
  stripeInvoiceId?: string;

  @IsOptional()
  @IsString()
  pdfUrl?: string;

  @IsOptional()
  @IsDateString()
  pdfGeneratedAt?: string;
}



























