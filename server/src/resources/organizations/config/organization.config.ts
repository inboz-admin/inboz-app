export interface OrganizationConfig {
  defaultPlan: {
    name: string;
    criteria?: {
      isActive?: boolean;
      priceMonthly?: number;
      isPublic?: boolean;
    };
    trialPeriodDays: number;
    currency: string;
  };

  validation: {
    maxNameLength: number;
    maxSlugLength: number;
    maxDomainLength: number;
    maxDescriptionLength: number;
    maxWebsiteLength: number;
    maxAddressLength: number;
    maxCityLength: number;
    maxStateLength: number;
    maxCountryLength: number;
    maxPostalCodeLength: number;
    maxPhoneLength: number;
    maxEmailLength: number;
  };

  security: {
    enableInputSanitization: boolean;
    enableRateLimiting: boolean;
    maxRequestsPerMinute: number;
  };

  businessRules: {
    requireSubscriptionForNewOrg: boolean;
    allowOrgDeletion: boolean;
    allowOrgSoftDelete: boolean;
    maxOrgsPerUser: number;
  };
}

export const defaultOrganizationConfig: OrganizationConfig = {
  defaultPlan: {
    name: 'Free Trial',
    criteria: {
      isActive: true,
    },
    trialPeriodDays: 7,
    currency: 'USD',
  },

  validation: {
    maxNameLength: 255,
    maxSlugLength: 100,
    maxDomainLength: 255,
    maxDescriptionLength: 1000,
    maxWebsiteLength: 500,
    maxAddressLength: 255,
    maxCityLength: 100,
    maxStateLength: 100,
    maxCountryLength: 100,
    maxPostalCodeLength: 20,
    maxPhoneLength: 20,
    maxEmailLength: 255,
  },

  security: {
    enableInputSanitization: true,
    enableRateLimiting: true,
    maxRequestsPerMinute: 60,
  },

  businessRules: {
    requireSubscriptionForNewOrg: true,
    allowOrgDeletion: false,
    allowOrgSoftDelete: true,
    maxOrgsPerUser: 5,
  },
};
