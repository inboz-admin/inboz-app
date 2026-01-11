export const BOUNCE_THRESHOLD = 3;

export const DEFAULT_BATCH_SIZE = 500;
export const MIN_BATCH_SIZE = 100;
export const MAX_BATCH_SIZE = 2000;
export const TARGET_BATCH_TIME_MS = 1000;

export const PROGRESS_THROTTLE_INTERVAL_MS = 500;

export const DUPLICATE_CHECK_CHUNK_SIZE = 1000;

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const ALLOWED_FILE_EXTENSIONS = ['.csv'];
export const ALLOWED_MIME_TYPES = ['text/csv', 'application/vnd.ms-excel'];

export const CONTACT_SEARCH_FIELDS = ['email', 'firstName', 'lastName', 'company'] as const;

export const CONTACT_STATUS_TRANSITIONS = {
  ACTIVE: ['UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED', 'INACTIVE'],
  UNSUBSCRIBED: ['ACTIVE'],
  BOUNCED: ['ACTIVE'],
  COMPLAINED: ['ACTIVE'],
  INACTIVE: ['ACTIVE'],
} as const;

export const SELECTION_SESSION_EXPIRY_MINUTES = 30;
export const MAX_CONTACTS_PER_SESSION = 10000;
export const MAX_ROWS_PER_BULK_UPLOAD = 10000;

