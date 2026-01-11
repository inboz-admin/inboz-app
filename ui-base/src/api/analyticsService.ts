import { apiService } from "./apiService";
import type { BaseResponse } from "./types";
import type {
  KpiStats,
  UserWiseAnalytics,
  AnalyticsQueryParams,
  CampaignAnalytics,
  EmailStatusBreakdown,
  CampaignStatusDistribution,
  PaginatedAnalyticsResponse,
  AnalyticsUser,
  OrganizationAnalytics,
} from "./analyticsTypes";

class AnalyticsService {
  private baseUrl = "/analytics";

  /**
   * Get KPI statistics
   * @param params Optional date range parameters
   */
  async getKpiStats(
    params?: AnalyticsQueryParams
  ): Promise<BaseResponse<KpiStats>> {
    const queryParams: Record<string, string> = {};
    if (params?.startDate) {
      queryParams.startDate = params.startDate;
    }
    if (params?.endDate) {
      queryParams.endDate = params.endDate;
    }
    if (params?.organizationId) {
      queryParams.organizationId = params.organizationId;
    }
    if (params?.userId) {
      queryParams.userId = params.userId;
    }
    if (params?.platformView !== undefined) {
      queryParams.platformView = params.platformView.toString();
    }
    return apiService.get<KpiStats>(`${this.baseUrl}/kpis`, queryParams);
  }

  /**
   * Get user-wise analytics
   * @param params Optional date range and pagination parameters
   */
  async getUserWiseAnalytics(
    params?: AnalyticsQueryParams
  ): Promise<BaseResponse<PaginatedAnalyticsResponse<UserWiseAnalytics>>> {
    const queryParams: Record<string, string> = {};
    if (params?.startDate) {
      queryParams.startDate = params.startDate;
    }
    if (params?.endDate) {
      queryParams.endDate = params.endDate;
    }
    if (params?.organizationId) {
      queryParams.organizationId = params.organizationId;
    }
    if (params?.page) {
      queryParams.page = params.page.toString();
    }
    if (params?.limit) {
      queryParams.limit = params.limit.toString();
    }
    if (params?.userId) {
      queryParams.userId = params.userId;
    }
    return apiService.get<PaginatedAnalyticsResponse<UserWiseAnalytics>>(
      `${this.baseUrl}/user-wise`,
      queryParams
    );
  }

  /**
   * Get campaign-wise analytics
   * @param params Optional date range, pagination, and status filter parameters
   */
  async getCampaignWiseAnalytics(
    params?: AnalyticsQueryParams
  ): Promise<BaseResponse<PaginatedAnalyticsResponse<CampaignAnalytics>>> {
    const queryParams: Record<string, string | string[]> = {};
    if (params?.startDate) {
      queryParams.startDate = params.startDate;
    }
    if (params?.endDate) {
      queryParams.endDate = params.endDate;
    }
    if (params?.organizationId) {
      queryParams.organizationId = params.organizationId;
    }
    if (params?.page) {
      queryParams.page = params.page.toString();
    }
    if (params?.limit) {
      queryParams.limit = params.limit.toString();
    }
    // Default to COMPLETED only if no status filter provided
    if (params?.status && params.status.length > 0) {
      queryParams.status = params.status;
    } else {
      queryParams.status = ['COMPLETED'];
    }
    if (params?.userId) {
      queryParams.userId = params.userId;
    }
    return apiService.get<PaginatedAnalyticsResponse<CampaignAnalytics>>(
      `${this.baseUrl}/campaigns`,
      queryParams
    );
  }

  /**
   * Get email status breakdown
   * @param params Optional date range parameters
   */
  async getEmailStatusBreakdown(
    params?: AnalyticsQueryParams
  ): Promise<BaseResponse<EmailStatusBreakdown>> {
    const queryParams: Record<string, string> = {};
    if (params?.startDate) {
      queryParams.startDate = params.startDate;
    }
    if (params?.endDate) {
      queryParams.endDate = params.endDate;
    }
    if (params?.organizationId) {
      queryParams.organizationId = params.organizationId;
    }
    return apiService.get<EmailStatusBreakdown>(
      `${this.baseUrl}/email-status`,
      queryParams
    );
  }

  /**
   * Get campaign status distribution
   * @param params Optional date range parameters
   */
  async getCampaignStatusDistribution(
    params?: AnalyticsQueryParams
  ): Promise<BaseResponse<CampaignStatusDistribution>> {
    const queryParams: Record<string, string> = {};
    if (params?.startDate) {
      queryParams.startDate = params.startDate;
    }
    if (params?.endDate) {
      queryParams.endDate = params.endDate;
    }
    if (params?.organizationId) {
      queryParams.organizationId = params.organizationId;
    }
    return apiService.get<CampaignStatusDistribution>(
      `${this.baseUrl}/campaign-status`,
      queryParams
    );
  }

  /**
   * Get list of users with analytics data (for filter dropdown)
   * @param params Optional organizationId parameter
   */
  async getUsersWithAnalytics(
    params?: { organizationId?: string }
  ): Promise<BaseResponse<AnalyticsUser[]>> {
    const queryParams: Record<string, string> = {};
    if (params?.organizationId) {
      queryParams.organizationId = params.organizationId;
    }
    return apiService.get<AnalyticsUser[]>(
      `${this.baseUrl}/users`,
      queryParams
    );
  }

  /**
   * Get email messages for a specific user with campaign information
   * @param params User ID, organization ID, event type, pagination, and date range
   */
  async getUserEmails(
    params: {
      userId: string;
      organizationId?: string;
      eventType?: string;
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<BaseResponse<PaginatedAnalyticsResponse<any>>> {
    const queryParams: Record<string, string> = {};
    if (params.userId) queryParams.userId = params.userId;
    if (params.organizationId) queryParams.organizationId = params.organizationId;
    if (params.eventType) queryParams.eventType = params.eventType;
    if (params.page) queryParams.page = params.page.toString();
    if (params.limit) queryParams.limit = params.limit.toString();
    if (params.startDate) queryParams.startDate = params.startDate;
    if (params.endDate) queryParams.endDate = params.endDate;

    return apiService.get<PaginatedAnalyticsResponse<any>>(
      `${this.baseUrl}/user-emails`,
      queryParams
    );
  }

  /**
   * Get organization breakdown for platform analytics
   * @param params Optional date range and pagination parameters
   */
  async getOrganizationBreakdown(
    params?: AnalyticsQueryParams
  ): Promise<BaseResponse<PaginatedAnalyticsResponse<OrganizationAnalytics>>> {
    const queryParams: Record<string, string> = {};
    if (params?.startDate) {
      queryParams.startDate = params.startDate;
    }
    if (params?.endDate) {
      queryParams.endDate = params.endDate;
    }
    if (params?.page) {
      queryParams.page = params.page.toString();
    }
    if (params?.limit) {
      queryParams.limit = params.limit.toString();
    }
    return apiService.get<PaginatedAnalyticsResponse<OrganizationAnalytics>>(
      `${this.baseUrl}/organization-breakdown`,
      queryParams
    );
  }
}

export const analyticsService = new AnalyticsService();

