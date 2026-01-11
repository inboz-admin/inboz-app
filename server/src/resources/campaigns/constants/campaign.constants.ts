import { EmailMessageStatus } from '../entities/email-message.entity';

/**
 * Campaign module constants
 * Centralizes magic numbers and status groups for maintainability
 */

// Time-based constants
export const MAX_SCHEDULE_DAYS = 365;
export const QUOTA_CHECK_WINDOW_DAYS = 30;
export const SAFETY_BUFFER_DAYS = 10;

// Batch processing constants
export const BATCH_SIZE_RESUME = 500;
export const BATCH_SIZE_EMAIL_UPDATE = 500;

// Email status groups for common filtering patterns
export const EMAIL_STATUS_GROUPS = {
  /** Emails currently being processed (queued or sending) */
  IN_PROGRESS: [
    EmailMessageStatus.QUEUED,
    EmailMessageStatus.SENDING,
  ] as EmailMessageStatus[],

  /** Emails that have been successfully sent or delivered */
  COMPLETED: [
    EmailMessageStatus.SENT,
    EmailMessageStatus.DELIVERED,
  ] as EmailMessageStatus[],

  /** Final states (success or failure) */
  FINAL: [
    EmailMessageStatus.SENT,
    EmailMessageStatus.DELIVERED,
    EmailMessageStatus.BOUNCED,
    EmailMessageStatus.FAILED,
  ] as EmailMessageStatus[],

  /** Emails that can be re-queued */
  CANCELLABLE: [
    EmailMessageStatus.QUEUED,
    EmailMessageStatus.SENDING,
  ] as EmailMessageStatus[],

  /** Emails that are cancelled */
  CANCELLED: [
    EmailMessageStatus.CANCELLED,
  ] as EmailMessageStatus[],
} as const;

// Campaign status transitions (for reference, actual logic in state machine)
export const CAMPAIGN_STATUSES = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type CampaignStatus = typeof CAMPAIGN_STATUSES[keyof typeof CAMPAIGN_STATUSES];



