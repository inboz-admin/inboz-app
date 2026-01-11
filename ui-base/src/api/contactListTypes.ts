export enum ContactListType {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
}

export interface ContactList {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  filterConditions?: any;
  contactCount: number;
  type: ContactListType;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  creator?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export interface CreateContactListRequest {
  name: string;
  description?: string;
  filterConditions?: any;
  type?: ContactListType;
  organizationId?: string;
}

export interface UpdateContactListRequest {
  name?: string;
  description?: string;
  filterConditions?: any;
  type?: ContactListType;
}

export interface AddContactsToListRequest {
  contactIds: string[];
}

export interface RemoveContactsFromListRequest {
  contactIds: string[];
}

export interface GetContactListsParams {
  organizationId?: string;
  search?: string;
  type?: ContactListType;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface AddContactsResponse {
  success: boolean;
  message: string;
  addedCount: number;
}

export interface RemoveContactsResponse {
  success: boolean;
  message: string;
  removedCount: number;
}

export interface GetListContactsResponse {
  total: number;
  data: any[]; // Array of Contact objects
}
