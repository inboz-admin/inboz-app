import { QueryInterface } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    const now = new Date();
    const actions = [
      {
        id: '550e8400-e29b-41d4-a716-446655440100',
        name: 'CREATE',
        description: 'Ability to create resources',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440101',
        name: 'READ',
        description: 'Ability to read resources',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440102',
        name: 'UPDATE',
        description: 'Ability to update resources',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440103',
        name: 'DELETE',
        description: 'Ability to delete resources',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440104',
        name: 'LIST',
        description: 'Ability to list resources',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440105',
        name: 'EXPORT',
        description: 'Ability to export resources',
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440106',
        name: 'IMPORT',
        description: 'Ability to import resources',
        created_at: now,
        updated_at: now,
      },
    ];

    await queryInterface.bulkInsert('actions', actions, {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete('actions', {}, {});
  },
};
