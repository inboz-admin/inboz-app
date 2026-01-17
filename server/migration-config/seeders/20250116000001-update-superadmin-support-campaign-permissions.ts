import { QueryInterface } from 'sequelize';
import { QueryTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    const now = new Date();
    
    // Get SUPERADMIN role
    const superadminResults = await queryInterface.sequelize.query(
      `SELECT id, permissions FROM roles WHERE name = 'SUPERADMIN' LIMIT 1`,
      { type: QueryTypes.SELECT }
    ) as Array<{ id: string; permissions: string }>;
    
    // Get SUPPORT role
    const supportResults = await queryInterface.sequelize.query(
      `SELECT id, permissions FROM roles WHERE name = 'SUPPORT' LIMIT 1`,
      { type: QueryTypes.SELECT }
    ) as Array<{ id: string; permissions: string }>;

    // Update SUPERADMIN role - remove UPDATE from campaign management permissions
    if (superadminResults && superadminResults.length > 0) {
      const role = superadminResults[0];
      const permissions = JSON.parse(role.permissions);
      
      // Remove UPDATE from campaign management permissions
      permissions.CAMPAIGNS = ['READ', 'LIST', 'EXPORT'];
      permissions.CONTACTS = ['READ', 'LIST', 'EXPORT'];
      permissions.CONTACTLISTS = ['READ', 'LIST', 'EXPORT'];
      permissions.TEMPLATES = ['READ', 'LIST', 'EXPORT'];
      
      await queryInterface.sequelize.query(
        `UPDATE roles SET permissions = :permissions, updated_at = :now WHERE id = :id`,
        {
          replacements: {
            permissions: JSON.stringify(permissions),
            now,
            id: role.id,
          },
          type: QueryTypes.UPDATE,
        }
      );
    }

    // Update SUPPORT role - remove UPDATE from campaign management permissions
    if (supportResults && supportResults.length > 0) {
      const role = supportResults[0];
      const permissions = JSON.parse(role.permissions);
      
      // Remove UPDATE from campaign management permissions
      permissions.CAMPAIGNS = ['READ', 'LIST', 'EXPORT'];
      permissions.CONTACTS = ['READ', 'LIST', 'EXPORT'];
      permissions.CONTACTLISTS = ['READ', 'LIST', 'EXPORT'];
      permissions.TEMPLATES = ['READ', 'LIST', 'EXPORT'];
      
      await queryInterface.sequelize.query(
        `UPDATE roles SET permissions = :permissions, updated_at = :now WHERE id = :id`,
        {
          replacements: {
            permissions: JSON.stringify(permissions),
            now,
            id: role.id,
          },
          type: QueryTypes.UPDATE,
        }
      );
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const now = new Date();
    
    // Get SUPERADMIN role
    const superadminResults = await queryInterface.sequelize.query(
      `SELECT id, permissions FROM roles WHERE name = 'SUPERADMIN' LIMIT 1`,
      { type: QueryTypes.SELECT }
    ) as Array<{ id: string; permissions: string }>;
    
    // Get SUPPORT role
    const supportResults = await queryInterface.sequelize.query(
      `SELECT id, permissions FROM roles WHERE name = 'SUPPORT' LIMIT 1`,
      { type: QueryTypes.SELECT }
    ) as Array<{ id: string; permissions: string }>;

    // Revert SUPERADMIN role - restore UPDATE permission
    if (superadminResults && superadminResults.length > 0) {
      const role = superadminResults[0];
      const permissions = JSON.parse(role.permissions);
      
      // Restore UPDATE to campaign management permissions
      permissions.CAMPAIGNS = ['READ', 'UPDATE', 'LIST', 'EXPORT'];
      permissions.CONTACTS = ['READ', 'UPDATE', 'LIST', 'EXPORT'];
      permissions.CONTACTLISTS = ['READ', 'UPDATE', 'LIST', 'EXPORT'];
      permissions.TEMPLATES = ['READ', 'UPDATE', 'LIST', 'EXPORT'];
      
      await queryInterface.sequelize.query(
        `UPDATE roles SET permissions = :permissions, updated_at = :now WHERE id = :id`,
        {
          replacements: {
            permissions: JSON.stringify(permissions),
            now,
            id: role.id,
          },
          type: QueryTypes.UPDATE,
        }
      );
    }

    // Revert SUPPORT role - restore UPDATE permission
    if (supportResults && supportResults.length > 0) {
      const role = supportResults[0];
      const permissions = JSON.parse(role.permissions);
      
      // Restore UPDATE to campaign management permissions
      permissions.CAMPAIGNS = ['READ', 'UPDATE', 'LIST', 'EXPORT'];
      permissions.CONTACTS = ['READ', 'UPDATE', 'LIST', 'EXPORT'];
      permissions.CONTACTLISTS = ['READ', 'UPDATE', 'LIST', 'EXPORT'];
      permissions.TEMPLATES = ['READ', 'UPDATE', 'LIST', 'EXPORT'];
      
      await queryInterface.sequelize.query(
        `UPDATE roles SET permissions = :permissions, updated_at = :now WHERE id = :id`,
        {
          replacements: {
            permissions: JSON.stringify(permissions),
            now,
            id: role.id,
          },
          type: QueryTypes.UPDATE,
        }
      );
    }
  },
};
