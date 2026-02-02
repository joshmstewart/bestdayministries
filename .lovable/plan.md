
# Plan: Optimize Community Feed Loading Performance

## Problem Analysis

After analyzing the codebase, I identified several performance bottlenecks in the community feed:

### Current Architecture
- **Database View**: `community_feed_items` is a UNION ALL of 14+ different source tables
- **Query Execution**: ~29ms for the view query (not bad), but the bottleneck is elsewhere
- **Current Data**: ~145 total feed items across all sources

### Identified Bottlenecks

1. **Sequential Waterfall Queries** (Primary Issue)
   - Feed items query → wait → Profile fetch → wait → Beat plays fetch → wait → Event details fetch → wait → Like status batch (10 parallel queries)
   - Each "wait" adds network latency

2. **Subqueries in View Definition**
   - The view uses correlated subqueries for `comments_count` on discussion_posts and albums
   - These run for every row, even when not needed

3. **No Index on `created_at`** for feed source tables
   - Most feed tables lack `created_at DESC` indexes
   - The view must sort all 145+ rows without index support

4. **Like Status Batch**: 10 parallel queries to different tables
   - Even though batched, this adds latency waiting for slowest query

5. **Missing Image Preloading**
   - Images load lazily after render, causing visual delays

---

## Proposed Optimizations

### Phase 1: Database Indexes (Immediate Impact)

Add `created_at DESC` indexes to main feed source tables:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beat_pad_creations_public_created 
  ON beat_pad_creations(created_at DESC) WHERE is_public = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_colorings_public_created 
  ON user_colorings(created_at DESC) WHERE is_public = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_public_created 
  ON events(created_at DESC) WHERE is_active = true AND is_public = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prayer_requests_public_created 
  ON prayer_requests(created_at DESC) WHERE is_public = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_custom_drinks_public_created 
  ON custom_drinks(created_at DESC) WHERE is_public = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jokes_shared_created 
  ON jokes(created_at DESC) WHERE is_shared_to_feed = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_announcements_active_created 
  ON content_announcements(created_at DESC) WHERE is_active = true;
```

### Phase 2: Parallel Query Execution

Restructure `useCommunityFeed.ts` to run independent queries in parallel:

```typescript
// BEFORE: Sequential waterfall
const feedItems = await fetchFeedItems();
const profiles = await fetchProfiles(feedItems);  // waits
const beatPlays = await fetchBeatPlays(feedItems); // waits
const eventDetails = await fetchEventDetails(feedItems); // waits

// AFTER: Parallel execution
const feedItems = await fetchFeedItems();
const [profiles, beatPlays, eventDetails] = await Promise.all([
  fetchProfiles(feedItems),
  fetchBeatPlays(feedItems),
  fetchEventDetails(feedItems)
]);
```

### Phase 3: Optimized View with Pre-computed Columns

Create a materialized approach or modify the view to include event_date and location directly:

```sql
-- Add event_date and location to the view's events select
SELECT events.id,
  'event'::text AS item_type,
  events.title,
  events.description,
  events.created_by AS author_id,
  events.created_at,
  events.image_url,
  COALESCE(events.likes_count, 0) AS likes_count,
  NULL::bigint AS comments_count,
  jsonb_build_object('event_date', events.event_date, 'location', events.location) AS extra_data,
  NULL::uuid AS repost_id
FROM events
WHERE events.is_active = true AND events.is_public = true
```

This eliminates the separate event details query entirely.

### Phase 4: Skeleton Loading Improvements

Enhance the loading skeleton to show immediately with proper dimensions:

```typescript
// Show skeleton that matches actual card dimensions
if (loading) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(6)].map((_, i) => (
        <FeedItemSkeleton key={i} />
      ))}
    </div>
  );
}
```

### Phase 5: Image Preloading Strategy

Add image preloading for above-the-fold items:

```typescript
// Preload first 4 images while processing data
useEffect(() => {
  items.slice(0, 4).forEach(item => {
    if (item.image_url) {
      const img = new Image();
      img.src = item.image_url;
    }
  });
}, [items]);
```

---

## Implementation Priority

| Priority | Change | Impact | Effort |
|----------|--------|--------|--------|
| 1 | Parallel query execution | High | Low |
| 2 | Include event details in view | Medium | Low |
| 3 | Database indexes | Medium | Low |
| 4 | Image preloading | Medium | Low |
| 5 | Skeleton loading | Low | Low |

---

## Technical Details

### Files to Modify

1. **`src/hooks/useCommunityFeed.ts`**
   - Restructure to use `Promise.all` for parallel fetches
   - Remove separate event details query (will be in view)

2. **Database Migration**
   - Add 7 new indexes on feed source tables
   - Update `community_feed_items` view to include event details

3. **`src/components/feed/CommunityFeed.tsx`**
   - Add image preloading for visible items
   - Enhance skeleton with proper card dimensions

### Expected Performance Improvement

- **Current**: ~800-1200ms total load time (sequential queries + render)
- **After**: ~300-500ms total load time
- **Perceived**: Near-instant with skeleton + preloaded images

### Risk Assessment

- **Low Risk**: All changes are additive indexes and query restructuring
- **No Breaking Changes**: Maintains same API and data structure
- **Rollback**: Easy - remove indexes, revert code changes
