import { QueryInterface } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    // Delete all existing subscription plans
    await queryInterface.bulkDelete('subscription_plans', {}, {});

    const now = new Date();
    const plans = [
      {
        id: '550e8400-e29b-41d4-a716-446655440405',
        name: 'Free Trial',
        description: '7-day free trial with Starter features and 30 emails per day',
        price_per_user_monthly: 0,
        price_per_user_yearly: 0,
        daily_email_limit: 30,
        max_contacts: null,
        max_emails_per_month: null,
        max_campaigns: null,
        max_templates: null,
        max_users: null,
        features: JSON.stringify({
          basic_analytics: true,
          email_support: true,
          campaign_templates: true,
          contact_management: true,
          basic_reporting: true,
        }),
        is_active: true,
        is_public: false, // Trial plan is not publicly visible
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440406',
        name: 'Starter',
        description: 'Perfect for small teams getting started with email campaigns',
        price_per_user_monthly: 29.00,
        price_per_user_yearly: 290.00, // 10 months paid, 2 months free
        daily_email_limit: 300,
        max_contacts: null,
        max_emails_per_month: null,
        max_campaigns: null,
        max_templates: null,
        max_users: null,
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
        id: '550e8400-e29b-41d4-a716-446655440407',
        name: 'Pro',
        description: 'Advanced features for growing businesses',
        price_per_user_monthly: 39.00,
        price_per_user_yearly: 390.00, // 10 months paid, 2 months free
        daily_email_limit: 600,
        max_contacts: null,
        max_emails_per_month: null,
        max_campaigns: null,
        max_templates: null,
        max_users: null,
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
        id: '550e8400-e29b-41d4-a716-446655440408',
        name: 'Scale',
        description: 'Enterprise-grade features for large teams',
        price_per_user_monthly: 49.00,
        price_per_user_yearly: 490.00, // 10 months paid, 2 months free
        daily_email_limit: 1000,
        max_contacts: null,
        max_emails_per_month: null,
        max_campaigns: null,
        max_templates: null,
        max_users: null,
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
    ];

    await queryInterface.bulkInsert('subscription_plans', plans, {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete('subscription_plans', {
      name: ['Free Trial', 'Starter', 'Pro', 'Scale'],
    }, {});
  },
};
