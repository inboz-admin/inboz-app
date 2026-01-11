// Student entity types and interfaces

export const StudentStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  GRADUATED: "GRADUATED",
  DROPPED: "DROPPED",
} as const;

export type StudentStatus = (typeof StudentStatus)[keyof typeof StudentStatus];

export interface Student {
  id: number;
  email: string;
  name: string;
  phone?: string;
  status: StudentStatus;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  avatarUrl?: string;
  cohortId?: number;
  cohort?: {
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

export interface CreateStudentRequest {
  email: string;
  password: string | null;
  name: string;
  phone?: string;
  status?: StudentStatus;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  avatarUrl?: string;
  cohortId?: number;
  centerId?: number;
}

export interface UpdateStudentRequest {
  email?: string;
  name?: string;
  phone?: string;
  status?: StudentStatus;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  avatarUrl?: string;
  cohortId?: number;
  centerId?: number;
}

export interface GetStudentsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: StudentStatus;
  cohortId?: number;
  centerId?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface GetStudentsResponse {
  students: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Helper functions for student data
export const StudentHelpers = {
  isGetStudentsSuccess: (
    response: unknown
  ): response is { success: true; data: GetStudentsResponse } => {
    return (
      typeof response === "object" &&
      response !== null &&
      "success" in response &&
      (response as { success: unknown }).success === true &&
      "data" in response &&
      typeof (response as { data: unknown }).data === "object" &&
      (response as { data: { students?: unknown } }).data !== null &&
      "students" in (response as { data: { students?: unknown } }).data
    );
  },

  getStudentsFromResponse: (response: {
    data: GetStudentsResponse;
  }): Student[] => {
    return response.data.students;
  },

  getPaginationFromResponse: (response: { data: GetStudentsResponse }) => {
    return response.data.pagination;
  },

  isCreateStudentSuccess: (
    response: unknown
  ): response is { success: true; data: Student } => {
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

  isUpdateStudentSuccess: (
    response: unknown
  ): response is { success: true; data: Student } => {
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

  isDeleteStudentSuccess: (
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

  getStudentFromResponse: (response: { data: Student }): Student => {
    return response.data;
  },
};

// Status display names
export const StudentStatusLabels: Record<StudentStatus, string> = {
  [StudentStatus.ACTIVE]: "Active",
  [StudentStatus.INACTIVE]: "Inactive",
  [StudentStatus.GRADUATED]: "Graduated",
  [StudentStatus.DROPPED]: "Dropped",
};

// Status colors for UI
export const StudentStatusColors: Record<StudentStatus, string> = {
  [StudentStatus.ACTIVE]: "text-green-600 bg-green-50",
  [StudentStatus.INACTIVE]: "text-gray-600 bg-gray-50",
  [StudentStatus.GRADUATED]: "text-blue-600 bg-blue-50",
  [StudentStatus.DROPPED]: "text-red-600 bg-red-50",
};
