// User entity types and interfaces

export const UserRole = {
  USER: "USER",
  ADMIN: "ADMIN",
  SUPERADMIN: "SUPERADMIN",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export interface User {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: string;
  settings?: any;
  socialProvider?: string;
  socialId?: string;
  organization?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateUserRequest {
  organizationId: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role?: UserRole;
  status?: UserStatus;
  settings?: any;
  socialId?: string;
  socialProvider?: string;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role?: UserRole;
  status?: UserStatus;
  settings?: any;
  socialId?: string;
  socialProvider?: string;
  lastLoginAt?: string;
}

export interface InviteUserRequest {
  email: string;
  organizationId: string;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  organizationId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface GetUsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Helper functions for user data
export const UserHelpers = {
  isGetUsersSuccess: (
    response: unknown
  ): response is { success: true; data: GetUsersResponse } => {
    return (
      typeof response === "object" &&
      response !== null &&
      "success" in response &&
      (response as { success: unknown }).success === true &&
      "data" in response &&
      typeof (response as { data: unknown }).data === "object" &&
      (response as { data: { users?: unknown } }).data !== null &&
      "users" in (response as { data: { users?: unknown } }).data
    );
  },

  getUsersFromResponse: (response: { data: GetUsersResponse }): User[] => {
    return response.data.users;
  },

  getPaginationFromResponse: (response: { data: GetUsersResponse }) => {
    return response.data.pagination;
  },

  isCreateUserSuccess: (
    response: unknown
  ): response is { success: true; data: User } => {
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

  isUpdateUserSuccess: (
    response: unknown
  ): response is { success: true; data: User } => {
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

  isDeleteUserSuccess: (
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

  getUserFromResponse: (response: { data: User }): User => {
    return response.data;
  },
};

// Role display names (SUPERADMIN removed - only for employees)
export const UserRoleLabels: Record<UserRole, string> = {
  [UserRole.USER]: "User",
  [UserRole.ADMIN]: "Admin",
  // SUPERADMIN is only for employees, not regular users
  [UserRole.SUPERADMIN]: "Super Admin", // Kept for type compatibility but not used for users
};

// Status display names
export const UserStatusLabels: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: "Active",
  [UserStatus.INACTIVE]: "Inactive",
  [UserStatus.SUSPENDED]: "Suspended",
};

// Status colors for UI
export const UserStatusColors: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: "text-green-600 bg-green-50",
  [UserStatus.INACTIVE]: "text-gray-600 bg-gray-50",
  [UserStatus.SUSPENDED]: "text-red-600 bg-red-50",
};
