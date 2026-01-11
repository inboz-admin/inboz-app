import { apiService } from "./apiService";
import type {
  Course,
  CreateCourseRequest,
  UpdateCourseRequest,
  GetCoursesParams,
} from "./courseTypes";
import type { BaseResponse, PaginatedData } from "./types";

class CourseService {
  private baseUrl = "/courses";

  /**
   * Get all courses with pagination and filtering
   */
  async getCourses(
    params: GetCoursesParams = {}
  ): Promise<BaseResponse<PaginatedData<Course>>> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.search) queryParams.append("search", params.search);
    if (params.status) queryParams.append("status", params.status);
    if (params.centerId)
      queryParams.append("centerId", params.centerId.toString());
    if (params.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

    const url = `${this.baseUrl}?${queryParams.toString()}`;
    return apiService.get(url);
  }

  /**
   * Get a single course by ID
   */
  async getCourseById(id: number): Promise<BaseResponse<Course>> {
    return apiService.get(`${this.baseUrl}/${id}`);
  }

  /**
   * Create a new course
   */
  async createCourse(data: CreateCourseRequest): Promise<BaseResponse<Course>> {
    return apiService.post(this.baseUrl, data);
  }

  /**
   * Update an existing course
   */
  async updateCourse(
    id: number,
    data: UpdateCourseRequest
  ): Promise<BaseResponse<Course>> {
    const url = `${this.baseUrl}/${id}`;
    return apiService.patch(url, data);
  }

  /**
   * Delete a course (soft delete)
   */
  async deleteCourse(id: number): Promise<BaseResponse<{ message: string }>> {
    return apiService.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Restore a soft-deleted course
   */
  async restoreCourse(id: number): Promise<BaseResponse<Course>> {
    return apiService.post(`${this.baseUrl}/${id}/restore`);
  }

  /**
   * Permanently delete a course
   */
  async forceDeleteCourse(
    id: number
  ): Promise<BaseResponse<{ message: string }>> {
    return apiService.delete(`${this.baseUrl}/${id}/force`);
  }
}

export const courseService = new CourseService();
