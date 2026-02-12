import { QueryInterface } from 'sequelize';

const ASSETS_ACTIONS = ['CREATE', 'READ', 'DELETE', 'LIST'];

/**
 * Adds ASSETS permissions to existing roles if not already present.
 * Safe to run in production: only updates roles that do not have ASSETS in permissions.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    const [rows] = await queryInterface.sequelize.query(
      "SELECT id, name, permissions FROM roles WHERE deleted_at IS NULL"
    );
    const roles = Array.isArray(rows) ? (rows as { id: string; name: string; permissions: string }[]) : [];
    const now = new Date();

    for (const role of roles) {
      let perms: Record<string, string[]> = {};
      try {
        perms = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions || {};
      } catch {
        continue;
      }
      if (perms.ASSETS != null) continue;

      perms.ASSETS = ASSETS_ACTIONS;
      const permissionsJson = JSON.stringify(perms);
      await queryInterface.sequelize.query(
        'UPDATE roles SET permissions = :permissions, updated_at = :updated_at WHERE id = :id',
        {
          replacements: { permissions: permissionsJson, updated_at: now, id: role.id },
        }
      );
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const [rows] = await queryInterface.sequelize.query(
      "SELECT id, permissions FROM roles WHERE deleted_at IS NULL"
    );
    const roles = Array.isArray(rows) ? (rows as { id: string; permissions: string }[]) : [];
    const now = new Date();

    for (const role of roles) {
      let perms: Record<string, string[]> = {};
      try {
        perms = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions || {};
      } catch {
        continue;
      }
      if (perms.ASSETS == null) continue;

      delete perms.ASSETS;
      const permissionsJson = JSON.stringify(perms);
      await queryInterface.sequelize.query(
        'UPDATE roles SET permissions = :permissions, updated_at = :updated_at WHERE id = :id',
        {
          replacements: { permissions: permissionsJson, updated_at: now, id: role.id },
        }
      );
    }
  },
};
