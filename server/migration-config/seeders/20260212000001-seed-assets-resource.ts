import { QueryInterface } from 'sequelize';

const ASSETS_RESOURCE_ID = '550e8400-e29b-41d4-a716-446655440333';

/**
 * Seeds the ASSETS resource if it does not exist.
 * Safe to run in production: only inserts when ASSETS is missing.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    const [rows] = await queryInterface.sequelize.query(
      "SELECT 1 FROM resources WHERE name = 'ASSETS' LIMIT 1"
    );
    const exists = Array.isArray(rows) && rows.length > 0;
    if (exists) return;

    const now = new Date();
    await queryInterface.bulkInsert('resources', [
      {
        id: ASSETS_RESOURCE_ID,
        name: 'ASSETS',
        description: 'Media assets (images, files) for templates and campaigns',
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete('resources', { name: 'ASSETS' }, {});
  },
};
