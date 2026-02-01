
# Plan: Remove Frontend Discussion Post Creation Fallback

## Root Cause Identified
The `FortuneComments.tsx` component (lines 115-157) has fallback logic that creates the discussion post when a user submits the first comment AND no discussion post exists. **Joshie commented first, so he became the author.**

## Solution
Remove this frontend fallback entirely. The discussion post should ONLY be created by the `generate-fortune-posts` edge function (which now uses the system user).

---

## Implementation

### File: `src/components/daily-features/FortuneComments.tsx`

**Remove lines 115-157** - the entire `isFirstComment` block that creates discussion posts:

```typescript
// REMOVE THIS ENTIRE BLOCK:
const isFirstComment = comments.length === 0 && !discussionPostId;

if (isFirstComment) {
  // Fetch the fortune details to create a discussion post
  const { data: fortunePost } = await supabase
    .from("daily_fortune_posts")
    .select("fortune_id, daily_fortunes(content, author, reference, source_type)")
    .eq("id", fortunePostId)
    .single();
  
  if (fortunePost?.daily_fortunes) {
    // ... creates discussion post with user.id as author
  }
}
```

**Replace with:** Nothing. Just let the comment insert proceed without creating a discussion post.

---

## Why This Is Safe

1. **The edge function now handles this** - It creates the discussion post with the system user ID
2. **If edge function fails** - Comments still work (they go to `daily_fortune_comments` table, not the discussion post)
3. **No orphaned fortunes** - The fortune card displays fine without a discussion post; comments are stored separately

---

## Optional Enhancement

If you want to ensure EVERY fortune post has a discussion post, we can add a "healing" step to the edge function that:
1. Finds any `daily_fortune_posts` where `discussion_post_id IS NULL`
2. Creates the missing discussion posts using the system user

This would fix today's Joshie situation and any future gaps.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/daily-features/FortuneComments.tsx` | Remove lines 115-157 (fallback discussion post creation) |
| `supabase/functions/generate-fortune-posts/index.ts` | (Optional) Add healing logic for missing discussion posts |
