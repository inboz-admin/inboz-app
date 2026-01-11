import { QueryInterface } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    const now = new Date();
    const plans = [
      {
        id: '550e8400-e29b-41d4-a716-446655440401',
        name: 'Basic',
        description: 'Perfect for small teams getting started with email campaigns',
        price_per_user_monthly: 0,
        price_per_user_yearly: 0,
        daily_email_limit: 0,
        max_contacts: 100,
        max_emails_per_month: 5000,
        max_campaigns: 10,
        max_templates: 20,
        max_users: 3,
        features: JSON.stringify({
          basic_analytics: true,
          email_support: true,
          campaign_templates: true,
          contact_management: true,
          basic_reporting: true,
        }),
        is_active: true,
        is_public: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440402',
        name: 'Pro',
        description: 'Advanced features for growing businesses',
        price_per_user_monthly: 0,
        price_per_user_yearly: 0,
        daily_email_limit: 0,
        max_contacts: 5000,
        max_emails_per_month: 50000,
        max_campaigns: 50,
        max_templates: 100,
        max_users: 10,
        features: JSON.stringify({
          advanced_analytics: true,
          email_support: true,
          priority_support: true,
          campaign_templates: true,
          contact_management: true,
          advanced_reporting: true,
          a_b_testing: true,
          automation: true,
          integrations: true,
        }),
        is_active: true,
        is_public: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440403',
        name: 'Pro Max',
        description: 'Enterprise-grade features for large teams',
        price_per_user_monthly: 0,
        price_per_user_yearly: 0,
        daily_email_limit: 0,
        max_contacts: 10000,
        max_emails_per_month: 100000,
        max_campaigns: null, // Unlimited
        max_templates: null, // Unlimited
        max_users: 20,
        features: JSON.stringify({
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
        }),
        is_active: true,
        is_public: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440404',
        name: 'Custom',
        description: 'Tailored solutions for enterprise needs. Contact us for pricing.',
        price_per_user_monthly: null,
        price_per_user_yearly: null,
        daily_email_limit: null,
        max_contacts: null, // Unlimited
        max_emails_per_month: null, // Unlimited
        max_campaigns: null, // Unlimited
        max_templates: null, // Unlimited
        max_users: null, // Unlimited
        features: JSON.stringify({
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
          custom_features: true,
          sla_guarantee: true,
        }),
        is_active: true,
        is_public: true,
        created_at: now,
        updated_at: now,
      },
    ];

    await queryInterface.bulkInsert('subscription_plans', plans, {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete('subscription_plans', {}, {});
  },
};

