/**
 * Event Timezone Utilities
 * 
 * Formats event dates/times in the event's own timezone (not the viewer's local timezone).
 * This ensures users see the time as it is at the event location.
 */

export const TIMEZONE_OPTIONS = [
  { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST - no DST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKST/AKDT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'UTC', label: 'UTC' },
] as const;

/**
 * Get the short timezone abbreviation for a given IANA timezone and date.
 * e.g., "MST", "MDT", "EST", "EDT", "PST", "PDT"
 */
export function getTimezoneAbbreviation(timezone: string, date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(date);
    
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart?.value || timezone;
  } catch {
    return 'MST';
  }
}

/**
 * Format a time in the event's timezone with timezone abbreviation.
 * e.g., "7:00 PM MST"
 */
export function formatEventTime(date: Date, timezone: string = 'America/Denver'): string {
  try {
    const timeStr = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
    
    const abbr = getTimezoneAbbreviation(timezone, date);
    return `${timeStr} ${abbr}`;
  } catch {
    // Fallback to date-fns format
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
}

/**
 * Format a full date in the event's timezone.
 * e.g., "Monday, January 15, 2024"
 */
export function formatEventDate(date: Date, timezone: string = 'America/Denver'): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
}

/**
 * Format a short date in the event's timezone.
 * e.g., "Jan 15, 2024"
 */
export function formatEventDateShort(date: Date, timezone: string = 'America/Denver'): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

/**
 * Format date + time for display like "PPP" but timezone-aware.
 * e.g., "January 15, 2024"
 */
export function formatEventDateMedium(date: Date, timezone: string = 'America/Denver'): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}

/**
 * Format weekday + full date like "PPPP" but timezone-aware.
 * e.g., "Monday, January 15th, 2024"
 */
export function formatEventDateFull(date: Date, timezone: string = 'America/Denver'): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
}

/**
 * Format date like "EEEE, MMMM d, yyyy" but timezone-aware.
 */
export function formatEventDateWeekday(date: Date, timezone: string = 'America/Denver'): string {
  return formatEventDateFull(date, timezone);
}

/**
 * Get the timezone label for display.
 */
export function getTimezoneLabel(timezone: string): string {
  const option = TIMEZONE_OPTIONS.find(o => o.value === timezone);
  return option?.label || timezone;
}
