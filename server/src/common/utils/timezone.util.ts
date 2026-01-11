/**
 * Timezone Utility - Simple and Clear using moment-timezone
 * 
 * RULE: All times stored in UTC, but calculations use provided timezone
 * 
 * No hardcoded timezones - all functions accept timezone parameter
 */

const moment = require('moment-timezone');

/**
 * Get midnight in specified timezone for a given day
 * @param dayOffset Days from today (0 = today, 1 = tomorrow, etc.)
 * @param timezone IANA timezone string (default: 'UTC')
 * @returns Date in UTC representing midnight in the specified timezone
 */
export function getMidnightInTimezone(dayOffset: number = 0, timezone: string = 'UTC'): Date {
  // Use moment-timezone to get midnight in specified timezone, then convert to UTC
  const midnightInTZ = moment.tz(timezone)
    .add(dayOffset, 'days')
    .startOf('day'); // Sets to 00:00:00 in the timezone
  
  // Convert to UTC Date object
  return midnightInTZ.utc().toDate();
}

/**
 * Format a UTC date for display in specified timezone
 * @param utcDate Date in UTC
 * @param timezone IANA timezone string (default: 'UTC')
 * @returns Formatted string in the specified timezone
 */
export function formatDateInTimezone(utcDate: Date, timezone: string = 'UTC'): string {
  return moment.utc(utcDate)
    .tz(timezone)
    .format('DD MMM YYYY, h:mm A z'); // e.g., "23 Nov 2025, 12:00 AM EST"
}

/**
 * Get midnight in user's timezone for a given day (DEPRECATED - use getMidnightInTimezone)
 * @param dayOffset Days from today (0 = today, 1 = tomorrow, etc.)
 * @returns Date in UTC representing midnight in UTC (default)
 * @deprecated Use getMidnightInTimezone(dayOffset, timezone) instead
 */
export function getMidnightInUserTimezone(dayOffset: number = 0): Date {
  // Backward compatibility: default to UTC (not IST)
  return getMidnightInTimezone(dayOffset, 'UTC');
}

/**
 * Format a UTC date for display in user's timezone (DEPRECATED - use formatDateInTimezone)
 * @param utcDate Date in UTC
 * @returns Formatted string in UTC (default)
 * @deprecated Use formatDateInTimezone(utcDate, timezone) instead
 */
export function formatDateForUser(utcDate: Date): string {
  // Backward compatibility: default to UTC (not IST)
  return formatDateInTimezone(utcDate, 'UTC');
}
