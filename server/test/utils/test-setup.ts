/**
 * Test Setup
 * 
 * Global test configuration and setup utilities
 * This file is executed automatically by Jest via setupFilesAfterEnv
 * 
 * IMPORTANT: This runs BEFORE tests but AFTER modules might be imported.
 * We need to FORCE override any values that might have been loaded from .env files.
 */

/**
 * Setup test environment variables
 * IMPORTANT: This must be called BEFORE any modules are imported
 */
export function setupTestEnvironment(): void {
  // Set test environment FIRST
  process.env.NODE_ENV = 'test';
  
  // FORCE test database configuration - ALWAYS use email_tool_test database for E2E tests
  // Override ANY existing values (including from .env files) to ensure we use test database
  // This is critical because ConfigModule might load .env files that override these values
  process.env.DB_NAME = 'email_tool_test';
  process.env.DB_USERNAME = 'sam1';
  process.env.DB_PASSWORD = 'sam123';
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '3306';
  
  // Disable logging in tests
  process.env.LOG_LEVEL = 'error';
  process.env.DB_LOGGING = 'false';
}

// Automatically setup test environment when this file is loaded
// This ensures environment variables are set BEFORE any modules are imported
setupTestEnvironment();

/**
 * Cleanup test environment
 */
export function cleanupTestEnvironment(): void {
  // Reset environment variables if needed
  delete process.env.NODE_ENV;
}

/**
 * Mock console methods to reduce noise in tests
 */
export function mockConsole(): void {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as any;
}

/**
 * Restore console methods
 */
export function restoreConsole(): void {
  // Console is automatically restored by Jest
}

/**
 * Setup before all tests
 */
export function setupBeforeAll(): void {
  setupTestEnvironment();
}

/**
 * Cleanup after all tests
 */
export function cleanupAfterAll(): void {
  cleanupTestEnvironment();
}

