import { apiService } from "./apiService";
import { API_CONFIG } from "@/config/constants";
import type {
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
  GetContactsParams,
} from "./contactTypes";
import type { BaseResponse, PaginatedData } from "./types";

class ContactService {
  private baseUrl = "/contacts";

  /**
   * Get all contacts with pagination and filtering
   */
  async getContacts(
    params: GetContactsParams = {}
  ): Promise<BaseResponse<PaginatedData<Contact>>> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.search) queryParams.append("search", params.search);
    if (params.status) queryParams.append("status", params.status);
    if (params.organizationId)
      queryParams.append("organizationId", params.organizationId);
    if (params.source) queryParams.append("source", params.source);
    if (params.company) queryParams.append("company", params.company);
    if (params.subscribed !== undefined)
      queryParams.append("subscribed", params.subscribed.toString());
    if (params.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

    const url = `${this.baseUrl}?${queryParams.toString()}`;
    return apiService.get(url);
  }

  /**
   * Get a single contact by ID
   */
  async getContact(
    id: string,
    organizationId?: string
  ): Promise<BaseResponse<Contact>> {
    const queryParams = new URLSearchParams();
    queryParams.append("id", id);
    if (organizationId) {
      queryParams.append("organizationId", organizationId);
    }
    const url = `${this.baseUrl}?${queryParams.toString()}`;
    return apiService.get(url);
  }

  /**
   * Get a contact by email
   */
  async getContactByEmail(
    email: string,
    organizationId: string
  ): Promise<BaseResponse<Contact>> {
    const queryParams = new URLSearchParams();
    queryParams.append("email", email);
    queryParams.append("organizationId", organizationId);
    const url = `${this.baseUrl}?${queryParams.toString()}`;
    return apiService.get(url);
  }

  /**
   * Create a new contact
   */
  async createContact(
    data: CreateContactRequest
  ): Promise<BaseResponse<Contact>> {
    return apiService.post(this.baseUrl, data);
  }

  /**
   * Update an existing contact
   */
  async updateContact(
    id: string,
    data: UpdateContactRequest,
    organizationId?: string
  ): Promise<BaseResponse<Contact>> {
    const queryParams = new URLSearchParams();
    if (organizationId) {
      queryParams.append("organizationId", organizationId);
    }
    const url = queryParams.toString()
      ? `${this.baseUrl}/${id}?${queryParams.toString()}`
      : `${this.baseUrl}/${id}`;
    return apiService.patch(url, data);
  }

  /**
   * Delete a contact (soft delete)
   */
  async deleteContact(
    id: string,
    organizationId?: string
  ): Promise<BaseResponse<{ message: string }>> {
    const queryParams = new URLSearchParams();
    if (organizationId) {
      queryParams.append("organizationId", organizationId);
    }
    const url = queryParams.toString()
      ? `${this.baseUrl}/${id}?${queryParams.toString()}`
      : `${this.baseUrl}/${id}`;
    return apiService.delete(url);
  }

  /**
   * Restore a soft-deleted contact
   */
  async restoreContact(id: string): Promise<BaseResponse<Contact>> {
    return apiService.post(`${this.baseUrl}/${id}/restore`);
  }

  /**
   * Permanently delete a contact
   */
  async forceDeleteContact(
    id: string
  ): Promise<BaseResponse<{ message: string }>> {
    return apiService.delete(`${this.baseUrl}/${id}/force`);
  }

  /**
   * Unsubscribe a contact
   */
  async unsubscribeContact(
    id: string,
    organizationId?: string
  ): Promise<BaseResponse<Contact>> {
    const queryParams = new URLSearchParams();
    if (organizationId) {
      queryParams.append("organizationId", organizationId);
    }
    const url = queryParams.toString()
      ? `${this.baseUrl}/${id}/unsubscribe?${queryParams.toString()}`
      : `${this.baseUrl}/${id}/unsubscribe`;
    return apiService.patch(url);
  }

  /**
   * Update email tracking for a contact
   */
  async updateEmailTracking(
    id: string,
    type: "sent" | "opened" | "clicked",
    organizationId?: string
  ): Promise<BaseResponse<{ message: string }>> {
    const queryParams = new URLSearchParams();
    if (organizationId) {
      queryParams.append("organizationId", organizationId);
    }
    const url = queryParams.toString()
      ? `${this.baseUrl}/${id}/email-tracking/${type}?${queryParams.toString()}`
      : `${this.baseUrl}/${id}/email-tracking/${type}`;
    return apiService.patch(url);
  }

  /**
   * Increment bounce count for a contact
   */
  async incrementBounceCount(
    id: string,
    organizationId?: string
  ): Promise<BaseResponse<{ message: string }>> {
    const queryParams = new URLSearchParams();
    if (organizationId) {
      queryParams.append("organizationId", organizationId);
    }
    const url = queryParams.toString()
      ? `${this.baseUrl}/${id}/bounce?${queryParams.toString()}`
      : `${this.baseUrl}/${id}/bounce`;
    return apiService.patch(url);
  }

  /**
   * Increment complaint count for a contact
   */
  async incrementComplaintCount(
    id: string,
    organizationId?: string
  ): Promise<BaseResponse<{ message: string }>> {
    const queryParams = new URLSearchParams();
    if (organizationId) {
      queryParams.append("organizationId", organizationId);
    }
    const url = queryParams.toString()
      ? `${this.baseUrl}/${id}/complaint?${queryParams.toString()}`
      : `${this.baseUrl}/${id}/complaint`;
    return apiService.patch(url);
  }

  /**
   * Get decrypted phone number for a contact
   */
  async getDecryptedPhone(
    id: string,
    organizationId?: string
  ): Promise<BaseResponse<{ phone: string | null }>> {
    const queryParams = new URLSearchParams();
    queryParams.append("id", id);
    queryParams.append("phone", "true");
    if (organizationId) {
      queryParams.append("organizationId", organizationId);
    }
    const url = `${this.baseUrl}?${queryParams.toString()}`;
    return apiService.get(url);
  }

  /**
   * Get decrypted personal notes for a contact
   */
  async getDecryptedPersonalNotes(
    id: string,
    organizationId?: string
  ): Promise<BaseResponse<{ notes: string | null }>> {
    const queryParams = new URLSearchParams();
    queryParams.append("id", id);
    queryParams.append("notes", "true");
    if (organizationId) {
      queryParams.append("organizationId", organizationId);
    }
    const url = `${this.baseUrl}?${queryParams.toString()}`;
    return apiService.get(url);
  }

  /**
   * Bulk upload contacts from file
   */
  async bulkUploadContacts(
    file: File,
    organizationId?: string
  ): Promise<BaseResponse<any>> {
    const formData = new FormData();
    formData.append("file", file);

    const queryParams = new URLSearchParams();
    if (organizationId) {
      queryParams.append("organizationId", organizationId);
    }

    const url = `${this.baseUrl}/bulk-upload?${queryParams.toString()}`;

    // Use the same URL construction as apiService - construct manually
    const fullUrl = `${API_CONFIG.baseUrl}${url}`;
    console.log("Full URL:", fullUrl);

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("accessToken")}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Download contact import template
   */
  async downloadTemplate(): Promise<Blob> {
    const url = `${this.baseUrl}/template`;
    const fullUrl = `${API_CONFIG.baseUrl}${url}`;
    console.log("Template URL:", fullUrl);

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("accessToken")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.blob();
  }

}

export const contactService = new ContactService();
