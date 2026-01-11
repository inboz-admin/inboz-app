export interface KpiStats {
  totalUsers: {
    total: number;
    active: number;
    inactive: number;
  };
  totalContacts: number;
  totalTemplates: number;
  totalEmailsSent: number;
  totalEmailsDelivered: number;
  totalEmailsOpened: number;
  totalEmailsClicked: number;
  totalEmailsBounced: number;
  totalEmailsFailed: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalOrganizations?: number; // For platform view
  totalRevenue?: number; // For platform view - total revenue from active subscriptions
  subscriptionBreakdown?: { // For platform view
    trial: number;
    starter: number;
    pro: number;
    scale: number;
  };
  engagementMetrics: {
    openRate: number;
    clickRate: number;
    bounceRate: number;
    deliveryRate: number;
  };
}

export interface UserWiseAnalytics {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  role: string;
  status: string;
  templatesCreated: number;
  templatesUsed: number;
  campaignsCreated: number;
  emailsSent: number;
  emailsBounced: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsReplied: number;
  unsubscribes: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

export interface AnalyticsQueryParams {
  startDate?: string;
  endDate?: string;
  organizationId?: string; // Optional from UI, will be set server-side if not provided
  page?: number;
  limit?: number;
  status?: string[]; // For filtering campaigns by status
  userId?: string; // Filter analytics by specific user (campaigns created by this user)
  platformView?: boolean; // Platform-wide view (SUPERADMIN only) - aggregates across all organizations
}

export interface AnalyticsUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
}

export interface PaginatedAnalyticsResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CampaignAnalytics {
  campaignId: string;
  campaignName: string;
  creator: {
    id: string;
    email: string;
    fullName: string;
  } | null;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED';
  totalRecipients: number;
  emailsSent: number;
  emailsDelivered: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsBounced: number;
  emailsFailed: number;
  emailsReplied: number;
  emailsComplained: number;
  unsubscribes: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  createdAt: string;
  completedAt: string | null;
}

export interface EmailStatusBreakdown {
  queued: number;
  sending: number;
  sent: number;
  delivered: number;
  bounced: number;
  failed: number;
  cancelled: number;
  total: number;
  breakdown: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
}

export interface CampaignStatusDistribution {
  draft: number;
  active: number;
  paused: number;
  completed: number;
  cancelled: number;
  total: number;
  distribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
}

export interface OrganizationAnalytics {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  usersCount: number;
  contactsCount: number;
  contactListsCount: number;
  templatesCount: number;
  campaignsCount: number;
  subscription: string; // 'Trial', 'Starter', 'Pro', 'Scale', or 'None'
  revenue: number; // Revenue from subscription (0 for trial)
}

