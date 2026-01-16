import { QueryInterface } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    const now = new Date();
    const roles = [
      {
        id: '550e8400-e29b-41d4-a716-446655440299',
        name: 'SUPERADMIN',
        description:
          'Super Administrator with complete system access and management privileges',
        permissions: JSON.stringify({
          // RBAC Related
          ROLES: ['CREATE', 'READ', 'UPDATE', 'LIST', 'EXPORT'],
          RBAC: ['CREATE', 'READ', 'UPDATE', 'LIST', 'EXPORT'],
          RESOURCES: ['CREATE', 'READ', 'UPDATE', 'LIST', 'EXPORT'],
          ACTIONS: ['CREATE', 'READ', 'UPDATE', 'LIST', 'EXPORT'],
          // Organization and User Management
          ORGANIZATIONS: ['CREATE', 'READ', 'UPDATE', 'LIST', 'EXPORT'],
          USERS: ['CREATE', 'READ', 'UPDATE', 'LIST', 'EXPORT'],
          EMPLOYEES: ['CREATE', 'READ', 'UPDATE', 'LIST', 'EXPORT'],
          // Campaign Management
          CAMPAIGNS: ['READ', 'LIST', 'EXPORT'],
          CONTACTS: ['READ', 'LIST', 'EXPORT'],
          CONTACTLISTS: ['READ', 'LIST', 'EXPORT'],
          TEMPLATES: ['READ', 'LIST', 'EXPORT'],
          // Subscription Management
          SUBSCRIPTIONS: ['READ', 'UPDATE', 'LIST', 'EXPORT'],
          INVOICES: ['READ', 'UPDATE', 'LIST', 'EXPORT'],
          // Other
          PROFILES: ['READ', 'UPDATE', 'LIST', 'EXPORT'],
          SETTINGS: ['READ', 'UPDATE', 'LIST', 'EXPORT'],
          ANALYTICS: ['READ', 'UPDATE', 'LIST', 'EXPORT'],
          AUDITLOGS: ['READ', 'UPDATE', 'LIST', 'EXPORT'],
          OVERVIEW: ['READ', 'UPDATE', 'LIST', 'EXPORT'],
        }),
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440300',
        name: 'ADMIN',
        description: 'Administrator with full access to all features',
        permissions: JSON.stringify({
          // RBAC Related
          ROLES: ['CREATE', 'READ', 'UPDATE', 'LIST'],
          RBAC: ['CREATE', 'READ', 'UPDATE', 'LIST'],
          RESOURCES: ['CREATE', 'READ', 'UPDATE', 'LIST'],
          ACTIONS: ['CREATE', 'READ', 'UPDATE', 'LIST'],
          // Organization and User Management
          ORGANIZATIONS: ['READ', 'UPDATE', 'LIST'],
          USERS: ['CREATE', 'READ', 'UPDATE', 'LIST'],
          EMPLOYEES: [],
          // Campaign Management
          CAMPAIGNS: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LIST'],
          CONTACTS: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LIST'],
          CONTACTLISTS: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LIST'],
          TEMPLATES: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LIST'],
          // Subscription Management
          SUBSCRIPTIONS: ['CREATE', 'READ', 'UPDATE', 'LIST'],
          INVOICES: ['CREATE', 'READ', 'UPDATE', 'LIST'],
          // Other
          PROFILES: ['READ', 'UPDATE', 'LIST'],
          SETTINGS: ['READ', 'UPDATE', 'LIST'],
          ANALYTICS: ['READ', 'LIST'],
          AUDITLOGS: ['READ', 'LIST'],
          OVERVIEW: ['READ', 'LIST'],
        }),
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440301',
        name: 'USER',
        description:
          'Regular user with basic access to email campaign features',
        permissions: JSON.stringify({
          // RBAC Related
          ROLES: ['READ', 'LIST'],
          RBAC: ['READ', 'LIST'],
          RESOURCES: ['READ', 'LIST'],
          ACTIONS: ['READ', 'LIST'],
          // Organization and User Management
          ORGANIZATIONS: ['READ', 'LIST'],
          USERS: ['READ', 'LIST'],
          EMPLOYEES: [],
          // Campaign Management
          CAMPAIGNS: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LIST'],
          CONTACTS: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LIST'],
          CONTACTLISTS: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LIST'],
          TEMPLATES: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LIST'],
          // Subscription Management
          SUBSCRIPTIONS: ['READ', 'LIST'],
          INVOICES: ['READ', 'LIST'],
          // Other
          PROFILES: ['READ', 'UPDATE'],
          SETTINGS: ['READ'],
          ANALYTICS: ['READ', 'LIST'],
          AUDITLOGS: ['READ', 'LIST'],
          OVERVIEW: ['READ', 'LIST'],
        }),
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440302',
        name: 'SUPPORT',
        description:
          'Support role with read and update access to all resources for troubleshooting',
        permissions: JSON.stringify({
          // RBAC Related
          ROLES: ['READ', 'UPDATE', 'LIST', 'EXPORT'],
          RBAC: ['READ', 'UPDATE', 'LIST', 'EXPORT'],
          RESOURCES: ['READ', 'UPDATE', 'LIST', 'EXPORT'],
          ACTIONS: ['READ', 'UPDATE', 'LIST', 'EXPORT'],
          // Organization and User Management
          ORGANIZATIONS: ['CREATE', 'READ', 'UPDATE', 'LIST', 'EXPORT'],
          USERS: ['CREATE', 'READ', 'UPDATE', 'LIST', 'EXPORT'],
          EMPLOYEES: ['READ', 'UPDATE', 'LIST', 'EXPORT'],
          // Campaign Management
          CAMPAIGNS: ['READ', 'LIST', 'EXPORT'],
          CONTACTS: ['READ', 'LIST', 'EXPORT'],
          CONTACTLISTS: ['READ', 'LIST', 'EXPORT'],
          TEMPLATES: ['READ', 'LIST', 'EXPORT'],
          // Subscription Management
          SUBSCRIPTIONS: ['READ', 'UPDATE', 'LIST', 'EXPORT'],
          INVOICES: ['READ', 'UPDATE', 'LIST', 'EXPORT'],
          // Other
          PROFILES: ['READ', 'UPDATE', 'LIST', 'EXPORT'],
          SETTINGS: ['READ', 'UPDATE', 'LIST', 'EXPORT'],
          // ANALYTICS removed - no access for SUPPORT
          AUDITLOGS: ['READ', 'UPDATE', 'LIST', 'EXPORT'],
          OVERVIEW: ['READ', 'UPDATE', 'LIST', 'EXPORT'],
        }),
        created_at: now,
        updated_at: now,
      },
    ];

    await queryInterface.bulkInsert('roles', roles, {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete('roles', {}, {});
  },
};
