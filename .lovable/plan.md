
# Show Past Daily Fortunes as Revealed Quotes in the Feed

## Problem
Fortune posts in the community feed always display as "Tap to reveal today's inspiration" blind cards, even after the fortune's day has passed. Once the fortune is no longer the current day's fortune, there's no reason to hide it -- users should see the actual quote directly.

## Solution

### 1. Update the database view to include the fortune's date
Add `post_date` from the `daily_fortune_posts` table into the `extra_data` JSON for fortune-type feed items. This lets the frontend determine whether the fortune is from today or a past day.

### 2. Update the feed card rendering
In the `FeedItem` component, compare the fortune's `post_date` against today's MST date:
- **Today's fortune**: Keep the current "Tap to reveal" blind card behavior
- **Past fortunes**: Display the actual quote text directly in a styled card (using the fortune's gradient styling), with the author attribution if available

---

## Technical Details

### Database View Change
Modify the `community_feed_items` view's fortune section to JOIN `daily_fortune_posts` and include the `post_date` and fortune content in `extra_data`:

```sql
-- For the discussion_posts fortune section:
-- JOIN daily_fortune_posts to get post_date and fortune content
-- extra_data will include: is_fortune_post, fortune_post_id, post_date, fortune_content, fortune_author
```

The JOIN: `daily_fortune_posts dfp ON dfp.discussion_post_id = dp.id` with `daily_fortunes df ON dfp.fortune_id = df.id`

### Frontend Change (FeedItem.tsx)
- Extract `post_date` from `item.extra_data`
- Compare with current MST date using the existing `getMSTDate()` pattern
- If `post_date` is before today: render the fortune quote directly in a styled container with author attribution and a text-to-speech button
- If `post_date` is today (or missing): keep the existing "Tap to reveal" card

### Files Modified
- **New SQL migration**: Update `community_feed_items` view to include fortune metadata
- **src/components/feed/FeedItem.tsx**: Conditional rendering for past vs. today fortunes
