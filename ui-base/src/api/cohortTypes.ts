// Cohort entity types and interfaces

export const CohortStatus = {
  PLANNED: "PLANNED",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type CohortStatus = (typeof CohortStatus)[keyof typeof CohortStatus];

export interface Cohort {
  id: number;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  maxStudents?: number;
  status: CohortStatus;
  courseId?: number;
  course?: {
    id: number;
    name: string;
  };
  centerId?: number;
  center?: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateCohortRequest {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  maxStudents?: number;
  status?: CohortStatus;
  courseId?: number;
  centerId?: number;
}

export interface UpdateCohortRequest {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  maxStudents?: number;
  status?: CohortStatus;
  courseId?: number;
  centerId?: number;
}

export interface GetCohortsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CohortStatus;
  courseId?: number;
  centerId?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface GetCohortsResponse {
  cohorts: Cohort[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Helper functions for cohort data
export const CohortHelpers = {
  isGetCohortsSuccess: (
    response: unknown
  ): response is { success: true; data: GetCohortsResponse } => {
    return (
      typeof response === "object" &&
      response !== null &&
      "success" in response &&
      (response as { success: unknown }).success === true &&
      "data" in response &&
      typeof (response as { data: unknown }).data === "object" &&
      (response as { data: { cohorts?: unknown } }).data !== null &&
      "cohorts" in (response as { data: { cohorts?: unknown } }).data
    );
  },

  getCohortsFromResponse: (response: {
    data: GetCohortsResponse;
  }): Cohort[] => {
    return response.data.cohorts;
  },

  getPaginationFromResponse: (response: { data: GetCohortsResponse }) => {
    return response.data.pagination;
  },

  isCreateCohortSuccess: (
    response: unknown
  ): response is { success: true; data: Cohort } => {
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

  isUpdateCohortSuccess: (
    response: unknown
  ): response is { success: true; data: Cohort } => {
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

  isDeleteCohortSuccess: (
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

  getCohortFromResponse: (response: { data: Cohort }): Cohort => {
    return response.data;
  },
};

// Status display names
export const CohortStatusLabels: Record<CohortStatus, string> = {
  [CohortStatus.PLANNED]: "Planned",
  [CohortStatus.ACTIVE]: "Active",
  [CohortStatus.COMPLETED]: "Completed",
  [CohortStatus.CANCELLED]: "Cancelled",
};

// Status colors for UI
export const CohortStatusColors: Record<CohortStatus, string> = {
  [CohortStatus.PLANNED]: "text-blue-600 bg-blue-50",
  [CohortStatus.ACTIVE]: "text-green-600 bg-green-50",
  [CohortStatus.COMPLETED]: "text-gray-600 bg-gray-50",
  [CohortStatus.CANCELLED]: "text-red-600 bg-red-50",
};
