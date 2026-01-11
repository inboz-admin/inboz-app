import { apiService } from "./apiService";
import type {
  PlatformEmployee,
  CreatePlatformEmployeeRequest,
  UpdatePlatformEmployeeRequest,
  GetPlatformEmployeesParams,
} from "./platformEmployeeTypes";
import type { BaseResponse, PaginatedData } from "./types";

class PlatformEmployeeService {
  private baseUrl = "/employees";

  /**
   * Get all platform employees with pagination and filtering
   */
  async getEmployees(
    params: GetPlatformEmployeesParams = {}
  ): Promise<BaseResponse<PaginatedData<PlatformEmployee>>> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.search) queryParams.append("search", params.search);
    if (params.role) queryParams.append("role", params.role);
    if (params.status) queryParams.append("status", params.status);
    if (params.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

    const url = `${this.baseUrl}?${queryParams.toString()}`;
    return apiService.get(url);
  }

  /**
   * Get a single platform employee by ID
   */
  async getEmployee(id: string): Promise<BaseResponse<PlatformEmployee>> {
    return apiService.get(`${this.baseUrl}/${id}`);
  }

  /**
   * Create a new platform employee
   */
  async createEmployee(
    data: CreatePlatformEmployeeRequest
  ): Promise<BaseResponse<PlatformEmployee>> {
    return apiService.post(this.baseUrl, data);
  }

  /**
   * Update an existing platform employee
   */
  async updateEmployee(
    id: string,
    data: UpdatePlatformEmployeeRequest
  ): Promise<BaseResponse<PlatformEmployee>> {
    const url = `${this.baseUrl}/${id}`;
    return apiService.patch(url, data);
  }

  /**
   * Delete a platform employee (soft delete)
   */
  async deleteEmployee(id: string): Promise<BaseResponse<{ message: string }>> {
    return apiService.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Restore a soft-deleted platform employee
   */
  async restoreEmployee(id: string): Promise<BaseResponse<PlatformEmployee>> {
    return apiService.post(`${this.baseUrl}/${id}/restore`);
  }

  /**
   * Permanently delete a platform employee
   */
  async forceDeleteEmployee(
    id: string
  ): Promise<BaseResponse<{ message: string }>> {
    return apiService.delete(`${this.baseUrl}/${id}/force`);
  }
}

export const platformEmployeeService = new PlatformEmployeeService();


