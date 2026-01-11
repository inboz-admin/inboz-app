import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('password_reset_tokens', {
      id: {
        type: DataTypes.CHAR(36),
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Email address requesting password reset',
      },
      user_type: {
        type: DataTypes.ENUM('USER', 'EMPLOYEE'),
        allowNull: false,
        comment: 'Type of user requesting reset',
      },
      token: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Unique verification token',
      },
      otp: {
        type: DataTypes.STRING(6),
        allowNull: true,
        comment: '6-digit OTP for verification',
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Token expiration timestamp',
      },
      used: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether token has been used',
      },
      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of verification attempts',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW(),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW(),
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('password_reset_tokens', [
      'email',
      'user_type',
    ]);
    await queryInterface.addIndex('password_reset_tokens', ['token']);
    await queryInterface.addIndex('password_reset_tokens', ['expires_at']);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('password_reset_tokens');
  },
};
