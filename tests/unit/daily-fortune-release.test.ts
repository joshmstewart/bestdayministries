// Tests the schedule and timezone in the actual applied migration, not a parallel production helper.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('drizzle/migrations/0004_daily_fortune_denver_midnight.sql', 'utf8');
const schedule = migration.match(/schedule := '([^']+)'/)?.[1];
const timezone = migration.match(/AT TIME ZONE ''([^']+)''/)?.[1];
const midnight = migration.match(/\) = (\d+) THEN/)?.[1];

function runsAt(iso: string) {
  if (!schedule || !timezone || midnight === undefined) throw new Error('Missing release schedule');
  const date = new Date(iso);
  const hours = schedule.split(' ')[1].split(',').map(Number);
  const localHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', hourCycle: 'h23' }).format(date));
  return date.getUTCMinutes() === 0 && hours.includes(date.getUTCHours()) && localHour === Number(midnight);
}

describe('Daily fortune Denver midnight release', () => {
  it('releases once at midnight during daylight-saving time, not one hour late', () => {
    expect(runsAt('2026-10-18T06:00:00Z')).toBe(true);
    expect(runsAt('2026-10-18T07:00:00Z')).toBe(false);
  });
  it('releases once at midnight during standard time, not one hour early', () => {
    expect(runsAt('2026-12-18T06:00:00Z')).toBe(false);
    expect(runsAt('2026-12-18T07:00:00Z')).toBe(true);
  });
  it('uses the correct midnight on both daylight-saving transition dates', () => {
    expect(runsAt('2026-03-08T07:00:00Z')).toBe(true);
    expect(runsAt('2026-03-08T06:00:00Z')).toBe(false);
    expect(runsAt('2026-11-01T06:00:00Z')).toBe(true);
    expect(runsAt('2026-11-01T07:00:00Z')).toBe(false);
  });
});