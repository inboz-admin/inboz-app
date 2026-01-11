import { apiService } from "./apiService";
import type {
  Role,
  CreateRoleRequest,
  UpdateRoleRequest,
  GetRolesParams,
  ModuleActionsResponse,
} from "./roleTypes";
import type { BaseResponse, PaginatedData } from "./types";

class RoleService {
  private readonly baseUrl = "/rbac/roles";

  /**
   * Get all roles with pagination and filtering
   */
  async getRoles(
    params: GetRolesParams = {}
  ): Promise<BaseResponse<PaginatedData<Role>>> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.search) queryParams.append("search", params.search);
    if (params.isActive !== undefined)
      queryParams.append("isActive", params.isActive.toString());
    if (params.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

    const url = `${this.baseUrl}?${queryParams.toString()}`;
    return apiService.get(url);
  }

  /**
   * Get a single role by ID
   */
  async getRole(id: number): Promise<BaseResponse<Role>> {
    return apiService.get(`${this.baseUrl}/${id}`);
  }

  /**
   * Get a single role by name
   */
  async getRoleByName(name: string): Promise<BaseResponse<Role>> {
    return apiService.get(`${this.baseUrl}/name/${name}`);
  }

  /**
   * Create a new role
   */
  async createRole(data: CreateRoleRequest): Promise<BaseResponse<Role>> {
    return apiService.post(this.baseUrl, data);
  }

  /**
   * Update an existing role
   */
  async updateRole(
    id: number,
    data: UpdateRoleRequest
  ): Promise<BaseResponse<Role>> {
    const url = `${this.baseUrl}/${id}`;
    return apiService.patch(url, data);
  }

  /**
   * Delete a role (soft delete)
   */
  async deleteRole(id: number): Promise<BaseResponse<{ message: string }>> {
    return apiService.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Restore a soft-deleted role
   */
  async restoreRole(id: number): Promise<BaseResponse<Role>> {
    return apiService.post(`${this.baseUrl}/${id}/restore`);
  }

  /**
   * Permanently delete a role
   */
  async forceDeleteRole(
    id: number
  ): Promise<BaseResponse<{ message: string }>> {
    return apiService.delete(`${this.baseUrl}/${id}/force`);
  }

  // RBAC-specific methods using the requested endpoint pattern

  /**
   * Get role actions for a specific role and module
   * Endpoint: /rbac/roles/:rolename/actions/modulename
   */
  async getRoleActions(
    roleName: string,
    moduleName: string
  ): Promise<BaseResponse<ModuleActionsResponse>> {
    const url = `${this.baseUrl}/${roleName}/actions/${moduleName}`;
    return apiService.get(url);
  }
}

export const roleService = new RoleService();
