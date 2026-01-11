/**
 * Seeded subscription plan IDs and constants
 * These correspond to the migration seeder data
 */

// Seeded plan IDs from migration: 20251031000007-seed-new-pricing-plans.ts
export const SUBSCRIPTION_PLAN_IDS = {
  FREE_TRIAL: '550e8400-e29b-41d4-a716-446655440405',
  STARTER: '550e8400-e29b-41d4-a716-446655440406',
  PRO: '550e8400-e29b-41d4-a716-446655440407',
  SCALE: '550e8400-e29b-41d4-a716-446655440408',
} as const;

export const SUBSCRIPTION_PLAN_NAMES = {
  FREE_TRIAL: 'Free Trial',
  STARTER: 'Starter',
  PRO: 'Pro',
  SCALE: 'Scale',
} as const;

// Default plan for new organizations
export const DEFAULT_ORGANIZATION_PLAN = {
  id: SUBSCRIPTION_PLAN_IDS.FREE_TRIAL,
  name: SUBSCRIPTION_PLAN_NAMES.FREE_TRIAL,
} as const;

// Plan feature flags (corresponds to seeded features)
export const PLAN_FEATURES = {
  FREE_TRIAL: {
    basic_analytics: true,
    email_support: true,
    campaign_templates: true,
    contact_management: true,
    basic_reporting: true,
  },
  STARTER: {
    basic_analytics: true,
    email_support: true,
    campaign_templates: true,
    contact_management: true,
    basic_reporting: true,
  },
  PRO: {
    advanced_analytics: true,
    email_support: true,
    priority_support: true,
    campaign_templates: true,
    contact_management: true,
    advanced_reporting: true,
    a_b_testing: true,
    automation: true,
    integrations: true,
  },
  SCALE: {
    advanced_analytics: true,
    email_support: true,
    priority_support: true,
    phone_support: true,
    dedicated_account_manager: true,
    campaign_templates: true,
    contact_management: true,
    advanced_reporting: true,
    a_b_testing: true,
    automation: true,
    integrations: true,
    custom_integrations: true,
    api_access: true,
    white_label: true,
  },
} as const;

// Helper functions
export const getPlanById = (id: string) => {
  const entries = Object.entries(SUBSCRIPTION_PLAN_IDS);
  const found = entries.find(([_, planId]) => planId === id);
  return found ? { tier: found[0], id: found[1] } : null;
};

export const getPlanByName = (name: string) => {
  const entries = Object.entries(SUBSCRIPTION_PLAN_NAMES);
  const found = entries.find(([_, planName]) => planName === name);
  return found ? { tier: found[0], name: found[1], id: SUBSCRIPTION_PLAN_IDS[found[0] as keyof typeof SUBSCRIPTION_PLAN_IDS] } : null;
};

export const isValidPlanId = (id: string): boolean => {
  return Object.values(SUBSCRIPTION_PLAN_IDS).includes(id as any);
};

export const isValidPlanName = (name: string): boolean => {
  return Object.values(SUBSCRIPTION_PLAN_NAMES).includes(name as any);
};
