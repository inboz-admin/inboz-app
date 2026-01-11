export const ERRORS = {
  EMAIL_REQUIRED: 'Email is required',
  INVALID_EMAIL_FORMAT: 'Invalid email format',
  PERSONAL_GMAIL_NOT_ALLOWED:
    'Personal Gmail accounts are not supported. Please sign in with your Google Workspace account (e.g., yourname@yourcompany.com).',
  ORGANIZATION_CREATION_FAILED: 'Failed to create default organization',
} as const;

export const TOKEN_EXPIRY = {
  ACCESS_TOKEN_MS: 3600 * 1000,
  DATA_RETENTION_MS: 365 * 24 * 60 * 60 * 1000,
} as const;

