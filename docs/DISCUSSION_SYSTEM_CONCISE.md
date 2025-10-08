# DISCUSSION SYSTEM - CONCISE DOCS

## Overview
Community discussion board (`/discussions`) where guardians create posts, users comment, with guardian approval workflow for bestie content.

## Database Tables
**discussion_posts**
- `title`, `content`, `author_id`, `image_url`, `video_id`, `youtube_url`, `album_id`, `event_id`
- `approval_status` (approved/pending_approval/rejected)
- `is_moderated` (AI content moderation flag)
- `visible_to_roles[]` (role-based visibility)
- `allow_owner_claim` (admin consent for owner to change authorship)
- Joins: `profiles_public` (author), `videos`, `albums`, `events`

**discussion_comments**
- `content`, `author_id`, `post_id`, `audio_url`
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

### Post Card
```tsx
<Card>
  {/* Image/Video/Album preview */}
  <CardHeader>
    <AvatarDisplay /> {authorName} {roleBadge}
    <TextToSpeech text={title + content} />
  </CardHeader>
  <CardContent>
    {title} {content}
    {linkedEvent} {linkedAlbum}
    <CommentSection />
  </CardContent>
</Card>
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

## Edit/Delete
- **Posts:** Author, Guardian (of bestie author), or Admin can edit/delete
- **Edit:** Inline form (title, content, media, allow_owner_claim checkbox for admins)
- **Delete:** Confirmation dialog, cascade deletes comments
- **Change Author (Owner Only):** Owners can claim admin/owner posts with `allow_owner_claim = true`
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
- `src/pages/Discussions.tsx` - Main page
- `supabase/functions/moderate-content/index.ts` - Text moderation
- `supabase/functions/moderate-image/index.ts` - Image moderation
- `src/lib/validation.ts` - Input validation schemas

## Common Issues
| Issue | Solution |
|-------|----------|
| Post not showing | Check `is_moderated` flag and `visible_to_roles` |
| Approval stuck | Verify guardian link has approval enabled |
| Image moderation fails | Check `moderation_settings` policy |
| Role badge missing | Ensure joining `profiles_public` (has role) |
| Guardian can't edit bestie post | UI loads editable posts on page load, check `caregiver_bestie_links` |
| "Claim Post" not showing | Verify: owner role + admin created post + `allow_owner_claim = true` |
