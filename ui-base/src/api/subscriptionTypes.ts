// Subscription entity types and interfaces

export const SubscriptionStatus = {
  ACTIVE: "ACTIVE",
  CANCELLED: "CANCELLED",
  PAST_DUE: "PAST_DUE",
  UNPAID: "UNPAID",
  INCOMPLETE: "INCOMPLETE",
  TRIAL: "TRIAL",
  TRIALING: "TRIALING",
} as const;

export type SubscriptionStatus =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const BillingCycle = {
  MONTHLY: "MONTHLY",
  YEARLY: "YEARLY",
} as const;

export type BillingCycle = (typeof BillingCycle)[keyof typeof BillingCycle];

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  pricePerUserMonthly?: number; // Per-user pricing
  pricePerUserYearly?: number; // Per-user pricing
  dailyEmailLimit?: number; // Daily email limit per user
  maxContacts?: number;
  maxEmailsPerMonth?: number;
  maxCampaigns?: number;
  maxTemplates?: number;
  maxUsers?: number;
  features?: any;
  isActive: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  userCount?: number;
  volumeDiscountPercent?: number;
  finalAmount?: number;
  prorationDetails?: {
    creditAmount?: number;
    chargeAmount?: number;
    netCharge?: number;
    daysRemaining?: number;
    totalDays?: number;
    oldPlanName?: string;
    newPlanName?: string;
    oldBillingCycle?: string;
    newBillingCycle?: string;
  };
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialStart?: string;
  trialEnd?: string;
  cancelAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  pendingUserCount?: number | null;
  pendingPlanId?: string | null;
  pendingChangeReason?: string | null;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  razorpaySubscriptionId?: string;
  razorpayCustomerId?: string;
  paymentProvider?: "RAZORPAY" | "STRIPE";
  createdAt: string;
  updatedAt: string;
  // Relations
  plan?: SubscriptionPlan;
  organization?: any;
}

export interface CreateSubscriptionRequest {
  organizationId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  amount: number;
  currency?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialStart?: string;
  trialEnd?: string;
}

export interface UpdateSubscriptionRequest {
  status?: SubscriptionStatus;
  billingCycle?: BillingCycle;
  amount?: number;
  currency?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialStart?: string;
  trialEnd?: string;
  cancelAt?: string;
  cancelReason?: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
}

export interface GetSubscriptionsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: SubscriptionStatus;
  organizationId?: string;
  planId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc" | "ASC" | "DESC";
}

export interface GetSubscriptionsResponse {
  subscriptions: Subscription[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminUpgradeSubscriptionRequest {
  organizationId: string;
  planId: string;
  userCount: number;
  billingCycle?: BillingCycle;
}

export interface AdminUpdateUserCountRequest {
  organizationId: string;
  userCount: number;
}

// Display labels for UI
export const SubscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  [SubscriptionStatus.ACTIVE]: "Active",
  [SubscriptionStatus.CANCELLED]: "Cancelled",
  [SubscriptionStatus.PAST_DUE]: "Past Due",
  [SubscriptionStatus.UNPAID]: "Unpaid",
  [SubscriptionStatus.INCOMPLETE]: "Incomplete",
  [SubscriptionStatus.TRIAL]: "Trial",
  [SubscriptionStatus.TRIALING]: "Trialing",
};

export const BillingCycleLabels: Record<BillingCycle, string> = {
  [BillingCycle.MONTHLY]: "Monthly",
  [BillingCycle.YEARLY]: "Yearly",
};

// Status colors for UI
export const SubscriptionStatusColors: Record<
  SubscriptionStatus,
  string
> = {
  [SubscriptionStatus.ACTIVE]: "text-green-600 bg-green-50",
  [SubscriptionStatus.CANCELLED]: "text-orange-600 bg-orange-50",
  [SubscriptionStatus.PAST_DUE]: "text-red-600 bg-red-50",
  [SubscriptionStatus.UNPAID]: "text-red-600 bg-red-50",
  [SubscriptionStatus.INCOMPLETE]: "text-yellow-600 bg-yellow-50",
  [SubscriptionStatus.TRIAL]: "text-blue-600 bg-blue-50",
  [SubscriptionStatus.TRIALING]: "text-blue-600 bg-blue-50",
};

