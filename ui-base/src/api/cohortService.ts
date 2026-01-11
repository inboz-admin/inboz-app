import { apiService } from "./apiService";
import type {
  Cohort,
  CreateCohortRequest,
  UpdateCohortRequest,
  GetCohortsParams,
} from "./cohortTypes";
import type { BaseResponse, PaginatedData } from "./types";

class CohortService {
  private baseUrl = "/cohorts";

  /**
   * Get all cohorts with pagination and filtering
   */
  async getCohorts(
    params: GetCohortsParams = {}
  ): Promise<BaseResponse<PaginatedData<Cohort>>> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.search) queryParams.append("search", params.search);
    if (params.status) queryParams.append("status", params.status);
    if (params.courseId)
      queryParams.append("courseId", params.courseId.toString());
    if (params.centerId)
      queryParams.append("centerId", params.centerId.toString());
    if (params.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

    const url = `${this.baseUrl}?${queryParams.toString()}`;
    return apiService.get(url);
  }

  /**
   * Get a single cohort by ID
   */
  async getCohort(id: number): Promise<BaseResponse<Cohort>> {
    return apiService.get(`${this.baseUrl}/${id}`);
  }

  /**
   * Create a new cohort
   */
  async createCohort(data: CreateCohortRequest): Promise<BaseResponse<Cohort>> {
    return apiService.post(this.baseUrl, data);
  }

  /**
   * Update an existing cohort
   */
  async updateCohort(
    id: number,
    data: UpdateCohortRequest
  ): Promise<BaseResponse<Cohort>> {
    const url = `${this.baseUrl}/${id}`;
    return apiService.patch(url, data);
  }

  /**
   * Delete a cohort (soft delete)
   */
  async deleteCohort(id: number): Promise<BaseResponse<{ message: string }>> {
    return apiService.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Restore a soft-deleted cohort
   */
  async restoreCohort(id: number): Promise<BaseResponse<Cohort>> {
    return apiService.post(`${this.baseUrl}/${id}/restore`);
  }

  /**
   * Permanently delete a cohort
   */
  async forceDeleteCohort(
    id: number
  ): Promise<BaseResponse<{ message: string }>> {
    return apiService.delete(`${this.baseUrl}/${id}/force`);
  }
}

export const cohortService = new CohortService();
