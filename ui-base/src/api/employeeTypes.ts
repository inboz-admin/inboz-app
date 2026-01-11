// Employee entity types and interfaces

export const EmployeeRole = {
  INSTRUCTOR: "INSTRUCTOR",
  OPERATOR: "OPERATOR",
  ADMIN: "ADMIN",
} as const;

export type EmployeeRole = (typeof EmployeeRole)[keyof typeof EmployeeRole];

export const EmployeeStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

export type EmployeeStatus =
  (typeof EmployeeStatus)[keyof typeof EmployeeStatus];

export interface Employee {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  qualifications?: string;
  salary?: number;
  description?: string;
  avatarUrl?: string;
  centerId?: number;
  center?: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateEmployeeRequest {
  email: string;
  password: string | null;
  name: string;
  phone?: string;
  role: EmployeeRole;
  status?: EmployeeStatus;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  qualifications?: string;
  salary?: number;
  description?: string;
  avatarUrl?: string;
  centerId?: number;
}

export interface UpdateEmployeeRequest {
  email?: string;
  name?: string;
  phone?: string;
  role?: EmployeeRole;
  status?: EmployeeStatus;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  qualifications?: string;
  salary?: number;
  description?: string;
  avatarUrl?: string;
  centerId?: number;
}

export interface GetEmployeesParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: EmployeeRole;
  status?: EmployeeStatus;
  centerId?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface GetEmployeesResponse {
  employees: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Helper functions for employee data
export const EmployeeHelpers = {
  isGetEmployeesSuccess: (
    response: unknown
  ): response is { success: true; data: GetEmployeesResponse } => {
    return (
      typeof response === "object" &&
      response !== null &&
      "success" in response &&
      (response as { success: unknown }).success === true &&
      "data" in response &&
      typeof (response as { data: unknown }).data === "object" &&
      (response as { data: { employees?: unknown } }).data !== null &&
      "employees" in (response as { data: { employees?: unknown } }).data
    );
  },

  getEmployeesFromResponse: (response: {
    data: GetEmployeesResponse;
  }): Employee[] => {
    return response.data.employees;
  },

  getPaginationFromResponse: (response: { data: GetEmployeesResponse }) => {
    return response.data.pagination;
  },

  isCreateEmployeeSuccess: (
    response: unknown
  ): response is { success: true; data: Employee } => {
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

  isUpdateEmployeeSuccess: (
    response: unknown
  ): response is { success: true; data: Employee } => {
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

  isDeleteEmployeeSuccess: (
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

  getEmployeeFromResponse: (response: { data: Employee }): Employee => {
    return response.data;
  },
};

// Role display names
export const EmployeeRoleLabels: Record<EmployeeRole, string> = {
  [EmployeeRole.INSTRUCTOR]: "Instructor",
  [EmployeeRole.OPERATOR]: "Operator",
  [EmployeeRole.ADMIN]: "Admin",
};

// Status display names
export const EmployeeStatusLabels: Record<EmployeeStatus, string> = {
  [EmployeeStatus.ACTIVE]: "Active",
  [EmployeeStatus.INACTIVE]: "Inactive",
  [EmployeeStatus.SUSPENDED]: "Suspended",
};

// Status colors for UI
export const EmployeeStatusColors: Record<EmployeeStatus, string> = {
  [EmployeeStatus.ACTIVE]: "text-green-600 bg-green-50",
  [EmployeeStatus.INACTIVE]: "text-gray-600 bg-gray-50",
  [EmployeeStatus.SUSPENDED]: "text-red-600 bg-red-50",
};
