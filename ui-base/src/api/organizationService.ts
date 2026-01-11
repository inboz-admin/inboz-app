import { apiService } from "./apiService";
import type {
  Organization,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  GetOrganizationsParams,
} from "./organizationTypes";
import type { BaseResponse, PaginatedData } from "./types";

class OrganizationService {
  private baseUrl = "/organizations";

  /**
   * Get all organizations with pagination and filtering
   * Note: For employees, this should fetch ALL organizations without filtering by organizationId
   */
  async getOrganizations(
    params: GetOrganizationsParams = {}
  ): Promise<BaseResponse<PaginatedData<Organization>>> {
    // Build query params object - apiService.get() will handle URL encoding
    // Don't include organizationId here - we want all organizations for the selector
    const queryParams: Record<string, string | number> = {};

    if (params.page) queryParams.page = params.page;
    if (params.limit) queryParams.limit = params.limit;
    if (params.search) queryParams.search = params.search;
    if (params.status) queryParams.status = params.status;
    if (params.subscriptionStatus) queryParams.subscriptionStatus = params.subscriptionStatus;
    if (params.domain) queryParams.domain = params.domain;
    // Note: We intentionally don't pass organizationId here for getOrganizations
    // as we want to fetch ALL organizations for the selector dropdown
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.sortOrder) queryParams.sortOrder = params.sortOrder;

    // Pass empty object to prevent apiService from adding organizationId from store
    // We want ALL organizations for the selector
    return apiService.get(this.baseUrl, queryParams);
  }

  /**
   * Get a single organization by ID
   */
  async getOrganization(
    id: string,
    organizationId?: string
  ): Promise<BaseResponse<Organization>> {
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
   * Get organization by slug
   */
  async getOrganizationBySlug(
    slug: string,
    organizationId?: string
  ): Promise<BaseResponse<Organization>> {
    const queryParams = new URLSearchParams();
    if (organizationId) {
      queryParams.append("organizationId", organizationId);
    }
    const url = queryParams.toString()
      ? `${this.baseUrl}/slug/${slug}?${queryParams.toString()}`
      : `${this.baseUrl}/slug/${slug}`;
    return apiService.get(url);
  }

  /**
   * Get organization by domain
   */
  async getOrganizationByDomain(
    domain: string,
    organizationId?: string
  ): Promise<BaseResponse<Organization>> {
    const queryParams = new URLSearchParams();
    if (organizationId) {
      queryParams.append("organizationId", organizationId);
    }
    const url = queryParams.toString()
      ? `${this.baseUrl}/domain/${domain}?${queryParams.toString()}`
      : `${this.baseUrl}/domain/${domain}`;
    return apiService.get(url);
  }

  /**
   * Create a new organization
   */
  async createOrganization(
    data: CreateOrganizationRequest
  ): Promise<BaseResponse<Organization>> {
    return apiService.post(this.baseUrl, data);
  }

  /**
   * Update an existing organization
   */
  async updateOrganization(
    id: string,
    data: UpdateOrganizationRequest,
    organizationId?: string
  ): Promise<BaseResponse<Organization>> {
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
   * Delete an organization (soft delete)
   */
  async deleteOrganization(
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
   * Restore a soft-deleted organization
   */
  async restoreOrganization(id: string): Promise<BaseResponse<Organization>> {
    return apiService.post(`${this.baseUrl}/${id}/restore`);
  }

  /**
   * Permanently delete an organization
   */
  async forceDeleteOrganization(
    id: string
  ): Promise<BaseResponse<{ message: string }>> {
    return apiService.delete(`${this.baseUrl}/${id}/force`);
  }

  /**
   * Update organization settings
   */
  async updateOrganizationSettings(
    id: string,
    settings: Record<string, unknown>
  ): Promise<BaseResponse<Organization>> {
    return apiService.patch(`${this.baseUrl}/${id}/settings`, { settings });
  }

  /**
   * Update subscription status
   */
  async updateSubscriptionStatus(
    id: string,
    subscriptionStatus: string,
    subscriptionPlanId?: string
  ): Promise<BaseResponse<Organization>> {
    return apiService.patch(`${this.baseUrl}/${id}/subscription`, {
      subscriptionStatus,
      subscriptionPlanId,
    });
  }
}

export const organizationService = new OrganizationService();

// Helper functions for organization operations
export const OrganizationHelpers = {
  /**
   * Check if get organizations response was successful
   */
  isGetOrganizationsSuccess: (
    response: BaseResponse<PaginatedData<Organization>>
  ): boolean => {
    return response.success === true && !!response.data?.data;
  },

  /**
   * Extract organizations from response
   */
  getOrganizationsFromResponse: (
    response: BaseResponse<PaginatedData<Organization>>
  ): Organization[] => {
    if (response.success && response.data?.data) {
      return response.data.data;
    }
    return [];
  },

  /**
   * Check if get organization response was successful
   */
  isGetOrganizationSuccess: (response: BaseResponse<Organization>): boolean => {
    return response.success === true && !!response.data;
  },

  /**
   * Extract organization from response
   */
  getOrganizationFromResponse: (
    response: BaseResponse<Organization>
  ): Organization | null => {
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  },

  /**
   * Check if create organization response was successful
   */
  isCreateOrganizationSuccess: (
    response: BaseResponse<Organization>
  ): boolean => {
    return response.success === true && !!response.data;
  },

  /**
   * Check if update organization response was successful
   */
  isUpdateOrganizationSuccess: (
    response: BaseResponse<Organization>
  ): boolean => {
    return response.success === true && !!response.data;
  },

  /**
   * Check if delete organization response was successful
   */
  isDeleteOrganizationSuccess: (
    response: BaseResponse<{ message: string }>
  ): boolean => {
    return response.success === true;
  },

  /**
   * Format organization name for display
   */
  formatOrganizationName: (organization: Organization): string => {
    return `${organization.name} (${organization.slug})`;
  },

  /**
   * Get organization status color class
   */
  getStatusColorClass: (status: string): string => {
    const statusColors: Record<string, string> = {
      ACTIVE: "text-green-600 bg-green-50",
      INACTIVE: "text-gray-600 bg-gray-50",
      SUSPENDED: "text-red-600 bg-red-50",
    };
    return statusColors[status] || "text-gray-600 bg-gray-50";
  },

  /**
   * Get subscription status color class
   */
  getSubscriptionStatusColorClass: (status: string): string => {
    const statusColors: Record<string, string> = {
      TRIAL: "text-blue-600 bg-blue-50",
      ACTIVE: "text-green-600 bg-green-50",
      CANCELLED: "text-orange-600 bg-orange-50",
      EXPIRED: "text-red-600 bg-red-50",
      SUSPENDED: "text-gray-600 bg-gray-50",
    };
    return statusColors[status] || "text-gray-600 bg-gray-50";
  },
};
