import { apiService } from "./apiService";
import type {
  Subscription,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  GetSubscriptionsParams,
  SubscriptionPlan,
} from "./subscriptionTypes";
import type { BaseResponse, PaginatedData } from "./types";

class SubscriptionService {
  private baseUrl = "/subscriptions";
  private plansBaseUrl = "/subscriptions/plans";

  /**
   * Get all subscriptions with pagination and filtering
   */
  async getSubscriptions(
    params: GetSubscriptionsParams = {}
  ): Promise<BaseResponse<PaginatedData<Subscription>>> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.search) queryParams.append("search", params.search);
    if (params.status) queryParams.append("status", params.status);
    if (params.organizationId)
      queryParams.append("organizationId", params.organizationId);
    if (params.planId) queryParams.append("planId", params.planId);
    if (params.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

    const url = `${this.baseUrl}?${queryParams.toString()}`;
    return apiService.get(url);
  }

  /**
   * Get a single subscription by ID
   */
  async getSubscription(
    id: string,
    organizationId?: string
  ): Promise<BaseResponse<Subscription>> {
    const queryParams = new URLSearchParams();
    if (organizationId) {
      queryParams.append("organizationId", organizationId);
    }
    const url = queryParams.toString()
      ? `${this.baseUrl}/${id}?${queryParams.toString()}`
      : `${this.baseUrl}/${id}`;
    return apiService.get(url);
  }

  /**
   * Create a new subscription
   */
  async createSubscription(
    data: CreateSubscriptionRequest
  ): Promise<BaseResponse<Subscription>> {
    return apiService.post(this.baseUrl, data);
  }

  /**
   * Update an existing subscription
   */
  async updateSubscription(
    id: string,
    data: UpdateSubscriptionRequest
  ): Promise<BaseResponse<Subscription>> {
    return apiService.patch(`${this.baseUrl}/${id}`, data);
  }

  /**
   * Cancel a subscription (remains active until end of paid period)
   */
  async cancelSubscription(
    id: string,
    reason?: string
  ): Promise<BaseResponse<Subscription>> {
    return apiService.post(`${this.baseUrl}/${id}/cancel`, {
      reason,
    });
  }

  /**
   * Delete a subscription
   */
  async deleteSubscription(
    id: string
  ): Promise<BaseResponse<void>> {
    return apiService.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Get all subscription plans
   */
  async getSubscriptionPlans(params: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    isPublic?: boolean;
  } = {}): Promise<BaseResponse<PaginatedData<SubscriptionPlan>>> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.search) queryParams.append("search", params.search);
    if (params.isActive !== undefined)
      queryParams.append("isActive", params.isActive.toString());
    if (params.isPublic !== undefined)
      queryParams.append("isPublic", params.isPublic.toString());

    const url = `${this.plansBaseUrl}?${queryParams.toString()}`;
    return apiService.get(url);
  }

  /**
   * Get a single subscription plan by ID
   */
  async getSubscriptionPlan(
    id: string
  ): Promise<BaseResponse<SubscriptionPlan>> {
    return apiService.get(`${this.plansBaseUrl}/${id}`);
  }

  /**
   * Get active subscription for an organization
   */
  async getActiveSubscriptionByOrganization(
    organizationId: string
  ): Promise<BaseResponse<Subscription | null>> {
    return apiService.get(`${this.baseUrl}/organization/${organizationId}/active`);
  }

  /**
   * Get trial status for an organization
   */
  async getTrialStatus(
    organizationId: string
  ): Promise<BaseResponse<{
    isTrial: boolean;
    isExpired: boolean;
    daysRemaining: number;
    trialStart?: string;
    trialEnd?: string;
  }>> {
    return apiService.get(`${this.baseUrl}/organization/${organizationId}/trial-status`);
  }

  /**
   * Calculate pricing for a plan with user count
   */
  async calculatePricing(data: {
    planId: string;
    userCount: number;
    billingCycle?: string;
  }): Promise<BaseResponse<any>> {
    return apiService.post(`${this.baseUrl}/calculate-pricing`, data);
  }

  /**
   * Calculate upgrade pricing with proration details
   */
  async calculateUpgradePricing(data: {
    planId: string;
    userCount: number;
    billingCycle?: string;
    organizationId: string;
  }): Promise<BaseResponse<any>> {
    return apiService.post(`${this.baseUrl}/calculate-upgrade-pricing`, data);
  }

  /**
   * Schedule user count reduction for next billing cycle (no credit)
   */
  async scheduleUserCountReduction(
    id: string,
    userCount: number,
    reason?: string
  ): Promise<BaseResponse<Subscription>> {
    return apiService.post(`${this.baseUrl}/${id}/schedule-user-reduction`, {
      userCount,
      reason,
    });
  }

  /**
   * Schedule plan downgrade for next billing cycle (no credit)
   */
  async schedulePlanDowngrade(
    id: string,
    planId: string,
    reason?: string
  ): Promise<BaseResponse<Subscription>> {
    return apiService.post(`${this.baseUrl}/${id}/schedule-downgrade`, {
      planId,
      reason,
    });
  }

  /**
   * Create Stripe Customer Portal session to view invoices and billing history
   */
  async createCustomerPortal(data: {
    organizationId: string;
    returnUrl?: string;
  }): Promise<BaseResponse<{ url: string }>> {
    return apiService.post(`${this.baseUrl}/stripe/customer-portal`, data);
  }

  /**
   * Admin upgrade subscription (SUPERADMIN only)
   * Upgrades organization subscription with selected plan and user count, creates zero-amount invoice
   */
  async adminUpgradeSubscription(data: {
    organizationId: string;
    planId: string;
    userCount: number;
    billingCycle?: "MONTHLY" | "YEARLY";
  }): Promise<BaseResponse<Subscription>> {
    return apiService.post(`${this.baseUrl}/admin/upgrade`, data);
  }

  /**
   * Admin update user count (SUPERADMIN only)
   * Updates organization subscription user count, creates zero-amount invoice
   */
  async adminUpdateUserCount(data: {
    organizationId: string;
    userCount: number;
  }): Promise<BaseResponse<Subscription>> {
    return apiService.patch(`${this.baseUrl}/admin/user-count`, data);
  }
}

const subscriptionService = new SubscriptionService();

export { subscriptionService };

























