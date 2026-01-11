// Invoice entity types and interfaces

export const InvoiceStatus = {
  DRAFT: "DRAFT",
  OPEN: "OPEN",
  PAID: "PAID",
  VOID: "VOID",
  UNCOLLECTIBLE: "UNCOLLECTIBLE",
} as const;

export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  periodStart?: string;
  periodEnd?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  organizationId: string;
  subscriptionId?: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  billingAddress?: any;
  stripeInvoiceId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  paymentMethod?: string;
  paymentStatus?: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  pdfUrl?: string;
  pdfGeneratedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  lineItems?: InvoiceLineItem[];
  subscription?: any;
  organization?: any;
}

export interface GetInvoicesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: InvoiceStatus;
  organizationId?: string;
  subscriptionId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc" | "ASC" | "DESC";
}

export interface GetInvoicesResponse {
  invoices: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Display labels for UI
export const InvoiceStatusLabels: Record<InvoiceStatus, string> = {
  [InvoiceStatus.DRAFT]: "Draft",
  [InvoiceStatus.OPEN]: "Open",
  [InvoiceStatus.PAID]: "Paid",
  [InvoiceStatus.VOID]: "Void",
  [InvoiceStatus.UNCOLLECTIBLE]: "Uncollectible",
};

// Status colors for UI
export const InvoiceStatusColors: Record<InvoiceStatus, string> = {
  [InvoiceStatus.DRAFT]: "text-gray-600 bg-gray-50",
  [InvoiceStatus.OPEN]: "text-blue-600 bg-blue-50",
  [InvoiceStatus.PAID]: "text-green-600 bg-green-50",
  [InvoiceStatus.VOID]: "text-orange-600 bg-orange-50",
  [InvoiceStatus.UNCOLLECTIBLE]: "text-red-600 bg-red-50",
};

