# VIDEO SYSTEM - COMPLETE DOCS

## Components

### VideoPlayer (`src/components/VideoPlayer.tsx`)
Custom HTML5 player for uploaded videos with auto-hiding controls, dynamic aspect ratio, responsive sizing.

**Props:** `src` (video URL), `poster?` (thumbnail), `title?`, `className?`

**Critical Aspect Ratio Behavior:**
- Calculates from video metadata → inline `style={{ aspectRatio }}`
- Max-width: `max-w-md` (vertical) | `max-w-2xl` (landscape)
- Video: `w-full h-full` with **NO `object-fit`** (prevents bars/cropping)
- Container: `mx-auto` for centering

**State:** `isPlaying`, `currentTime`, `duration`, `volume`, `isMuted`, `showControls`

### YouTubeEmbed (`src/components/YouTubeEmbed.tsx`)
Iframe embed for YouTube videos with flexible URL parsing.

**Props:** `url` (YouTube URL or ID), `title?`, `aspectRatio?` (default 16/9), `autoplay?`, `className?`

**Supported Formats:** `watch?v=`, `youtu.be/`, `embed/`, `shorts/`, raw 11-char ID

---

## Database

**Table: `videos`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `title` | TEXT | Required |
| `video_url` | TEXT | Supabase Storage URL (uploads) |
| `youtube_url` | TEXT | YouTube URL (embeds) |
| `video_type` | TEXT | 'upload' or 'youtube' |
| `thumbnail_url` | TEXT | Optional thumbnail |
| `description`, `category` | TEXT | Optional metadata |
| `is_active` | BOOLEAN | Visibility toggle |
| `display_order` | INTEGER | Manual ordering |

**Storage:** `videos` bucket (uploads + thumbnails) | YouTube: links only  
**RLS:** Public SELECT (active), Admins ALL

---

## Admin Management (`VideoManager.tsx`)

**Location:** Admin → Videos

| Feature | Details |
|---------|---------|
| **Upload/Embed** | Choose "Upload" (file → bucket) or "YouTube" (URL → `youtube_url`) |
| **Thumbnails** | Optional, stored in `videos` bucket |
| **Metadata** | Title (required), description, category, display order |
| **Visibility** | Green eye (active) / Red eye-off (inactive) |
| **Delete** | Removes DB record + storage files (uploads only) |
| **Reorder** | Drag-and-drop (dnd-kit) updates `display_order` |

**Validation:** Title ≤200 chars, description ≤1000 chars, YouTube URL format check, upload ≤100MB

---

## Integration Points

### 1. Discussion Posts (`Discussions.tsx`)

**Form Options:** No Video | Select Existing Video | Embed YouTube Video

**Storage:**
- `discussion_posts.video_id` → Links to `videos.id`
- `discussion_posts.youtube_url` → Direct YouTube URL (bypasses table)

**Display Logic:**
```tsx
{post.youtube_url ? <YouTubeEmbed url={post.youtube_url} /> 
: post.video?.video_type === 'youtube' ? <YouTubeEmbed url={post.video.youtube_url} />
: post.video?.video_url ? <VideoPlayer src={post.video.video_url} /> : null}
```

### 2. Sponsor Bestie Page (`SponsorBestie.tsx`)

**Featured Video:** Admin selects via `app_settings.sponsor_page_content.featured_video_id`  
**Display:** Header with `<VideoPlayer>` + optional description

### 3. Videos Page (`VideosPage.tsx`)

**Public Gallery:** Grid of active videos (uploads + YouTube), full-screen dialog on click

---

## Maintenance Rules

### VideoPlayer

| ✅ DO | ❌ DON'T |
|-------|----------|
| Dynamic `aspectRatio` via inline style | Add `object-fit` classes |
| Keep `w-full h-full` on video | Remove `aspectRatio` style |
| Use gradient overlays | Use fixed Tailwind aspect classes |
| Conditional max-width logic | Change orientation-based sizing |

**Troubleshooting:**

| Issue | Cause | Fix |
|-------|-------|-----|
| Black bars | `object-contain` | Remove `object-fit` |
| Cropping | `object-cover` | Remove `object-fit` |
| Wrong size | Fixed aspect ratio | Use dynamic style |
| No controls | z-index issue | Check overlay positioning |

### YouTubeEmbed

**DO:** Accept any URL format, use `AspectRatio` wrapper, include iframe security attrs  
**DON'T:** Hardcode aspect ratio, skip URL validation, remove `allow`/`allowFullScreen`

---

## Workflows

**Admin Upload:** Admin → Videos → Add New → Choose type (Upload file / YouTube URL) → Enter title + metadata → Set active → Save  
**Admin Feature:** Admin → Sponsorships → Page Content → Select video dropdown → Save  
**User Attach:** Create post → Select video option (Existing / YouTube) → Paste URL → Submit

---

## Storage Bucket

**Name:** `videos` | **Public:** Yes | **Limit:** 100MB | **Types:** `video/*`  
**RLS:** Public SELECT, Admin INSERT/DELETE

---

## Performance

**Uploads:** Compress before upload, use thumbnails, lazy-load players  
**YouTube:** No storage cost, CDN delivery, respects embed settings  
**Thumbnails:** Always provide, auto-generate (future), fallback placeholder

---

## Future Enhancements
Video transcoding, auto-thumbnails, analytics, playlists, Vimeo support, live streaming, captions, editing

---

**Components:** `VideoPlayer.tsx`, `YouTubeEmbed.tsx`, `VideoManager.tsx`  
**Database:** `videos` table, `videos` storage bucket  
**Related:** Image System, Discussion Posts, Storage Policies
