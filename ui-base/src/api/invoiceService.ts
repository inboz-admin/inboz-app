import { apiService } from "./apiService";
import type {
  Invoice,
  GetInvoicesParams,
} from "./invoiceTypes";
import type { BaseResponse, PaginatedData } from "./types";

class InvoiceService {
  private baseUrl = "/subscriptions/invoices";

  /**
   * Get all invoices with pagination and filtering
   */
  async getInvoices(
    params: GetInvoicesParams = {}
  ): Promise<BaseResponse<PaginatedData<Invoice>>> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.search) queryParams.append("search", params.search);
    if (params.status) queryParams.append("status", params.status);
    if (params.organizationId)
      queryParams.append("organizationId", params.organizationId);
    if (params.subscriptionId)
      queryParams.append("subscriptionId", params.subscriptionId);
    if (params.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

    const url = `${this.baseUrl}?${queryParams.toString()}`;
    return apiService.get(url);
  }

  /**
   * Get a single invoice by ID
   */
  async getInvoice(
    id: string,
    organizationId?: string
  ): Promise<BaseResponse<Invoice>> {
    const queryParams = new URLSearchParams();
    if (organizationId) {
      queryParams.append("organizationId", organizationId);
    }
    const url = queryParams.toString()
      ? `${this.baseUrl}/${id}?${queryParams.toString()}`
      : `${this.baseUrl}/${id}`;
    return apiService.get(url);
  }

  /**
   * Download invoice PDF
   */
  async downloadInvoicePdf(id: string): Promise<Blob> {
    // Use apiService's internal request method but get blob response
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://inboz.io/api/v1';
    
    const response = await fetch(`${baseURL}${this.baseUrl}/${id}/download`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to download invoice: ${response.statusText}`);
    }

    return await response.blob();
  }
}

export const invoiceService = new InvoiceService();

