import { QueryInterface } from 'sequelize';
import * as crypto from 'crypto';

// Environment variables are already loaded in database.js

export default {
  up: async (queryInterface: QueryInterface) => {
    const now = new Date();
    
    // Get SUPERADMIN password from environment variable
    // For security, this should NEVER be hardcoded in the seeder
    const defaultPassword = process.env.SUPERADMIN_DEFAULT_PASSWORD;
    
    if (!defaultPassword) {
      throw new Error(
        'SUPERADMIN_DEFAULT_PASSWORD environment variable is not set. ' +
        'Please set it in your .env file before running seeders. ' +
        'For security reasons, the password cannot be hardcoded.'
      );
    }
    
    // Hash password using same method as CryptoUtilityService (PBKDF2 with SHA-256)
    const algorithm = 'sha256';
    const iterations = 100000;
    const keyLength = 64;
    const saltLength = 32;
    
    const salt = crypto.randomBytes(saltLength);
    const hash = crypto.pbkdf2Sync(
      defaultPassword,
      salt,
      iterations,
      keyLength,
      algorithm,
    );
    const combined = Buffer.concat([salt, hash]);
    const passwordHash = combined.toString('base64');

    const employees = [
      {
        id: '550e8400-e29b-41d4-a716-446655440400',
        email: 'admin@inboz.com',
        password_hash: passwordHash,
        first_name: 'Super',
        last_name: 'Admin',
        role: 'SUPERADMIN',
        status: 'ACTIVE',
        created_at: now,
        updated_at: now,
      },
    ];

    await queryInterface.bulkInsert('employees', employees, {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete('employees', {}, {});
  },
};

