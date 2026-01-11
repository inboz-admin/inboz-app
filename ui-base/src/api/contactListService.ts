import { apiService } from "./apiService";
import type {
  ContactList,
  CreateContactListRequest,
  UpdateContactListRequest,
  GetContactListsParams,
  AddContactsToListRequest,
  RemoveContactsFromListRequest,
  AddContactsResponse,
  RemoveContactsResponse,
  GetListContactsResponse,
} from "./contactListTypes";
import type { BaseResponse, PaginatedData } from "./types";

class ContactListService {
  private baseUrl = "/contact-lists";

  /**
   * Get all contact lists with pagination and filtering
   */
  async getContactLists(
    params: GetContactListsParams = {}
  ): Promise<BaseResponse<PaginatedData<ContactList>>> {
    const queryParams = new URLSearchParams();

    if (params.organizationId)
      queryParams.append("organizationId", params.organizationId);
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.search) queryParams.append("search", params.search);
    if (params.type !== undefined) queryParams.append("type", params.type);
    if (params.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

    const url = `${this.baseUrl}?${queryParams.toString()}`;
    return apiService.get(url);
  }

  /**
   * Get a single contact list by ID
   */
  async getContactList(id: string): Promise<BaseResponse<ContactList>> {
    return apiService.get(`${this.baseUrl}/${id}`);
  }

  /**
   * Create a new contact list
   */
  async createContactList(
    data: CreateContactListRequest
  ): Promise<BaseResponse<ContactList>> {
    return apiService.post(this.baseUrl, data);
  }

  /**
   * Update an existing contact list
   */
  async updateContactList(
    id: string,
    data: UpdateContactListRequest
  ): Promise<BaseResponse<ContactList>> {
    return apiService.patch(`${this.baseUrl}/${id}`, data);
  }

  /**
   * Delete a contact list (soft delete)
   */
  async deleteContactList(
    id: string
  ): Promise<BaseResponse<{ message: string }>> {
    return apiService.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Permanently delete a contact list
   */
  async forceDeleteContactList(
    id: string
  ): Promise<BaseResponse<{ message: string }>> {
    return apiService.delete(`${this.baseUrl}/${id}/force`);
  }

  /**
   * Restore a soft-deleted contact list
   */
  async restoreContactList(id: string): Promise<BaseResponse<ContactList>> {
    return apiService.post(`${this.baseUrl}/${id}/restore`);
  }

  /**
   * Add contacts to a list
   */
  async addContactsToList(
    id: string,
    data: AddContactsToListRequest
  ): Promise<BaseResponse<AddContactsResponse>> {
    return apiService.post(`${this.baseUrl}/${id}/contacts`, data);
  }

  /**
   * Remove contacts from a list
   */
  async removeContactsFromList(
    id: string,
    data: RemoveContactsFromListRequest
  ): Promise<BaseResponse<RemoveContactsResponse>> {
    return apiService.delete(`${this.baseUrl}/${id}/contacts`, data);
  }

  /**
   * Get all contacts in a list
   */
  async getListContacts(
    id: string
  ): Promise<BaseResponse<GetListContactsResponse>> {
    return apiService.get(`${this.baseUrl}/${id}/contacts`);
  }
}

export const contactListService = new ContactListService();
