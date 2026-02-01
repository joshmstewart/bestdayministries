
# Plan: Stop Daily Inspiration from Creating Main Feed Posts

## Current Behavior
The `generate-fortune-posts` edge function creates **both**:
1. A `daily_fortune_posts` entry (the fortune card shown on the community page)
2. A `discussion_posts` entry (for comments - BUT this automatically appears in the main feed)

The `community_feed_items` view includes ALL discussion posts where `is_moderated = true`, which is why Daily Inspiration posts appear in the main feed.

## Solution
**Simply stop creating the discussion post entirely.** The fortune card already has its own comment system (`daily_fortune_comments` table) that works independently.

---

## Implementation

### 1. Update Edge Function: `supabase/functions/generate-fortune-posts/index.ts`

**Remove lines 117-165** - the entire section that creates the discussion post:

```typescript
// REMOVE THIS ENTIRE BLOCK:
// Create a discussion post for comments using the system user
// First, try to get the dedicated system user from app_settings
const { data: systemUserSetting } = await adminClient
  .from("app_settings")
  .select("setting_value")
  .eq("setting_key", "system_user_id")
  .maybeSingle();
  
// ... all the way through the discussion post creation ...
```

The fortune card already has:
- Its own comments via `daily_fortune_comments` table
- Its own likes via `daily_fortune_likes` table
- No need for a separate `discussion_posts` entry

### 2. Delete Today's Incorrectly Created Post

Delete the discussion post created today (ID: `5923c4f4-0cbd-4f81-8348-4959ba3ef5b2`):

```sql
DELETE FROM discussion_posts 
WHERE id = '5923c4f4-0cbd-4f81-8348-4959ba3ef5b2';
```

Also update today's fortune post to clear the link:

```sql
UPDATE daily_fortune_posts 
SET discussion_post_id = NULL 
WHERE discussion_post_id = '5923c4f4-0cbd-4f81-8348-4959ba3ef5b2';
```

---

## Changes Summary

| File/Table | Change |
|------------|--------|
| `generate-fortune-posts/index.ts` | Remove discussion post creation logic (lines 117-165) |
| `discussion_posts` table | Delete today's post (ID: `5923c4f4-...`) |
| `daily_fortune_posts` table | Clear the `discussion_post_id` reference |

## Benefits
- Daily Inspiration stays on the fortune card only
- Main community feed shows only user-generated content
- Simpler architecture (no redundant discussion post)
- Fortune comments continue to work via `daily_fortune_comments` table
