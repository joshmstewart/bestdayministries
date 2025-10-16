# Content Moderation - Cascade Delete Behavior

## Overview
The content moderation system includes cascade delete warnings to prevent accidental deletion of related content.

## Database Schema
The `discussion_comments` table has a foreign key to `discussion_posts`:
```sql
discussion_comments.post_id -> discussion_posts.id (ON DELETE CASCADE)
```

This means when a post is deleted, **all its comments are automatically deleted**.

## Implementation

### Posts Tab - Bulk Actions
**Location:** `src/pages/ModerationQueue.tsx`

**handleRejectAllPosts:**
1. Queries `discussion_comments` to count related comments before deletion
2. Shows confirmation with dynamic warning about cascade deletes
3. Updates success toast to reflect both posts and comments deleted

**Code Pattern:**
```typescript
const handleRejectAllPosts = async () => {
  // Count related comments BEFORE deleting posts
  const { data: allComments } = await supabase
    .from('discussion_comments')
    .select('id, post_id')
    .in('post_id', postsToDelete.map(p => p.id));
  
  const commentCount = allComments?.length || 0;
  
  // Dynamic confirmation message
  const message = commentCount > 0
    ? `Are you sure you want to reject and delete ${postsToDelete.length} posts? This will also delete ${commentCount} associated comments.`
    : `Are you sure you want to reject and delete ${postsToDelete.length} posts?`;
  
  if (!confirm(message)) return;
  
  // Delete posts (comments cascade automatically)
  await supabase
    .from('discussion_posts')
    .delete()
    .in('id', postsToDelete.map(p => p.id));
  
  // Success message reflects cascade
  const successMessage = commentCount > 0
    ? `Deleted ${postsToDelete.length} posts and ${commentCount} associated comments`
    : `Deleted ${postsToDelete.length} posts`;
  
  toast({ description: successMessage });
};
```

### Posts Tab - Individual Delete
**handleRejectPost:**
- Same pattern as bulk action
- Checks for related comments before deletion
- Shows warning in confirmation dialog
- Updates toast message to reflect cascade

### Comments Tab - Bulk Actions
**handleRejectAllComments:**
- Only affects `discussion_comments` table
- No cascade effects
- Standard confirmation and deletion

### Key Features
1. **Pre-deletion Queries:** Check for related content before showing confirmation
2. **Dynamic Warnings:** Confirmation messages adapt based on related content count
3. **Accurate Feedback:** Success toasts reflect actual deletions (including cascaded items)
4. **No Surprises:** Users are always warned about cascade effects before confirming

## User Experience
**Before Fix:**
- User deletes posts from Posts tab
- Comments silently disappear from Comments tab
- Confusing behavior, no warning

**After Fix:**
- User attempts to delete posts
- System checks for related comments
- Confirmation shows: "This will also delete 15 associated comments"
- User makes informed decision
- Success toast: "Deleted 5 posts and 15 associated comments"

## Related Files
- `src/pages/ModerationQueue.tsx` - Main implementation
- Database schema: `discussion_comments` foreign key constraint
