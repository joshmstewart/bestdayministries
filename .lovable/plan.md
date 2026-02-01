
# Fix: Announcement Timestamp Bug ("56 years ago")

## Root Cause Analysis

The `community_feed_items` view uses `published_at` as the timestamp for content announcements:
```sql
ca.published_at AS created_at
```

However, the Valentine's Day Stickers announcement was created on Jan 28 but has `published_at = NULL`. This causes:
1. **"56 years ago" display** - JavaScript's date-fns treats NULL as the Unix epoch (1970)
2. **Floating to top** - NULL values sort unpredictably, often appearing first

## Solution

Update the view to use `COALESCE(ca.published_at, ca.created_at)` so it falls back to the actual creation date when `published_at` is NULL.

## Implementation

### 1. Database Migration

Update the `community_feed_items` view to fix the announcement timestamp:

```sql
-- In the Content Announcements section of the view (line ~241):
COALESCE(ca.published_at, ca.created_at) AS created_at,
```

This ensures:
- If `published_at` exists → use it (for scheduled posts)
- If `published_at` is NULL → fall back to `created_at`

### 2. Optionally Fix the Existing Record

Update the Valentine's Day announcement to have a proper `published_at`:

```sql
UPDATE content_announcements 
SET published_at = created_at 
WHERE id = 'b74150e2-8fdb-4405-b609-d01c291cd097';
```

## Technical Details

| Item | Current | Fixed |
|------|---------|-------|
| View column | `ca.published_at` | `COALESCE(ca.published_at, ca.created_at)` |
| Valentine post timestamp | NULL → 1970 | Jan 28, 2026 |
| Sort behavior | Unpredictable | Correct chronological order |

## Files Changed

| File | Change |
|------|--------|
| New migration SQL | Recreate view with COALESCE fix |

## Benefits

- Posts without `published_at` will use their actual creation date
- No more "56 years ago" display bugs
- Proper chronological sorting in the feed
