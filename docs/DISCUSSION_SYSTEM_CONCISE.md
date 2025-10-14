# DISCUSSION SYSTEM - CONCISE DOCS

## Overview
Community discussion board (`/discussions`) where guardians create posts, users comment, with guardian approval workflow for bestie content.

## Database Tables
**discussion_posts**
- `title`, `content`, `author_id`, `image_url`, `video_id`, `youtube_url`, `album_id`, `event_id`
- `created_at`, `updated_at` (tracks edits)
- `approval_status` (approved/pending_approval/rejected)
- `is_moderated` (AI content moderation flag)
- `visible_to_roles[]` (role-based visibility)
- `allow_owner_claim` (admin consent for owner to change authorship)
- Joins: `profiles_public` (author), `videos`, `albums`, `events`

**discussion_comments**
- `content`, `author_id`, `post_id`, `audio_url`
- `created_at`, `updated_at` (tracks edits)
- `approval_status` (approved/pending_approval/rejected)
- `is_moderated` (AI content moderation flag)

## User Permissions
**Create Posts:** Guardians, Admins, Owners only
**Comment:** All authenticated users
**Edit/Delete Posts:** Author, Guardian (of bestie author), or Admin/Owner
**Edit/Delete Comments:** Author, Guardian (of bestie author), or Admin/Owner
**View:** Based on post's `visible_to_roles` array
**Change Author:** Owners only, for admin/owner posts with consent

## Content Approval Flow

### Bestie Posts (Guardian Approval Required)
1. Bestie creates post → Check `caregiver_bestie_links.require_post_approval`
2. If any guardian requires approval → `approval_status: 'pending_approval'`
3. Guardian approves/rejects at `/guardian-approvals`
4. On approve → `approval_status: 'approved'`, `is_moderated: true`

### Guardian Posts (No Approval)
- Auto-approved → `approval_status: 'approved'`
- Still goes through AI moderation

### Comments (Same Pattern)
- Check `require_comment_approval` on guardian link
- Pending → Guardian approval → Approved

## Content Moderation (AI)

### Text Moderation
- Edge function: `moderate-content`
- Checks title + content before save
- Flags inappropriate content → `is_moderated: false`

### Image Moderation
- Edge function: `moderate-image`
- Policy: `moderation_settings.discussion_post_image_policy` (all/flagged/none)
- **all**: Manual review required
- **flagged**: AI scan, flag if inappropriate
- **none**: Auto-approve
- Stores: `moderation_status`, `moderation_severity`, `moderation_reason`

## Media Attachments

### Images
- Upload to `discussion-images` bucket
- Compressed to 4.5MB max
- Crop dialog before upload (aspect ratio selection)
- Max 20MB before compression

### Videos
- **Option 1:** Select from `videos` table (admin-uploaded)
- **Option 2:** Embed YouTube URL (direct paste)
- Displays: `VideoPlayer` (uploads) or `YouTubeEmbed` (YouTube)

### Albums
- Link to existing album via `album_id`
- Shows album cover + "View Album" button
- Opens full album in lightbox

### Events
- Link to event via `event_id`
- Shows event title, date, location
- "View Event" button → `/events?eventId=xxx`

### Audio (Comments Only)
- Record or upload audio file
- Stored in `featured-bestie-audio` bucket
- Inline player in comment card

## UI Components

### DiscussionPostCard (List View)
```tsx
<Card> {/* Horizontal layout with optional media preview */}
  {/* Left: Media Preview (16:9) - if image/video/album */}
  <AspectRatio ratio={16/9}>
    {image || album.cover || video placeholder}
  </AspectRatio>
  
  {/* Right: Content */}
  <CardContent>
    {/* Author info */}
    <AvatarDisplay /> {authorName}
    <RoleBadge /> {/* UserCircle2 icon + bg-primary/10 */}
    <VendorStoreLinkBadge /> {/* if vendor */}
    <Date /> {/* with (edited) if updated_at > created_at + 60s */}
    
    {/* Title (h3, line-clamp-2) */}
    {/* Content preview (truncated 200 chars, line-clamp-3) */}
    
    {/* Linked event card */}
    {event && <EventPreview />}
    
    {/* Footer */}
    <CommentCount /> {/* MessageSquare icon */}
    <Button>Read More →</Button>
  </CardContent>
</Card>
```

