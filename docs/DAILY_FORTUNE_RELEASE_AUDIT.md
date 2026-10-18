# Daily fortune Mountain-time release

The release boundary is midnight in `America/Denver`, including daylight saving time. The page, popup, generator and view rows use the Denver calendar date.

## Schedule correction — 2026-10-18

Job 20 (`generate-fortune-posts-daily`) previously ran at 07:00 UTC every day. Production posts on October 16–18 were created just after 01:00 Denver time: one hour late during daylight-saving time.

Migration `drizzle/migrations/0004_daily_fortune_denver_midnight.sql` preserves the original command and connection settings, schedules two daily SQL checks at 06:00 and 07:00 UTC, and executes the original command only when the Denver hour is zero. Only one generator request occurs per day; no additional image generation, financial operation or deletion occurs. Existing duplicate-date behavior is unchanged. There is no new table or policy.

## Evidence

- Today's post `7eda4294-4200-4479-a6b3-1d1c49a6246f`, fortune `520f1039-fe72-4ec2-b602-64d2bbe7a704`, date `2026-10-18`; prior creation `07:00:16.496195Z` / `01:00:16` Denver.
- Persistent test account revealed “I am growing and improving always.” through `/daily-fortune`; view `bc4ac8db-ae55-4992-9209-38f6457bb19f` records the same post/date. Reload renders the revealed quote.
- Screenshots and browser request evidence: `/tmp/browser/fortune-audit/`.
- With a Tokyo browser timezone and controlled browser clock, live date queries select October 17 at `2026-10-18T05:59:59Z`, then October 18 at `06:00:00Z`. Screenshot `5-denver-midnight.png` shows today's revealed content; no synthetic posts were used.
- Generator duplicate request at 07:18:39Z returns HTTP 200, `success:false`, `reason:already_exists`, and today's same post ID. Function logs show startup only; response and DB confirm no second post. Each October 17/18 date still has exactly one row.
- Three focused tests passed, and six database timezone evaluations agreed with their expected summer/winter/DST midnight decisions. Job 20 readback shows active and schedule `0 6,7 * * *` with the Denver guard.
- Regression: `bun vitest run tests/unit/daily-fortune-release.test.ts` exercises the applied migration's schedule/timezone/guard in summer, winter and transition dates.
- A future scheduled midnight run cannot be observed in this turn. Verify its run and creation timestamp on the next daily release; do not describe that future run as observed.

Related: `MASTER_SYSTEM_DOCS.md`, `EDGE_FUNCTIONS_REFERENCE.md`, `MIGRATION_INVENTORY.md`.