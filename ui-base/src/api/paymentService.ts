import { apiService } from "./apiService";
import type { BaseResponse } from "./types";

export type BillingCycle = "MONTHLY" | "YEARLY";

export interface InitiatePaymentRequest {
  planId: string;
  billingCycle: BillingCycle;
  organizationId: string;
  paymentProvider?: "RAZORPAY" | "STRIPE";
  userCount?: number;
}

export interface InitiatePaymentResponse {
  order?: {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
    planName: string;
    planDescription?: string;
    billingCycle: string;
  };
  checkoutSession?: {
    id: string;
    url: string;
  };
  subscription?: {
    id: string;
    clientSecret: string | null;
    status: string;
  };
  pricingBreakdown: {
    basePricePerUser: number;
    volumeDiscountPercent: number;
    discountedPricePerUser: number;
    totalAmount: number;
    prorationDetails?: {
      daysRemaining: number;
      totalDays: number;
      proratedAmount: number;
      creditAmount?: number;
      chargeAmount?: number;
    };
  };
  pendingChanges: {
    planId: string;
    userCount: number;
    billingCycle: BillingCycle;
    operationType: 'TRIAL_TO_PAID' | 'UPGRADE' | 'ADD_USERS' | 'COMBINED';
    existingSubscriptionId?: string | null;
    existingUserCount?: number; // For display: existing users
    newUserCount?: number; // For display: new users being added
  };
  paymentProvider?: "RAZORPAY" | "STRIPE";
}

export interface VerifyPaymentRequest {
  orderId: string;
  paymentId: string;
  signature: string;
  organizationId: string;
  paymentProvider?: "RAZORPAY" | "STRIPE";
  pendingChanges: {
    planId: string;
    userCount: number;
    billingCycle: BillingCycle;
    operationType: 'TRIAL_TO_PAID' | 'UPGRADE' | 'ADD_USERS' | 'COMBINED';
    existingSubscriptionId?: string | null;
    existingUserCount?: number; // For display: existing users
    newUserCount?: number; // For display: new users being added
  };
  pricingBreakdown: {
    basePricePerUser: number;
    volumeDiscountPercent: number;
    discountedPricePerUser: number;
    totalAmount: number;
    prorationDetails?: any;
  };
}

export interface CancelSubscriptionRequest {
  reason?: string;
}

class PaymentService {
  private baseUrl = "/subscriptions";

  /**
   * Initiate payment flow: User selects plan → Create subscription → Generate invoice → Return Razorpay order
   */
  async initiatePayment(
    data: InitiatePaymentRequest
  ): Promise<BaseResponse<InitiatePaymentResponse>> {
    return apiService.post(`${this.baseUrl}/initiate-payment`, data);
  }

  /**
   * Verify payment after Razorpay callback
   */
  async verifyPayment(
    data: VerifyPaymentRequest
  ): Promise<BaseResponse<{ success: boolean; message: string; subscriptionId: string; invoiceId: string }>> {
    return apiService.post(`${this.baseUrl}/verify-payment`, data);
  }

  /**
   * Cancel subscription (remains active until end of paid period)
   */
  async cancelSubscription(
    subscriptionId: string,
    data?: CancelSubscriptionRequest
  ): Promise<BaseResponse<any>> {
    return apiService.post(`${this.baseUrl}/${subscriptionId}/cancel`, data || {});
  }

  /**
   * Get subscription invoices
   */
  async getSubscriptionInvoices(
    subscriptionId: string,
    params?: {
      page?: number;
      limit?: number;
      status?: string;
    }
  ): Promise<BaseResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.status) queryParams.append("status", params.status);

    const url = queryParams.toString()
      ? `${this.baseUrl}/${subscriptionId}/invoices?${queryParams.toString()}`
      : `${this.baseUrl}/${subscriptionId}/invoices`;

    return apiService.get(url);
  }
}

export const paymentService = new PaymentService();



