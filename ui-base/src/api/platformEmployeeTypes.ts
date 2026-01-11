// Platform Employee entity types and interfaces

export const PlatformEmployeeRole = {
  SUPERADMIN: "SUPERADMIN",
  SUPPORT: "SUPPORT",
} as const;

export type PlatformEmployeeRole =
  (typeof PlatformEmployeeRole)[keyof typeof PlatformEmployeeRole];

export const PlatformEmployeeStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

export type PlatformEmployeeStatus =
  (typeof PlatformEmployeeStatus)[keyof typeof PlatformEmployeeStatus];

export interface PlatformEmployee {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role: PlatformEmployeeRole;
  status: PlatformEmployeeStatus;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreatePlatformEmployeeRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: PlatformEmployeeRole;
  status?: PlatformEmployeeStatus;
  avatarUrl?: string;
}

export interface UpdatePlatformEmployeeRequest {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: PlatformEmployeeRole;
  status?: PlatformEmployeeStatus;
  avatarUrl?: string;
}

export interface GetPlatformEmployeesParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: PlatformEmployeeRole;
  status?: PlatformEmployeeStatus;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Role display names
export const PlatformEmployeeRoleLabels: Record<PlatformEmployeeRole, string> = {
  [PlatformEmployeeRole.SUPERADMIN]: "Super Admin",
  [PlatformEmployeeRole.SUPPORT]: "Support",
};

// Status display names
export const PlatformEmployeeStatusLabels: Record<PlatformEmployeeStatus, string> = {
  [PlatformEmployeeStatus.ACTIVE]: "Active",
  [PlatformEmployeeStatus.INACTIVE]: "Inactive",
  [PlatformEmployeeStatus.SUSPENDED]: "Suspended",
};

// Status colors for UI
export const PlatformEmployeeStatusColors: Record<PlatformEmployeeStatus, string> = {
  [PlatformEmployeeStatus.ACTIVE]: "text-green-600 bg-green-50",
  [PlatformEmployeeStatus.INACTIVE]: "text-gray-600 bg-gray-50",
  [PlatformEmployeeStatus.SUSPENDED]: "text-red-600 bg-red-50",
};


