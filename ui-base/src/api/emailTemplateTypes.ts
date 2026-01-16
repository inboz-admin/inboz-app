// Email Template Types and Interfaces

export enum EmailTemplateType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export enum EmailSendFormat {
  HTML = 'HTML',
  TEXT = 'TEXT',
}

export interface EmailTemplate {
  id: string;
  organizationId: string;
  name: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  plainText?: string;
  category?: string;
  tags?: string[];
  type: EmailTemplateType;
  sendFormat?: EmailSendFormat;
  variables?: string[];
  designSettings?: any;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  deletedBy?: string;
  createdByUser?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export interface CreateEmailTemplateDto {
  organizationId: string;
  name: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  plainText?: string;
  category?: string;
  tags?: string[];
  type?: EmailTemplateType;
  sendFormat?: EmailSendFormat;
  variables?: string[];
  designSettings?: any;
  systemTemplateId?: string; // If provided, will use system template's htmlContent and textContent
}

export interface UpdateEmailTemplateDto {
  name?: string;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  plainText?: string;
  category?: string;
  tags?: string[];
  type?: EmailTemplateType;
  sendFormat?: EmailSendFormat;
  variables?: string[];
  designSettings?: any;
  usageCount?: number;
  lastUsedAt?: string;
}

export interface EmailTemplateQueryDto {
  organizationId?: string;
  category?: string;
  type?: EmailTemplateType;
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortOrder?: 'ASC' | 'DESC';
}

export interface EmailTemplatePreviewDto {
  contactData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
    company?: string;
    companyDomain?: string;
    companyWebsite?: string;
    companyIndustry?: string;
    companySize?: string;
  };
  templateId?: string;
}

export interface EmailTemplatePreviewResponse {
  subject: string;
  htmlContent?: string;
  textContent?: string;
}

export interface EmailTemplateVariablesResponse {
  variables: string[];
}

export interface PaginatedEmailTemplatesResponse {
  data: EmailTemplate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}