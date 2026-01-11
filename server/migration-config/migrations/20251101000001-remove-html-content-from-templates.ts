import { QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    // Remove HTML content from system templates
    await queryInterface.sequelize.query(
      `UPDATE system_templates SET html_content = NULL WHERE html_content IS NOT NULL`,
      { transaction }
    );

    await transaction.commit();
    console.log('Successfully removed HTML content from all system templates.');
  } catch (error) {
    await transaction.rollback();
    console.error('Error removing HTML content from system templates:', error);
    throw error;
  }
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  // Note: This migration cannot be reversed as we don't store the original HTML content
  // The down migration is a no-op
  console.log('Warning: Cannot restore HTML content from system templates. This migration cannot be reversed.');
};
