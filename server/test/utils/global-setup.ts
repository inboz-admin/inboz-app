/**
 * Global Setup for E2E Tests
 * 
 * This file runs ONCE before all test files are loaded.
 * It sets up the test environment variables BEFORE any modules are imported.
 * 
 * This is critical because:
 * 1. ConfigModule loads environment variables when AppModule is imported
 * 2. DatabaseModule uses ConfigService to get DB_NAME
 * 3. We need to ensure DB_NAME='email_tool_test' is set BEFORE ConfigModule reads it
 */

/**
 * Force set test database environment variables
 * This MUST run before any NestJS modules are imported
 */
export default async function globalSetup(): Promise<void> {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // FORCE test database configuration - override ANY existing values
  // This ensures we use test database even if .env files exist
  process.env.DB_NAME = 'email_tool_test';
  process.env.DB_USERNAME = 'sam1';
  process.env.DB_PASSWORD = 'sam123';
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '3306';
  
  // Disable logging in tests
  process.env.LOG_LEVEL = 'error';
  process.env.DB_LOGGING = 'false';
}

