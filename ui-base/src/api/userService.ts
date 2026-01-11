import { apiService } from "./apiService";
import type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  InviteUserRequest,
  GetUsersParams,
} from "./userTypes";
import type { BaseResponse, PaginatedData } from "./types";

class UserService {
  private baseUrl = "/users";

  /**
   * Get all users with pagination and filtering
   */
  async getUsers(
    params: GetUsersParams = {}
  ): Promise<BaseResponse<PaginatedData<User>>> {
    // Build query params object - apiService.get() will handle URL encoding
    const queryParams: Record<string, string | number> = {};

    if (params.page) queryParams.page = params.page;
    if (params.limit) queryParams.limit = params.limit;
    if (params.search) queryParams.search = params.search;
    if (params.role) queryParams.role = params.role;
    if (params.status) queryParams.status = params.status;
    if (params.organizationId) queryParams.organizationId = params.organizationId;
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.sortOrder) queryParams.sortOrder = params.sortOrder;

    // Pass params as object - apiService will automatically add organizationId for employees
    return apiService.get(this.baseUrl, queryParams);
  }

  /**
   * Get a single user by ID
   */
  async getUser(
    id: string,
    organizationId?: string
  ): Promise<BaseResponse<User>> {
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
   * Create a new user
   */
  async createUser(data: CreateUserRequest): Promise<BaseResponse<User>> {
    return apiService.post(this.baseUrl, data);
  }

  /**
   * Get quota statistics for a user
   * @param userId User ID
   * @param targetDate Optional target date to get quota for a specific day (defaults to today)
   */
  async getQuotaStats(userId: string, targetDate?: Date): Promise<BaseResponse<{
    used: number;
    limit: number;
    remaining: number;
    resetAt: string;
    percentUsed: number;
  }>> {
    const queryParams = new URLSearchParams();
    if (targetDate) {
      queryParams.append('targetDate', targetDate.toISOString());
    }
    const url = queryParams.toString()
      ? `${this.baseUrl}/${userId}/quota?${queryParams.toString()}`
      : `${this.baseUrl}/${userId}/quota`;
    return apiService.get(url);
  }

  /**
   * Update an existing user
   */
  async updateUser(
    id: string,
    data: UpdateUserRequest,
    organizationId?: string
  ): Promise<BaseResponse<User>> {
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
   * Delete a user (soft delete)
   */
  async deleteUser(
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
   * Restore a soft-deleted user
   */
  async restoreUser(id: string): Promise<BaseResponse<User>> {
    return apiService.post(`${this.baseUrl}/${id}/restore`);
  }

  /**
   * Permanently delete a user
   */
  async forceDeleteUser(
    id: string
  ): Promise<BaseResponse<{ message: string }>> {
    return apiService.delete(`${this.baseUrl}/${id}/force`);
  }

  /**
   * Invite a new user to the organization
   */
  async inviteUser(
    data: InviteUserRequest
  ): Promise<BaseResponse<{ message: string }>> {
    return apiService.post(`${this.baseUrl}/invite`, data);
  }
}

export const userService = new UserService();
