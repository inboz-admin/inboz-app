/**
 * Standard Timezones - 36 major timezones covering all regions
 * Used for campaign step timezone selection
 */
export const STANDARD_TIMEZONES = [
  // Americas
  'America/New_York',      // EST/EDT (UTC-5/-4)
  'America/Chicago',       // CST/CDT (UTC-6/-5)
  'America/Denver',        // MST/MDT (UTC-7/-6)
  'America/Los_Angeles',   // PST/PDT (UTC-8/-7)
  'America/Phoenix',       // MST (UTC-7, no DST)
  'America/Anchorage',     // AKST/AKDT (UTC-9/-8)
  'America/Honolulu',      // HST (UTC-10, no DST)
  'America/Toronto',       // EST/EDT (UTC-5/-4)
  'America/Vancouver',     // PST/PDT (UTC-8/-7)
  'America/Mexico_City',   // CST (UTC-6)
  'America/Sao_Paulo',     // BRT (UTC-3)
  'America/Buenos_Aires',  // ART (UTC-3)
  'America/Lima',          // PET (UTC-5)
  
  // Europe
  'Europe/London',         // GMT/BST (UTC+0/+1)
  'Europe/Paris',          // CET/CEST (UTC+1/+2)
  'Europe/Berlin',         // CET/CEST (UTC+1/+2)
  'Europe/Rome',           // CET/CEST (UTC+1/+2)
  'Europe/Madrid',         // CET/CEST (UTC+1/+2)
  'Europe/Amsterdam',      // CET/CEST (UTC+1/+2)
  'Europe/Stockholm',      // CET/CEST (UTC+1/+2)
  'Europe/Moscow',         // MSK (UTC+3)
  'Europe/Istanbul',       // TRT (UTC+3)
  
  // Middle East
  'Asia/Dubai',            // GST (UTC+4)
  'Asia/Riyadh',           // AST (UTC+3)
  'Asia/Kuwait',           // AST (UTC+3)
  'Asia/Doha',             // AST (UTC+3)
  'Asia/Tehran',           // IRST (UTC+3:30)
  'Asia/Tel_Aviv',         // IST (UTC+2/+3)
  'Asia/Beirut',           // EET (UTC+2/+3)
  'Asia/Amman',            // EET (UTC+2/+3)
  
  // Asia
  'Asia/Karachi',          // PKT (UTC+5)
  'Asia/Kolkata',          // IST (UTC+5:30)
  'Asia/Dhaka',            // BST (UTC+6)
  'Asia/Bangkok',          // ICT (UTC+7)
  'Asia/Ho_Chi_Minh',      // ICT (UTC+7)
  'Asia/Jakarta',          // WIB (UTC+7)
  'Asia/Singapore',        // SGT (UTC+8)
  'Asia/Kuala_Lumpur',     // MYT (UTC+8)
  'Asia/Hong_Kong',        // HKT (UTC+8)
  'Asia/Shanghai',         // CST (UTC+8)
  'Asia/Taipei',           // CST (UTC+8)
  'Asia/Manila',           // PHT (UTC+8)
  'Asia/Tokyo',            // JST (UTC+9)
  'Asia/Seoul',            // KST (UTC+9)
  
  // Oceania
  'Australia/Sydney',      // AEDT/AEST (UTC+11/+10)
  'Australia/Melbourne',   // AEDT/AEST (UTC+11/+10)
  'Australia/Perth',       // AWST (UTC+8)
  'Pacific/Auckland',      // NZDT/NZST (UTC+13/+12)
  
  // Africa
  'Africa/Johannesburg',   // SAST (UTC+2)
  'Africa/Cairo',          // EET (UTC+2)
  
  // UTC
  'UTC',                   // UTC (UTC+0)
] as const;

export type StandardTimezone = (typeof STANDARD_TIMEZONES)[number];

