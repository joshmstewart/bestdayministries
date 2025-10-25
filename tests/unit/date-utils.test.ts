import { describe, it, expect } from 'vitest';

/**
 * UNIT TESTS: Date & Timezone Utilities
 * 
 * Tests date formatting, timezone conversions, and MST calculations.
 * These are pure functions that don't require E2E testing.
 */

describe('Date & Timezone Utilities', () => {
  
  describe('MST Date Conversion', () => {
    const getMSTDate = (date?: Date): string => {
      const now = date || new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const mstOffset = -7 * 60 * 60000; // MST is UTC-7
      const mstTime = new Date(utc + mstOffset);
      return mstTime.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    it('should convert UTC to MST date format', () => {
      const utcDate = new Date('2024-01-15T10:00:00Z');
      const mstDate = getMSTDate(utcDate);
      expect(mstDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return YYYY-MM-DD format', () => {
      const mstDate = getMSTDate();
      expect(mstDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle date boundary correctly', () => {
      // 1:00 AM UTC is 6:00 PM MST previous day
      const utcDate = new Date('2024-01-15T01:00:00Z');
      const mstDate = getMSTDate(utcDate);
      expect(mstDate).toBe('2024-01-14');
    });

    it('should handle midnight MST correctly', () => {
      // 7:00 AM UTC is midnight MST
      const utcDate = new Date('2024-01-15T07:00:00Z');
      const mstDate = getMSTDate(utcDate);
      expect(mstDate).toBe('2024-01-15');
    });

    it('should be consistent for same input', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const mstDate1 = getMSTDate(date);
      const mstDate2 = getMSTDate(date);
      expect(mstDate1).toBe(mstDate2);
    });
  });

  describe('Date Comparison', () => {
    const isSameDay = (date1: Date, date2: Date): boolean => {
      return date1.toDateString() === date2.toDateString();
    };

    it('should identify same day', () => {
      const date1 = new Date('2024-01-15T10:00:00Z');
      const date2 = new Date('2024-01-15T18:00:00Z');
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should identify different days', () => {
      const date1 = new Date('2024-01-15T23:59:59Z');
      const date2 = new Date('2024-01-16T00:00:00Z');
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should handle dates far apart', () => {
      const date1 = new Date('2024-01-15T10:00:00Z');
      const date2 = new Date('2024-06-15T10:00:00Z');
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('Timezone Detection', () => {
    it('should get user timezone', () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      expect(timezone).toBeTruthy();
      expect(typeof timezone).toBe('string');
      expect(timezone.length).toBeGreaterThan(0);
    });

    it('should have valid timezone format', () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Should be like "America/Denver" or "UTC"
      expect(timezone).toMatch(/^[A-Za-z_]+\/[A-Za-z_]+$|^UTC$/);
    });
  });

  describe('Date Formatting', () => {
    const formatDate = (dateString: string | null): string => {
      if (!dateString) return '-';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    it('should format date correctly', () => {
      const formatted = formatDate('2024-01-15T10:00:00Z');
      expect(formatted).toMatch(/^[A-Za-z]+ \d{1,2}, \d{4}$/);
    });

    it('should handle null dates', () => {
      expect(formatDate(null)).toBe('-');
    });

    it('should handle invalid date strings', () => {
      const formatted = formatDate('invalid-date');
      expect(formatted).toBe('Invalid Date');
    });

    it('should format different dates consistently', () => {
      const date1 = formatDate('2024-01-15T10:00:00Z');
      const date2 = formatDate('2024-01-15T18:00:00Z');
      expect(date1).toBe(date2); // Same day, different time
    });
  });

  describe('Time Calculations', () => {
    const minutesToMs = (minutes: number): number => minutes * 60 * 1000;
    const hoursToMs = (hours: number): number => hours * 60 * 60 * 1000;
    const daysToMs = (days: number): number => days * 24 * 60 * 60 * 1000;

    it('should convert minutes to milliseconds', () => {
      expect(minutesToMs(1)).toBe(60000);
      expect(minutesToMs(60)).toBe(3600000);
    });

    it('should convert hours to milliseconds', () => {
      expect(hoursToMs(1)).toBe(3600000);
      expect(hoursToMs(24)).toBe(86400000);
    });

    it('should convert days to milliseconds', () => {
      expect(daysToMs(1)).toBe(86400000);
      expect(daysToMs(7)).toBe(604800000);
    });

    it('should calculate time differences', () => {
      const now = new Date('2024-01-15T10:00:00Z');
      const future = new Date('2024-01-15T11:00:00Z');
      const diff = future.getTime() - now.getTime();
      expect(diff).toBe(hoursToMs(1));
    });

    it('should handle negative time differences', () => {
      const now = new Date('2024-01-15T10:00:00Z');
      const past = new Date('2024-01-15T09:00:00Z');
      const diff = now.getTime() - past.getTime();
      expect(diff).toBe(hoursToMs(1));
      expect(diff).toBeGreaterThan(0);
    });
  });
});
