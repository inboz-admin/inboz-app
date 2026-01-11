import { apiService } from "./apiService";
import type {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  GetEmployeesParams,
} from "./employeeTypes";
import type { BaseResponse, PaginatedData } from "./types";

class EmployeeService {
  private baseUrl = "/employees";

  /**
   * Get all employees with pagination and filtering
   */
  async getEmployees(
    params: GetEmployeesParams = {}
  ): Promise<BaseResponse<PaginatedData<Employee>>> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.search) queryParams.append("search", params.search);
    if (params.role) queryParams.append("role", params.role);
    if (params.status) queryParams.append("status", params.status);
    if (params.centerId)
      queryParams.append("centerId", params.centerId.toString());
    if (params.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

    const url = `${this.baseUrl}?${queryParams.toString()}`;
    return apiService.get(url);
  }

  /**
   * Get a single employee by ID
   */
  async getEmployee(id: number): Promise<BaseResponse<Employee>> {
    return apiService.get(`${this.baseUrl}/${id}`);
  }

  /**
   * Create a new employee
   */
  async createEmployee(
    data: CreateEmployeeRequest
  ): Promise<BaseResponse<Employee>> {
    return apiService.post(this.baseUrl, data);
  }

  /**
   * Update an existing employee
   */
  async updateEmployee(
    id: number,
    data: UpdateEmployeeRequest
  ): Promise<BaseResponse<Employee>> {
    const url = `${this.baseUrl}/${id}`;
    return apiService.patch(url, data);
  }

  /**
   * Delete an employee (soft delete)
   */
  async deleteEmployee(id: number): Promise<BaseResponse<{ message: string }>> {
    return apiService.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Restore a soft-deleted employee
   */
  async restoreEmployee(id: number): Promise<BaseResponse<Employee>> {
    return apiService.post(`${this.baseUrl}/${id}/restore`);
  }

  /**
   * Permanently delete an employee
   */
  async forceDeleteEmployee(
    id: number
  ): Promise<BaseResponse<{ message: string }>> {
    return apiService.delete(`${this.baseUrl}/${id}/force`);
  }
}

export const employeeService = new EmployeeService();
