// Course entity types and interfaces

export const CourseStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  DRAFT: "DRAFT",
} as const;

export type CourseStatus = (typeof CourseStatus)[keyof typeof CourseStatus];

export interface Course {
  id: number;
  name: string;
  description?: string;
  duration?: number; // in weeks
  price?: number;
  status: CourseStatus;
  centerId?: number;
  center?: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateCourseRequest {
  name: string;
  description?: string;
  duration?: number;
  price?: number;
  status?: CourseStatus;
  centerId?: number;
}

export interface UpdateCourseRequest {
  name?: string;
  description?: string;
  duration?: number;
  price?: number;
  status?: CourseStatus;
  centerId?: number;
}

export interface GetCoursesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CourseStatus;
  centerId?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface GetCoursesResponse {
  courses: Course[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Helper functions for course data
export const CourseHelpers = {
  isGetCoursesSuccess: (
    response: unknown
  ): response is { success: true; data: GetCoursesResponse } => {
    return (
      typeof response === "object" &&
      response !== null &&
      "success" in response &&
      (response as { success: unknown }).success === true &&
      "data" in response &&
      typeof (response as { data: unknown }).data === "object" &&
      (response as { data: { courses?: unknown } }).data !== null &&
      "courses" in (response as { data: { courses?: unknown } }).data
    );
  },

  getCoursesFromResponse: (response: {
    data: GetCoursesResponse;
  }): Course[] => {
    return response.data.courses;
  },

  getPaginationFromResponse: (response: { data: GetCoursesResponse }) => {
    return response.data.pagination;
  },

  isCreateCourseSuccess: (
    response: unknown
  ): response is { success: true; data: Course } => {
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

  isUpdateCourseSuccess: (
    response: unknown
  ): response is { success: true; data: Course } => {
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

  isDeleteCourseSuccess: (
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

  getCourseFromResponse: (response: { data: Course }): Course => {
    return response.data;
  },
};

// Status display names
export const CourseStatusLabels: Record<CourseStatus, string> = {
  [CourseStatus.ACTIVE]: "Active",
  [CourseStatus.INACTIVE]: "Inactive",
  [CourseStatus.DRAFT]: "Draft",
};

// Status colors for UI
export const CourseStatusColors: Record<CourseStatus, string> = {
  [CourseStatus.ACTIVE]: "text-green-600 bg-green-50",
  [CourseStatus.INACTIVE]: "text-gray-600 bg-gray-50",
  [CourseStatus.DRAFT]: "text-yellow-600 bg-yellow-50",
};
