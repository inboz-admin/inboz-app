// Audit log entity types and interfaces

export const AuditAction = {
  CREATE: "CREATE",
  READ: "READ",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  EXPORT: "EXPORT",
  IMPORT: "IMPORT",
  SYSTEM: "SYSTEM",
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const AuditModule = {
  AUTH: "AUTH",
  ORGANIZATION: "ORGANIZATION",
  CENTER: "CENTER",
  EMPLOYEE: "EMPLOYEE",
  STUDENT: "STUDENT",
  COURSE: "COURSE",
  COHORT: "COHORT",
  ENROLLMENT: "ENROLLMENT",
  ENQUIRY: "ENQUIRY",
  PAYMENT: "PAYMENT",
  FEEDBACK: "FEEDBACK",
  AUDIT: "AUDIT",
} as const;

export type AuditModule = (typeof AuditModule)[keyof typeof AuditModule];

export const AuditStatus = {
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  PENDING: "PENDING",
} as const;

export type AuditStatus = (typeof AuditStatus)[keyof typeof AuditStatus];

export interface AuditLog {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  deletedBy?: string | null;
  organizationId?: string | null;
  performedByUserId?: string | null;
  module: string;
  action: string;
  recordId?: string | null;
  details?: Record<string, any>;
  description?: string | null;
  eventTimestamp: string;
  performedByUser?: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    avatarUrl?: string | null;
  };
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  search?: string;
  action?: AuditAction;
  module?: AuditModule;
  status?: AuditStatus;
  organizationId?: string;
  userId?: string;
  entityId?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedAuditLogs {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Helper functions for audit log data
export const AuditLogHelpers = {
  isGetAuditLogsSuccess: (
    response: unknown
  ): response is { success: true; data: PaginatedAuditLogs } => {
    return (
      typeof response === "object" &&
      response !== null &&
      "success" in response &&
      (response as { success: unknown }).success === true &&
      "data" in response &&
      typeof (response as { data: unknown }).data === "object" &&
      (response as { data: { data?: unknown } }).data !== null &&
      "data" in (response as { data: { data?: unknown } }).data
    );
  },

  getAuditLogsFromResponse: (response: {
    data: PaginatedAuditLogs;
  }): AuditLog[] => {
    return response.data.data;
  },

  getPaginationFromResponse: (response: { data: PaginatedAuditLogs }) => {
    return {
      total: response.data.total,
      page: response.data.page,
      limit: response.data.limit,
      totalPages: response.data.totalPages,
    };
  },
};

// Audit action display names
export const AuditActionLabels: Record<AuditAction, string> = {
  [AuditAction.CREATE]: "CREATE",
  [AuditAction.READ]: "READ",
  [AuditAction.UPDATE]: "UPDATE",
  [AuditAction.DELETE]: "DELETE",
  [AuditAction.LOGIN]: "LOGIN",
  [AuditAction.LOGOUT]: "LOGOUT",
  [AuditAction.EXPORT]: "EXPORT",
  [AuditAction.IMPORT]: "IMPORT",
  [AuditAction.SYSTEM]: "SYSTEM",
};

// Audit module display names
export const AuditModuleLabels: Record<AuditModule, string> = {
  [AuditModule.AUTH]: "Authentication",
  [AuditModule.ORGANIZATION]: "Organization",
  [AuditModule.CENTER]: "Center",
  [AuditModule.EMPLOYEE]: "Employee",
  [AuditModule.STUDENT]: "Student",
  [AuditModule.COURSE]: "Course",
  [AuditModule.COHORT]: "Cohort",
  [AuditModule.ENROLLMENT]: "Enrollment",
  [AuditModule.ENQUIRY]: "Enquiry",
  [AuditModule.PAYMENT]: "Payment",
  [AuditModule.FEEDBACK]: "Feedback",
  [AuditModule.AUDIT]: "Audit",
};

// Audit status display names
export const AuditStatusLabels: Record<AuditStatus, string> = {
  [AuditStatus.SUCCESS]: "SUCCESS",
  [AuditStatus.FAILED]: "FAILED",
  [AuditStatus.PENDING]: "PENDING",
};

// Audit status colors for UI (light backgrounds)
export const AuditStatusColors: Record<AuditStatus, string> = {
  [AuditStatus.SUCCESS]:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  [AuditStatus.FAILED]:
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  [AuditStatus.PENDING]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

// Audit action colors for UI (light backgrounds)
export const AuditActionColors: Record<AuditAction, string> = {
  [AuditAction.CREATE]:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  [AuditAction.READ]:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  [AuditAction.UPDATE]:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  [AuditAction.DELETE]:
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  [AuditAction.LOGIN]:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  [AuditAction.LOGOUT]:
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  [AuditAction.EXPORT]:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  [AuditAction.IMPORT]:
    "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  [AuditAction.SYSTEM]:
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};
