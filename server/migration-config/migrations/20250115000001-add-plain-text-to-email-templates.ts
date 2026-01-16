import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.addColumn('email_templates', 'plain_text', {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  });
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.removeColumn('email_templates', 'plain_text');
};
