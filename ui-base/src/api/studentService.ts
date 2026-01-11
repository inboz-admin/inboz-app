import { apiService } from "./apiService";
import type {
  Student,
  CreateStudentRequest,
  UpdateStudentRequest,
  GetStudentsParams,
} from "./studentTypes";
import type { BaseResponse, PaginatedData } from "./types";

class StudentService {
  private baseUrl = "/students";

  /**
   * Get all students with pagination and filtering
   */
  async getStudents(
    params: GetStudentsParams = {}
  ): Promise<BaseResponse<PaginatedData<Student>>> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.search) queryParams.append("search", params.search);
    if (params.status) queryParams.append("status", params.status);
    if (params.cohortId)
      queryParams.append("cohortId", params.cohortId.toString());
    if (params.centerId)
      queryParams.append("centerId", params.centerId.toString());
    if (params.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

    const url = `${this.baseUrl}?${queryParams.toString()}`;
    return apiService.get(url);
  }

  /**
   * Get a single student by ID
   */
  async getStudent(id: number): Promise<BaseResponse<Student>> {
    return apiService.get(`${this.baseUrl}/${id}`);
  }

  /**
   * Create a new student
   */
  async createStudent(
    data: CreateStudentRequest
  ): Promise<BaseResponse<Student>> {
    return apiService.post(this.baseUrl, data);
  }

  /**
   * Update an existing student
   */
  async updateStudent(
    id: number,
    data: UpdateStudentRequest
  ): Promise<BaseResponse<Student>> {
    const url = `${this.baseUrl}/${id}`;
    return apiService.patch(url, data);
  }

  /**
   * Delete a student (soft delete)
   */
  async deleteStudent(id: number): Promise<BaseResponse<{ message: string }>> {
    return apiService.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Restore a soft-deleted student
   */
  async restoreStudent(id: number): Promise<BaseResponse<Student>> {
    return apiService.post(`${this.baseUrl}/${id}/restore`);
  }

  /**
   * Permanently delete a student
   */
  async forceDeleteStudent(
    id: number
  ): Promise<BaseResponse<{ message: string }>> {
    return apiService.delete(`${this.baseUrl}/${id}/force`);
  }
}

export const studentService = new StudentService();
