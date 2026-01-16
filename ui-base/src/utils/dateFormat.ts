import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Format date in organization's timezone
 * Uses the organization timezone from the user's organization
 * Falls back to UTC if timezone is not available
 * 
 * @param dateString - Date string (UTC from backend)
 * @param timezone - Organization timezone (IANA timezone string, e.g., "America/New_York")
 * @param formatString - Optional format string (default: "MMM dd, yyyy HH:mm")
 * @returns Formatted date string in organization timezone
 */
export function formatDateInOrgTimezone(
  dateString: string | null | undefined,
  timezone: string = 'UTC',
  formatString: string = 'MMM dd, yyyy HH:mm'
): string {
  if (!dateString) return '-';
  
  try {
    // Parse the UTC date string
    const utcDate = new Date(dateString);
    
    // If timezone is UTC or not provided, use simple format
    if (!timezone || timezone === 'UTC') {
      return format(utcDate, formatString);
    }
    
    // Format in the specified timezone using date-fns-tz
    return formatInTimeZone(utcDate, timezone, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

/**
 * Format date using browser's Intl API (no external dependencies)
 * Useful when you want to avoid date-fns-tz dependency
 * 
 * @param dateString - Date string (UTC from backend)
 * @param timezone - Organization timezone (IANA timezone string)
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string in organization timezone
 */
export function formatDateIntl(
  dateString: string | null | undefined,
  timezone: string = 'UTC',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  if (!dateString) return '-';
  
  try {
    const utcDate = new Date(dateString);
    const formatter = new Intl.DateTimeFormat('en-US', {
      ...options,
      timeZone: timezone || 'UTC',
    });
    return formatter.format(utcDate);
  } catch (error) {
    console.error('Error formatting date with Intl:', error);
    return dateString;
  }
}

/**
 * Format date for table display (date only)
 * @param dateString - Date string (UTC from backend)
 * @param timezone - Organization timezone
 * @returns Formatted date string (e.g., "Jan 16, 2025")
 */
export function formatDateOnly(
  dateString: string | null | undefined,
  timezone: string = 'UTC'
): string {
  return formatDateInOrgTimezone(dateString, timezone, 'MMM dd, yyyy');
}

/**
 * Format date and time with timezone for table display
 * @param dateString - Date string (UTC from backend)
 * @param timezone - Organization timezone
 * @returns Formatted date string with timezone (e.g., "Jan 16, 2025 01:30 EST")
 */
export function formatDateTimeWithTzShort(
  dateString: string | null | undefined,
  timezone: string = 'UTC'
): string {
  if (!dateString) return '-';
  
  try {
    const utcDate = new Date(dateString);
    
    if (!timezone || timezone === 'UTC') {
      return format(utcDate, 'MMM dd, yyyy HH:mm') + ' UTC';
    }
    
    // Get timezone abbreviation
    const tzAbbr = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    }).formatToParts(utcDate).find(part => part.type === 'timeZoneName')?.value || '';
    
    return formatInTimeZone(utcDate, timezone, 'MMM dd, yyyy HH:mm') + ` ${tzAbbr}`;
  } catch (error) {
    console.error('Error formatting date with timezone:', error);
    return dateString;
  }
}

/**
 * Format date and time for table display
 * @param dateString - Date string (UTC from backend)
 * @param timezone - Organization timezone
 * @returns Formatted date string (e.g., "Jan 16, 2025 01:30")
 */
export function formatDateTime(
  dateString: string | null | undefined,
  timezone: string = 'UTC'
): string {
  return formatDateInOrgTimezone(dateString, timezone, 'MMM dd, yyyy HH:mm');
}

/**
 * Format date with timezone abbreviation
 * @param dateString - Date string (UTC from backend)
 * @param timezone - Organization timezone
 * @returns Formatted date string with timezone (e.g., "Jan 16, 2025 01:30 EST")
 */
export function formatDateTimeWithTz(
  dateString: string | null | undefined,
  timezone: string = 'UTC'
): string {
  if (!dateString) return '-';
  
  try {
    const utcDate = new Date(dateString);
    
    if (!timezone || timezone === 'UTC') {
      return format(utcDate, 'MMM dd, yyyy HH:mm') + ' UTC';
    }
    
    // Get timezone abbreviation
    const tzAbbr = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    }).formatToParts(utcDate).find(part => part.type === 'timeZoneName')?.value || '';
    
    return formatInTimeZone(utcDate, timezone, 'MMM dd, yyyy HH:mm') + ` ${tzAbbr}`;
  } catch (error) {
    console.error('Error formatting date with timezone:', error);
    return dateString;
  }
}
