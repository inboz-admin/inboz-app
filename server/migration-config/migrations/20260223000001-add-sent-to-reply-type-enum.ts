import { QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  // ALTER the ENUM to add 'SENT' as a valid value for reply_type
  await queryInterface.sequelize.query(
    "ALTER TABLE `campaign_steps` MODIFY COLUMN `reply_type` ENUM('OPENED', 'CLICKED', 'SENT') NULL"
  );
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  // Revert: remove 'SENT' from ENUM (set any SENT values to NULL first)
  await queryInterface.sequelize.query(
    "UPDATE `campaign_steps` SET `reply_type` = NULL WHERE `reply_type` = 'SENT'"
  );
  await queryInterface.sequelize.query(
    "ALTER TABLE `campaign_steps` MODIFY COLUMN `reply_type` ENUM('OPENED', 'CLICKED') NULL"
  );
};
