import { apiService } from './apiService';
import type {
  EmailTemplate,
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  EmailTemplateQueryDto,
  EmailTemplatePreviewDto,
  EmailTemplatePreviewResponse,
  EmailTemplateVariablesResponse,
  PaginatedEmailTemplatesResponse,
} from './emailTemplateTypes';

export const emailTemplateService = {
  // Get all email templates with optional filters
  async getTemplates(query?: EmailTemplateQueryDto): Promise<PaginatedEmailTemplatesResponse> {
    // Build query params object - apiService.get() will handle URL encoding and add organizationId for employees
    const queryParams: Record<string, string | number> = {};
    
    if (query?.organizationId) queryParams.organizationId = query.organizationId;
    if (query?.category) queryParams.category = query.category;
    if (query?.type) queryParams.type = query.type;
    if (query?.searchTerm) queryParams.searchTerm = query.searchTerm;
    if (query?.page) queryParams.page = query.page;
    if (query?.limit) queryParams.limit = query.limit;
    if (query?.sortOrder) queryParams.sortOrder = query.sortOrder;

    // Pass params as object - apiService will automatically add organizationId for employees
    const response = await apiService.get<PaginatedEmailTemplatesResponse>('/email-templates', queryParams);
    return (response.data as any) ?? response;
  },

  // Get a single email template by ID
  async getTemplate(id: string): Promise<EmailTemplate> {
    const response = await apiService.get<EmailTemplate>(`/email-templates/${id}`);
    return ((response.data as any)?.data ?? response.data) as EmailTemplate;
  },

  // Create a new email template
  async createTemplate(data: CreateEmailTemplateDto) {
    const response = await apiService.post<EmailTemplate>('/email-templates', data);
    // Check for error response
    if (response.statusCode && response.statusCode >= 400) {
      const errorMessage = response.message || 'Failed to create template';
      const error = new Error(errorMessage);
      (error as any).statusCode = response.statusCode;
      (error as any).error = response.error;
      (error as any).message = response.message;
      (error as any).response = { data: response, status: response.statusCode };
      throw error;
    }
    if (response.success === false && response.message) {
      const error = new Error(response.message);
      (error as any).statusCode = response.statusCode || 400;
      (error as any).error = response.error;
      (error as any).message = response.message;
      (error as any).response = { data: response };
      throw error;
    }
    return ((response.data as any)?.data ?? response.data) as EmailTemplate;
  },

  // Update an email template
  async updateTemplate(id: string, data: UpdateEmailTemplateDto) {
    const response = await apiService.patch<EmailTemplate>(`/email-templates/${id}`, data);
    // Check for error response
    if (response.statusCode && response.statusCode >= 400) {
      const errorMessage = response.message || 'Failed to update template';
      const error = new Error(errorMessage);
      (error as any).statusCode = response.statusCode;
      (error as any).error = response.error;
      (error as any).message = response.message;
      (error as any).response = { data: response, status: response.statusCode };
      throw error;
    }
    if (response.success === false && response.message) {
      const error = new Error(response.message);
      (error as any).statusCode = response.statusCode || 400;
      (error as any).error = response.error;
      (error as any).message = response.message;
      (error as any).response = { data: response };
      throw error;
    }
    return ((response.data as any)?.data ?? response.data) as EmailTemplate;
  },

  // Delete an email template (soft delete)
  async deleteTemplate(id: string) {
    const response = await apiService.delete(`/email-templates/${id}`);
    return response;
  },

  // Force delete an email template (permanent)
  async forceDeleteTemplate(id: string): Promise<EmailTemplate> {
    const response = await apiService.delete<EmailTemplate>(`/email-templates/${id}/force`);
    return ((response.data as any)?.data ?? response.data) as EmailTemplate;
  },

  // Restore a soft-deleted email template
  async restoreTemplate(id: string): Promise<EmailTemplate> {
    const response = await apiService.post<EmailTemplate>(`/email-templates/${id}/restore`);
    return ((response.data as any)?.data ?? response.data) as EmailTemplate;
  },


  // Get available variable fields
  async getVariableFields(): Promise<EmailTemplateVariablesResponse> {
    const response = await apiService.get<EmailTemplateVariablesResponse>('/email-templates/variables');
    return ((response.data as any)?.data ?? response.data) as EmailTemplateVariablesResponse;
  },

  // Render preview with contact data
  async renderPreview(
    id: string,
    data: EmailTemplatePreviewDto,
  ): Promise<EmailTemplatePreviewResponse> {
    const response = await apiService.post<EmailTemplatePreviewResponse>(`/email-templates/${id}/preview`, data);
    return ((response.data as any)?.data ?? response.data) as EmailTemplatePreviewResponse;
  },

  // Increment usage count
  async incrementUsage(id: string): Promise<void> {
    await apiService.patch(`/email-templates/${id}/increment-usage`);
  },

  // Get all system templates
  async getSystemTemplates(): Promise<any[]> {
    const response = await apiService.get<any[]>('/email-templates/system-templates');
    // apiService.get returns BaseResponse<T>, so response.data is the array
    return (response.data || []) as any[];
  },
};
