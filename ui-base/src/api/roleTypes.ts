// Role entity types and interfaces for RBAC

export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: Permission[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface Permission {
  id: number;
  action: string;
  resource: string;
  module: string;
  description?: string;
}

export interface RoleAction {
  id: number;
  roleName: string;
  action: string;
  module: string;
  resource?: string;
  isAllowed: boolean;
  createdAt: string;
  updatedAt: string;
}

// Action types as const assertions for all possible actions
export const ActionType = {
  CREATE: "CREATE",
  READ: "READ",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  LIST: "LIST",
  EXPORT: "EXPORT",
  IMPORT: "IMPORT",
  VIEW: "VIEW",
  EDIT: "EDIT",
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  PUBLISH: "PUBLISH",
  ARCHIVE: "ARCHIVE",
  RESTORE: "RESTORE",
} as const;

export type ActionType = (typeof ActionType)[keyof typeof ActionType];

// Module names as const assertions for all possible modules
export const ModuleName = {
  CENTER: "CENTERS",
  EMPLOYEE: "EMPLOYEES",
  STUDENT: "STUDENTS",
  COURSE: "COURSES",
  COHORT: "COHORTS",
  CLASS: "CLASSES",
  ENROLLMENT: "ENROLLMENTS",
  ENQUIRY: "ENQUIRIES",
  PAYMENT: "PAYMENTS",
  FEEDBACK: "FEEDBACKS",
  EXPENSES: "EXPENSES",
  ANALYTICS: "ANALYTICS",
  ROLE: "ROLES",
  ORGANIZATION: "ORGANIZATIONS",
  USER: "USERS",
  CONTACT: "CONTACTS",
  TEMPLATE: "TEMPLATES",
  CAMPAIGN: "CAMPAIGNS",
  SUBSCRIPTION: "SUBSCRIPTIONS",
  INVOICE: "INVOICES",
  DASHBOARD: "DASHBOARDS",
  REPORTS: "REPORTS",
  SETTINGS: "SETTINGS",
  AUDIT: "AUDITS",
  AUDITLOGS: "AUDITLOGS",
  NOTIFICATION: "NOTIFICATIONS",
  PROFILE: "PROFILES",
} as const;

export type ModuleName = (typeof ModuleName)[keyof typeof ModuleName];

// Response type for module actions API
export interface ModuleActionsResponse {
  actions: ActionType[];
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions?: number[]; // Permission IDs
  isActive?: boolean;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: number[]; // Permission IDs
  isActive?: boolean;
}

export interface GetRolesParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
