// Organization entity types and interfaces - ALIGNED WITH SERVER

export const SubscriptionStatus = {
  TRIAL: "TRIAL",
  ACTIVE: "ACTIVE",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
  SUSPENDED: "SUSPENDED",
} as const;

export type SubscriptionStatus =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const OrganizationStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

export type OrganizationStatus =
  (typeof OrganizationStatus)[keyof typeof OrganizationStatus];

export interface OrganizationSettings {
  allowStudentRegistration?: boolean;
  requireEmailVerification?: boolean;
  maxStudentsPerCenter?: number;
  defaultLanguage?: string;
  notificationSettings?: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    pushNotifications?: boolean;
  };
  academicSettings?: {
    academicYearStart?: string;
    academicYearEnd?: string;
    gradingSystem?: string;
  };
  [key: string]: unknown;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  timezone: string;
  settings?: OrganizationSettings;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlanId?: string;
  billingEmail?: string;
  // Additional fields for email campaign platform
  description?: string;
  website?: string;
  logoUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  status: OrganizationStatus;
  // Timestamps
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  // Audit fields
  createdBy?: string;
  updatedBy?: string;
  deletedBy?: string;
}

export interface CreateOrganizationRequest {
  name: string;
  slug?: string;
  domain?: string;
  timezone?: string;
  settings?: OrganizationSettings;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionPlanId?: string;
  billingEmail?: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  status?: OrganizationStatus;
}

export interface UpdateOrganizationRequest {
  name?: string;
  slug?: string;
  domain?: string;
  timezone?: string;
  settings?: OrganizationSettings;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionPlanId?: string;
  billingEmail?: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  status?: OrganizationStatus;
}

export interface GetOrganizationsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrganizationStatus;
  subscriptionStatus?: SubscriptionStatus;
  domain?: string;
  organizationId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc" | "ASC" | "DESC";
}

export interface GetOrganizationsResponse {
  organizations: Organization[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Display labels for UI
export const SubscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  [SubscriptionStatus.TRIAL]: "Trial",
  [SubscriptionStatus.ACTIVE]: "Active",
  [SubscriptionStatus.CANCELLED]: "Cancelled",
  [SubscriptionStatus.EXPIRED]: "Expired",
  [SubscriptionStatus.SUSPENDED]: "Suspended",
};

export const OrganizationStatusLabels: Record<OrganizationStatus, string> = {
  [OrganizationStatus.ACTIVE]: "Active",
  [OrganizationStatus.INACTIVE]: "Inactive",
  [OrganizationStatus.SUSPENDED]: "Suspended",
};

// Status colors for UI
export const OrganizationStatusColors: Record<OrganizationStatus, string> = {
  [OrganizationStatus.ACTIVE]: "text-green-600 bg-green-50",
  [OrganizationStatus.INACTIVE]: "text-gray-600 bg-gray-50",
  [OrganizationStatus.SUSPENDED]: "text-red-600 bg-red-50",
};

export const SubscriptionStatusColors: Record<SubscriptionStatus, string> = {
  [SubscriptionStatus.TRIAL]: "text-blue-600 bg-blue-50",
  [SubscriptionStatus.ACTIVE]: "text-green-600 bg-green-50",
  [SubscriptionStatus.CANCELLED]: "text-orange-600 bg-orange-50",
  [SubscriptionStatus.EXPIRED]: "text-red-600 bg-red-50",
  [SubscriptionStatus.SUSPENDED]: "text-gray-600 bg-gray-50",
};

// Standard timezones - 36 major timezones covering all regions
export const CommonTimezones = [
  // Americas
  "America/New_York",      // EST/EDT (UTC-5/-4)
  "America/Chicago",       // CST/CDT (UTC-6/-5)
  "America/Denver",        // MST/MDT (UTC-7/-6)
  "America/Los_Angeles",   // PST/PDT (UTC-8/-7)
  "America/Phoenix",       // MST (UTC-7, no DST)
  "America/Anchorage",     // AKST/AKDT (UTC-9/-8)
  "America/Honolulu",      // HST (UTC-10, no DST)
  "America/Toronto",       // EST/EDT (UTC-5/-4)
  "America/Vancouver",     // PST/PDT (UTC-8/-7)
  "America/Mexico_City",   // CST (UTC-6)
  "America/Sao_Paulo",     // BRT (UTC-3)
  "America/Buenos_Aires",  // ART (UTC-3)
  "America/Lima",          // PET (UTC-5)
  
  // Europe
  "Europe/London",         // GMT/BST (UTC+0/+1)
  "Europe/Paris",          // CET/CEST (UTC+1/+2)
  "Europe/Berlin",         // CET/CEST (UTC+1/+2)
  "Europe/Rome",           // CET/CEST (UTC+1/+2)
  "Europe/Madrid",         // CET/CEST (UTC+1/+2)
  "Europe/Amsterdam",      // CET/CEST (UTC+1/+2)
  "Europe/Stockholm",      // CET/CEST (UTC+1/+2)
  "Europe/Moscow",         // MSK (UTC+3)
  "Europe/Istanbul",      // TRT (UTC+3)
  
  // Middle East
  "Asia/Dubai",            // GST (UTC+4)
  "Asia/Riyadh",           // AST (UTC+3)
  "Asia/Kuwait",           // AST (UTC+3)
  "Asia/Doha",             // AST (UTC+3)
  "Asia/Tehran",           // IRST (UTC+3:30)
  "Asia/Tel_Aviv",         // IST (UTC+2/+3)
  "Asia/Beirut",           // EET (UTC+2/+3)
  "Asia/Amman",            // EET (UTC+2/+3)
  
  // Asia
  "Asia/Karachi",          // PKT (UTC+5)
  "Asia/Kolkata",          // IST (UTC+5:30)
  "Asia/Dhaka",            // BST (UTC+6)
  "Asia/Bangkok",          // ICT (UTC+7)
  "Asia/Ho_Chi_Minh",      // ICT (UTC+7)
  "Asia/Jakarta",          // WIB (UTC+7)
  "Asia/Singapore",        // SGT (UTC+8)
  "Asia/Kuala_Lumpur",     // MYT (UTC+8)
  "Asia/Hong_Kong",        // HKT (UTC+8)
  "Asia/Shanghai",         // CST (UTC+8)
  "Asia/Taipei",           // CST (UTC+8)
  "Asia/Manila",           // PHT (UTC+8)
  "Asia/Tokyo",            // JST (UTC+9)
  "Asia/Seoul",            // KST (UTC+9)
  
  // Oceania
  "Australia/Sydney",      // AEDT/AEST (UTC+11/+10)
  "Australia/Melbourne",   // AEDT/AEST (UTC+11/+10)
  "Australia/Perth",       // AWST (UTC+8)
  "Pacific/Auckland",      // NZDT/NZST (UTC+13/+12)
  
  // Africa
  "Africa/Johannesburg",   // SAST (UTC+2)
  "Africa/Cairo",          // EET (UTC+2)
  
  // UTC
  "UTC",                   // UTC (UTC+0)
] as const;

export type CommonTimezone = (typeof CommonTimezones)[number];
