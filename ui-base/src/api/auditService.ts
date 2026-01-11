import { apiService } from "./apiService";
import type { BaseResponse } from "./types";
import type {
  AuditLog,
  AuditLogFilters,
  PaginatedAuditLogs,
} from "./auditTypes";

/**
 * Audit Log Service
 * Handles all audit log-related API calls
 */
export class AuditLogService {
  private baseUrl = "/audit-logs";
  /**
   * Get paginated audit logs with optional filters
   */
  async getAuditLogs(
    filters: AuditLogFilters = {}
  ): Promise<BaseResponse<PaginatedAuditLogs>> {
    const queryParams = new URLSearchParams();

    // Add filters to query parameters
    if (filters.page) queryParams.append("page", filters.page.toString());
    if (filters.limit) queryParams.append("limit", filters.limit.toString());
    if (filters.search) queryParams.append("search", filters.search);
    if (filters.action) queryParams.append("action", filters.action);
    if (filters.module) queryParams.append("module", filters.module);
    if (filters.status) queryParams.append("status", filters.status);
    if (filters.organizationId)
      queryParams.append("organizationId", filters.organizationId);
    if (filters.userId) queryParams.append("userId", filters.userId.toString());
    if (filters.entityId)
      queryParams.append("entityId", filters.entityId.toString());
    if (filters.entityType)
      queryParams.append("entityType", filters.entityType);
    if (filters.startDate) queryParams.append("startDate", filters.startDate);
    if (filters.endDate) queryParams.append("endDate", filters.endDate);
    if (filters.sortBy) queryParams.append("sortBy", filters.sortBy);
    if (filters.sortOrder) queryParams.append("sortOrder", filters.sortOrder);

    const queryString = queryParams.toString();
    const url = `${this.baseUrl}${queryString ? `?${queryString}` : ""}`;

    return await apiService.get<PaginatedAuditLogs>(url);
  }

  /**
   * Get a specific audit log by ID
   */
  async getAuditLog(id: number): Promise<BaseResponse<AuditLog>> {
    return await apiService.get<AuditLog>(`${this.baseUrl}/${id}`);
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityAuditLogs(
    entityType: string,
    entityId: number,
    filters: Omit<AuditLogFilters, "entityType" | "entityId"> = {}
  ): Promise<BaseResponse<PaginatedAuditLogs>> {
    const queryParams = new URLSearchParams();

    // Add filters to query parameters
    if (filters.page) queryParams.append("page", filters.page.toString());
    if (filters.limit) queryParams.append("limit", filters.limit.toString());
    if (filters.search) queryParams.append("search", filters.search);
    if (filters.action) queryParams.append("action", filters.action);
    if (filters.module) queryParams.append("module", filters.module);
    if (filters.status) queryParams.append("status", filters.status);
    if (filters.userId) queryParams.append("userId", filters.userId.toString());
    if (filters.startDate) queryParams.append("startDate", filters.startDate);
    if (filters.endDate) queryParams.append("endDate", filters.endDate);
    if (filters.sortBy) queryParams.append("sortBy", filters.sortBy);
    if (filters.sortOrder) queryParams.append("sortOrder", filters.sortOrder);

    const queryString = queryParams.toString();
    const url = `${this.baseUrl}/entity/${entityType}/${entityId}${
      queryString ? `?${queryString}` : ""
    }`;

    return await apiService.get<PaginatedAuditLogs>(url);
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLogs(
    userId: number,
    filters: Omit<AuditLogFilters, "userId"> = {}
  ): Promise<BaseResponse<PaginatedAuditLogs>> {
    const queryParams = new URLSearchParams();

    // Add filters to query parameters
    if (filters.page) queryParams.append("page", filters.page.toString());
    if (filters.limit) queryParams.append("limit", filters.limit.toString());
    if (filters.search) queryParams.append("search", filters.search);
    if (filters.action) queryParams.append("action", filters.action);
    if (filters.module) queryParams.append("module", filters.module);
    if (filters.status) queryParams.append("status", filters.status);
    if (filters.entityId)
      queryParams.append("entityId", filters.entityId.toString());
    if (filters.entityType)
      queryParams.append("entityType", filters.entityType);
    if (filters.startDate) queryParams.append("startDate", filters.startDate);
    if (filters.endDate) queryParams.append("endDate", filters.endDate);
    if (filters.sortBy) queryParams.append("sortBy", filters.sortBy);
    if (filters.sortOrder) queryParams.append("sortOrder", filters.sortOrder);

    const queryString = queryParams.toString();
    const url = `${this.baseUrl}/user/${userId}${
      queryString ? `?${queryString}` : ""
    }`;

    return await apiService.get<PaginatedAuditLogs>(url);
  }

  /**
   * Export audit logs to CSV
   */
  async exportAuditLogs(
    filters: AuditLogFilters = {}
  ): Promise<BaseResponse<{ downloadUrl: string }>> {
    const queryParams = new URLSearchParams();

    // Add filters to query parameters
    if (filters.search) queryParams.append("search", filters.search);
    if (filters.action) queryParams.append("action", filters.action);
    if (filters.module) queryParams.append("module", filters.module);
    if (filters.status) queryParams.append("status", filters.status);
    if (filters.userId) queryParams.append("userId", filters.userId.toString());
    if (filters.entityId)
      queryParams.append("entityId", filters.entityId.toString());
    if (filters.entityType)
      queryParams.append("entityType", filters.entityType);
    if (filters.startDate) queryParams.append("startDate", filters.startDate);
    if (filters.endDate) queryParams.append("endDate", filters.endDate);

    const queryString = queryParams.toString();
    const url = `${this.baseUrl}/export${queryString ? `?${queryString}` : ""}`;

    return await apiService.get<{ downloadUrl: string }>(url);
  }

  /**
   * Create a new audit log entry
   */
  async createAuditLog(
    data: {
      organizationId?: string;
      performedByUserId?: string;
      module: string;
      action?: string;
      recordId?: string;
      details?: any;
      description?: string;
      eventTimestamp?: string;
    }
  ): Promise<BaseResponse<AuditLog>> {
    return await apiService.post<AuditLog>(this.baseUrl, data);
  }
}

// Export a singleton instance
export const auditLogService = new AuditLogService();
