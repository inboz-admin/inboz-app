// Contact entity types and interfaces

export const ContactStatus = {
  ACTIVE: "ACTIVE",
  UNSUBSCRIBED: "UNSUBSCRIBED",
  BOUNCED: "BOUNCED",
  COMPLAINED: "COMPLAINED",
  INACTIVE: "INACTIVE",
} as const;

export type ContactStatus = (typeof ContactStatus)[keyof typeof ContactStatus];

export interface Contact {
  id: string;
  organizationId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  phone?: string;
  phoneEncrypted?: string;
  source?: string;
  status: ContactStatus;
  subscribed: boolean;
  subscribedAt?: string;
  unsubscribedAt?: string;
  bounceCount: number;
  complaintCount: number;
  customFields?: any;
  personalNotesEncrypted?: string;
  lastEmailSentAt?: string;
  lastEmailOpenedAt?: string;
  lastEmailClickedAt?: string;
  organization?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateContactRequest {
  organizationId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  phone?: string;
  source?: string;
  status?: ContactStatus;
  subscribed?: boolean;
  customFields?: any;
  personalNotes?: string;
}

export interface UpdateContactRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  phone?: string;
  source?: string;
  status?: ContactStatus;
  subscribed?: boolean;
  customFields?: any;
  personalNotes?: string;
  subscribedAt?: string;
  unsubscribedAt?: string;
  lastEmailSentAt?: string;
  lastEmailOpenedAt?: string;
  lastEmailClickedAt?: string;
}

export interface GetContactsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ContactStatus;
  organizationId?: string;
  source?: string;
  company?: string;
  subscribed?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface GetContactsResponse {
  contacts: Contact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Helper functions for contact data
export const ContactHelpers = {
  isGetContactsSuccess: (
    response: unknown
  ): response is { success: true; data: GetContactsResponse } => {
    return (
      typeof response === "object" &&
      response !== null &&
      "success" in response &&
      (response as { success: unknown }).success === true &&
      "data" in response &&
      typeof (response as { data: unknown }).data === "object" &&
      (response as { data: { contacts?: unknown } }).data !== null &&
      "contacts" in (response as { data: { contacts?: unknown } }).data
    );
  },

  getContactsFromResponse: (response: {
    data: GetContactsResponse;
  }): Contact[] => {
    return response.data.contacts;
  },

  getPaginationFromResponse: (response: { data: GetContactsResponse }) => {
    return response.data.pagination;
  },

  isCreateContactSuccess: (
    response: unknown
  ): response is { success: true; data: Contact } => {
    return (
      typeof response === "object" &&
      response !== null &&
      "success" in response &&
      (response as { success: unknown }).success === true &&
      "data" in response &&
      typeof (response as { data: unknown }).data === "object" &&
      (response as { data: { id?: unknown } }).data !== null &&
      "id" in (response as { data: { id?: unknown } }).data
    );
  },

  isUpdateContactSuccess: (
    response: unknown
  ): response is { success: true; data: Contact } => {
    return (
      typeof response === "object" &&
      response !== null &&
      "success" in response &&
      (response as { success: unknown }).success === true &&
      "data" in response &&
      typeof (response as { data: unknown }).data === "object" &&
      (response as { data: { id?: unknown } }).data !== null &&
      "id" in (response as { data: { id?: unknown } }).data
    );
  },

  isDeleteContactSuccess: (
    response: unknown
  ): response is { success: true; message: string } => {
    return (
      typeof response === "object" &&
      response !== null &&
      "success" in response &&
      (response as { success: unknown }).success === true &&
      "message" in response &&
      typeof (response as { message: unknown }).message === "string"
    );
  },

  getContactFromResponse: (response: { data: Contact }): Contact => {
    return response.data;
  },
};

// Status display names
export const ContactStatusLabels: Record<ContactStatus, string> = {
  [ContactStatus.ACTIVE]: "Active",
  [ContactStatus.UNSUBSCRIBED]: "Unsubscribed",
  [ContactStatus.BOUNCED]: "Bounced",
  [ContactStatus.COMPLAINED]: "Complained",
  [ContactStatus.INACTIVE]: "Inactive",
};

// Status colors for UI
export const ContactStatusColors: Record<ContactStatus, string> = {
  [ContactStatus.ACTIVE]: "text-green-600 bg-green-50",
  [ContactStatus.UNSUBSCRIBED]: "text-yellow-600 bg-yellow-50",
  [ContactStatus.BOUNCED]: "text-red-600 bg-red-50",
  [ContactStatus.COMPLAINED]: "text-red-600 bg-red-50",
  [ContactStatus.INACTIVE]: "text-gray-600 bg-gray-50",
};

// Source display names
export const ContactSourceLabels: Record<string, string> = {
  IMPORTED: "Imported",
  MANUAL: "Manual",
  API: "API",
  WEBSITE: "Website",
  SOCIAL: "Social Media",
  REFERRAL: "Referral",
  OTHER: "Other",
};