### DiscussionDetailDialog (Full View)
```tsx
<Dialog>
  <DialogHeader>
    {title} <TextToSpeech /> {editButton}
    {/* Author info with role badge */}
    <AvatarDisplay /> {authorName}
    <RoleBadge /> {/* Same styling as card */}
    <Date /> {/* with (edited) indicator */}
    {deleteButton}
  </DialogHeader>
  
  <DialogContent>
    {content}
    {image || video || albumImages || linkedEvent}
    
    {/* Comments Section */}
    <CommentsHeader>Comments ({count})</CommentsHeader>
    
    {/* Comment List */}
    {comments.map(comment => (
      <CommentCard>
        <AvatarDisplay /> {authorName} <RoleBadge /> <Date />
        
        {/* Edit mode OR display mode */}
        {editingCommentId === comment.id ? (
          <EditCommentForm>
            <Textarea /> <SaveButton /> <CancelButton />
          </EditCommentForm>
        ) : (
          <>
            <CommentContent /> {audioPlayer}
            <EditButton /> {/* if currentUser = author */}
            <DeleteButton />
          </>
        )}
      </CommentCard>
    ))}
    
    {/* Add Comment Form */}
    <CommentInput /> {audioRecorder}
  </DialogContent>
</Dialog>
```

### Role Badge Styling (Consistent Across UI)
```tsx
<div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary/10 rounded-full border border-primary/20">
  <UserCircle2 className="w-3 h-3 text-primary" />
  <span className="text-xs font-semibold text-primary capitalize">
    {role === "caregiver" ? "Guardian" : role}
  </span>
</div>
```

### Create Post Form
- Title (required, max 200 chars)
- Content (required, max 2000 chars)
- Image upload (optional, with crop)
- Video selection (none/select/youtube)
- Event link (optional dropdown)
- Visibility roles (checkboxes: caregiver, bestie, supporter)
- **Allow Owner Claim** (admins and owners) - Checkbox to consent to owner changing authorship

### Comment Input
- Text OR Audio (mutually exclusive)
- Audio recorder with play/record/delete controls
- Submit → Guardian approval if required

## Search & Sorting
- **Search:** Filter posts by title/content (case-insensitive)
- **Sort:** Newest first (default) or Oldest first
- Client-side filtering (no query reload)

## Edit & Delete

### Posts
- **Who can edit:** Author, Guardian (of bestie author), Admin, Owner
- **Edit mode:** Opens create form with existing data pre-filled
- **Updated timestamp:** `updated_at` auto-updates on save
- **"Edited" indicator:** Shows "(edited)" next to date if `updated_at > created_at + 60s`
- **Delete:** Confirmation dialog, cascades to comments

### Comments  
- **Who can edit:** Author only (comment.author_id === currentUserId)
- **Edit mode:** Inline textarea with Save/Cancel buttons
- **Updated timestamp:** `updated_at` auto-updates on save
- **"Edited" indicator:** Shows "(edited)" next to date if `updated_at > created_at + 60s`
- **Delete:** Author, Guardian (of bestie author), Admin, Owner

### Change Author (Owner Only)
- Owners can claim admin/owner posts with `allow_owner_claim = true`
- Admin creates post → checks "Allow owner to claim this post"
- Owner sees "Claim Post" button → selects new author from admin/owner list
- Post authorship transfers, useful for founder claiming assistant's work

## Realtime Updates
- Subscribe to `discussion_posts` for new posts
- Subscribe to `discussion_comments` for new comments
- Auto-refresh on changes

## RLS Policies
**Posts SELECT:**
- Approved posts: Visible to roles in `visible_to_roles[]`
- Pending/rejected: Only author, guardian, admin

**Posts UPDATE:**
- Author can update own posts
- Guardians can update their linked besties' posts
- Admins/owners can update any post

**Posts INSERT:**
- Guardians, admins, owners only

**Comments SELECT:**
- Approved: All authenticated
- Pending/rejected: Author, guardian, admin

**Comments UPDATE:**
- Author can update own comments
- Guardians can update their linked besties' comments
- Admins/owners can update any comment

**Comments INSERT:**
- All authenticated users

## Validation
- **Title:** 1-200 chars
- **Content:** 1-2000 chars
- **Image:** Max 20MB, image/* types only
- **YouTube:** Valid URL format

## Key Files
- `src/pages/Discussions.tsx` - Main page with list view
- `src/components/DiscussionPostCard.tsx` - Card component for list view
- `src/components/DiscussionDetailDialog.tsx` - Full post view with comments and editing
- `supabase/functions/moderate-content/index.ts` - Text moderation
- `supabase/functions/moderate-image/index.ts` - Image moderation
- `src/lib/validation.ts` - Input validation schemas

## Common Issues
| Issue | Solution |
|-------|----------|
| Post not showing | Check `is_moderated` flag and `visible_to_roles` |
| Approval stuck | Verify guardian link has approval enabled |
| Image moderation fails | Check `moderation_settings` policy |
| Role badge missing | Fetch role from `user_roles` table, not `profiles` |
| Guardian can't edit bestie post | UI loads editable posts on page load, check `caregiver_bestie_links` |
| "Claim Post" not showing | Verify: owner role + admin created post + `allow_owner_claim = true` |
| Edit button not showing | Verify `currentUserId === author_id` for comments |
| "(edited)" not showing | Check `updated_at > created_at + 60000ms` (60 seconds) |
