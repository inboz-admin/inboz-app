import { DateTime } from 'luxon';

/**
 * Convert a date/time string in a specific timezone to UTC
 * 
 * @param dateTimeString - Date/time string in format "YYYY-MM-DDTHH:mm:ss" (no timezone info)
 * @param timezone - IANA timezone string (e.g., "Asia/Dubai", "America/New_York")
 * @returns Date object in UTC
 * 
 * @example
 * // User selects 9:15 AM in Dubai timezone
 * convertToUtc("2025-01-15T09:15:00", "Asia/Dubai")
 * // Returns: Date representing 9:15 AM Dubai time in UTC
 */
export function convertToUtc(dateTimeString: string, timezone: string = 'UTC'): Date {
  try {
    // Parse the date/time string in the specified timezone
    const zonedDateTime = DateTime.fromISO(dateTimeString, { zone: timezone });
    
    if (!zonedDateTime.isValid) {
      throw new Error(`Invalid date/time string: ${dateTimeString} in timezone ${timezone}`);
    }
    
    // Convert to UTC
    const utcDateTime = zonedDateTime.toUTC();
    
    return utcDateTime.toJSDate();
  } catch (error) {
    throw new Error(`Failed to convert date/time to UTC: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Convert a UTC date to a specific timezone for display
 * 
 * @param utcDate - Date object in UTC
 * @param timezone - IANA timezone string
 * @returns Date object representing the same moment in the specified timezone
 * 
 * @example
 * // Convert UTC date to Dubai timezone for display
 * convertFromUtc(utcDate, "Asia/Dubai")
 */
export function convertFromUtc(utcDate: Date, timezone: string = 'UTC'): Date {
  try {
    const utcDateTime = DateTime.fromJSDate(utcDate, { zone: 'utc' });
    const zonedDateTime = utcDateTime.setZone(timezone);
    return zonedDateTime.toJSDate();
  } catch (error) {
    throw new Error(`Failed to convert UTC date to timezone: ${error instanceof Error ? error.message : String(error)}`);
  }
}

