import { QueryInterface } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    const superadminRoleId = '550e8400-e29b-41d4-a716-446655440299';

    const [roles] = await queryInterface.sequelize.query(
      `SELECT permissions FROM roles WHERE id = '${superadminRoleId}'`,
    );

    if (!roles || (roles as any[]).length === 0) {
      console.log('SUPERADMIN role not found, skipping migration');
      return;
    }

    const role = (roles as any[])[0];
    let permissions =
      typeof role.permissions === 'string'
        ? JSON.parse(role.permissions)
        : role.permissions;

    permissions.CAMPAIGNS = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LIST', 'EXPORT'];

    await queryInterface.bulkUpdate(
      'roles',
      { permissions: JSON.stringify(permissions) },
      { id: superadminRoleId },
    );

    console.log('Updated SUPERADMIN CAMPAIGNS permissions to include CREATE and DELETE');
  },

  down: async (queryInterface: QueryInterface) => {
    const superadminRoleId = '550e8400-e29b-41d4-a716-446655440299';

    const [roles] = await queryInterface.sequelize.query(
      `SELECT permissions FROM roles WHERE id = '${superadminRoleId}'`,
    );

    if (!roles || (roles as any[]).length === 0) {
      return;
    }

    const role = (roles as any[])[0];
    let permissions =
      typeof role.permissions === 'string'
        ? JSON.parse(role.permissions)
        : role.permissions;

    permissions.CAMPAIGNS = ['READ', 'UPDATE', 'LIST', 'EXPORT'];

    await queryInterface.bulkUpdate(
      'roles',
      { permissions: JSON.stringify(permissions) },
      { id: superadminRoleId },
    );
  },
};
