import * as moment from 'moment-timezone';

/**
 * Validate if a timezone string is a valid IANA timezone
 * @param timezone Timezone string to validate
 * @returns true if valid, false otherwise
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    return moment.tz.zone(timezone) !== null;
  } catch {
    return false;
  }
}

