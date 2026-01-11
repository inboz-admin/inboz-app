import { QueryInterface } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    const now = new Date();
    const resources = [
      {
        id: '550e8400-e29b-41d4-a716-446655440200',
        name: 'USERS',
        description: 'User management resource',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440201',
        name: 'ROLES',
        description: 'Role management resource',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440202',
        name: 'RBAC',
        description: 'Role-Based Access Control management resource',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440203',
        name: 'ACTIONS',
        description: 'Action management resource',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440204',
        name: 'RESOURCES',
        description: 'Resource management resource',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440205',
        name: 'PROFILES',
        description: 'User profile management resource',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440206',
        name: 'SETTINGS',
        description: 'Application settings resource',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440208',
        name: 'ORGANIZATIONS',
        description: 'Organization management resource',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440212',
        name: 'ENQUIRIES',
        description: 'Enquiry management resource',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440214',
        name: 'FEEDBACKS',
        description: 'Feedback management resource',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440216',
        name: 'ANALYTICS',
        description: 'Analytics and reporting resource',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440217',
        name: 'AUDITLOGS',
        description: 'Audit log management resource',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440219',
        name: 'CONTACTS',
        description: 'Contact management resource',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440220',
        name: 'TEMPLATES',
        description: 'Email template management resource',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440221',
        name: 'CAMPAIGNS',
        description: 'Email campaign management resource',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440222',
        name: 'CONTACTLISTS',
        description: 'Contact list management resource',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440223',
        name: 'SUBSCRIPTIONS',
        description: 'Subscription management resource',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440224',
        name: 'INVOICES',
        description: 'Invoice management resource',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440218',
        name: 'OVERVIEW',
        description: 'Overview dashboard resource',
        created_at: now,
        updated_at: now,
      },
    ];

    await queryInterface.bulkInsert('resources', resources, {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete('resources', {}, {});
  },
};
