# VIDEO SYSTEM - COMPLETE DOCUMENTATION

## Overview
Comprehensive video system supporting both uploaded videos and YouTube embeds across the application, with admin management, aspect ratio handling, and integration into discussions and pages.

---

## Core Components

### 1. VideoPlayer Component (`src/components/VideoPlayer.tsx`)

**Purpose:** Custom HTML5 video player for uploaded video files

**Features:**
- Custom controls overlay (play/pause, volume, seek bar, fullscreen)
- Auto-hiding controls (appear on hover, hide when playing)
- Dynamic aspect ratio detection from video metadata
- Responsive sizing based on video orientation

**Props:**
```typescript
interface VideoPlayerProps {
  src: string;          // Video URL (Supabase Storage or external)
  poster?: string;      // Optional thumbnail image
  className?: string;   // Additional Tailwind classes
  title?: string;       // Optional title shown in overlay
}
```

**Aspect Ratio Behavior (CRITICAL):**
- **Dynamic Detection:** Loads video metadata and calculates aspect ratio on mount
- **Applied via:** Inline `style={{ aspectRatio }}` on container (NOT Tailwind classes)
- **Responsive Max-Width:**
  - Vertical videos (`aspectRatio < 1`): `max-w-md` (448px)
  - Landscape videos (`aspectRatio >= 1`): `max-w-2xl` (672px)
- **Perfect Fit:** Video uses `w-full h-full` with **NO `object-fit`** property
- **Centering:** Container uses `mx-auto`

**Controls:**
- Bottom gradient overlay for controls
- Top gradient overlay for title
- State tracking: `isPlaying`, `currentTime`, `duration`, `volume`, `isMuted`, `showControls`

**Usage Example:**
```tsx
<VideoPlayer
  src={video.video_url}
  poster={video.thumbnail_url}
  title={video.title}
  className="w-full"
/>
```

---

### 2. YouTubeEmbed Component (`src/components/YouTubeEmbed.tsx`)

**Purpose:** Embed YouTube videos via iframe with flexible URL parsing

**Features:**
- Accepts multiple YouTube URL formats (watch, youtu.be, embed, shorts)
- Accepts raw video ID (11 characters)
- Configurable aspect ratio (default 16:9)
- Optional autoplay
- Uses `AspectRatio` wrapper for responsive sizing

**Props:**
```typescript
interface YouTubeEmbedProps {
  url: string;           // YouTube URL or video ID
  title?: string;        // Iframe title (default: "YouTube video")
  aspectRatio?: number;  // Width/height ratio (default: 16/9)
  autoplay?: boolean;    // Auto-start playback (default: false)
  className?: string;    // Additional styles
}
```

**Supported URL Formats:**
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `https://www.youtube.com/shorts/VIDEO_ID`
- `VIDEO_ID` (raw 11-character ID)

**Usage Example:**
```tsx
<YouTubeEmbed 
  url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  title="Video Title"
  aspectRatio={16/9}
/>
```

---

## Database Schema

### Table: `videos`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title` | TEXT | Video title |
| `video_url` | TEXT | Supabase Storage URL (for uploaded videos) |
| `youtube_url` | TEXT (nullable) | YouTube URL (for embedded videos) |
| `video_type` | TEXT (nullable) | 'upload' or 'youtube' |
| `thumbnail_url` | TEXT (nullable) | Thumbnail image URL |
| `description` | TEXT (nullable) | Video description |
| `category` | TEXT (nullable) | Categorization |
| `is_active` | BOOLEAN | Visibility toggle |
| `display_order` | INTEGER | Manual ordering |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Storage:**
- Uploaded videos: `videos` bucket in Supabase Storage
- Thumbnails: Same bucket (optional)
- YouTube videos: No storage (links only)

**RLS Policies:**
- Public SELECT (active videos only)
- Admins: ALL operations

---

## Admin Management

### Component: `VideoManager.tsx`

**Location:** Admin panel → Videos tab

**Features:**

1. **Upload Videos:**
   - Choose between "Upload" or "YouTube" type
   - **Upload:** Select video file from local storage → compressed & uploaded to `videos` bucket
   - **YouTube:** Enter YouTube URL (any format) → stored as `youtube_url`

2. **Thumbnail Management:**
   - Optional thumbnail upload (recommended for better UX)
   - Stored in `videos` bucket alongside videos

3. **Metadata Editing:**
   - Title (required)
   - Description (optional)
   - Category (optional)
   - Display order (drag-and-drop or manual)

4. **Active/Inactive Toggle:**
   - Green eye = active (visible)
   - Red eye-off = inactive (hidden)
   - Immediately updates visibility

5. **Delete Videos:**
   - Removes database record
   - Deletes associated files from storage (uploaded videos only)
   - YouTube embeds only remove database entry

6. **Reordering:**
   - Drag-and-drop interface (dnd-kit)
   - Updates `display_order` column
   - Reflected in all video listings

**Form Validation:**
- Title: Required, max 200 characters
- Description: Max 1000 characters
- YouTube URL: Validated format (uses `YouTubeEmbed` parser)
- Video upload: Max 100MB (configurable)

---

## Integration Points

### 1. Discussion Posts (`src/pages/Discussions.tsx`)

**Features:**
- Attach videos to discussion posts
- Choose between uploaded videos or direct YouTube embed
- Display video player/embed in post content

**Form Options:**
```tsx
<Select value={videoInputType} onValueChange={...}>
  <SelectItem value="none">No Video</SelectItem>
  <SelectItem value="select">Select Existing Video</SelectItem>
  <SelectItem value="youtube">Embed YouTube Video</SelectItem>
</Select>
```

**Data Storage:**
- `discussion_posts.video_id` → Links to `videos.id` (uploaded videos)
- `discussion_posts.youtube_url` → Direct YouTube URL (bypasses videos table)

**Display Logic:**
```tsx
{post.youtube_url ? (
  <YouTubeEmbed url={post.youtube_url} title={post.title} />
) : post.video?.video_type === 'youtube' && post.video.youtube_url ? (
  <YouTubeEmbed url={post.video.youtube_url} title={post.video.title} />
) : post.video?.video_url ? (
  <VideoPlayer src={post.video.video_url} title={post.video.title} />
) : null}
```

### 2. Sponsor Bestie Page (`src/pages/SponsorBestie.tsx`)

**Featured Video:**
- Admin selects featured video via `app_settings` table
- Setting key: `sponsor_page_content.featured_video_id`
- Displayed in page header with optional description

**Display:**
```tsx
{featuredVideo && (
  <div className="mb-8 max-w-4xl mx-auto">
    <VideoPlayer
      src={featuredVideo.video_url}
      poster={featuredVideo.thumbnail_url || undefined}
      title={featuredVideo.title}
      className="w-full"
    />
    {featuredVideo.description && (
      <p className="text-center text-sm text-muted-foreground mt-3">
        {featuredVideo.description}
      </p>
    )}
  </div>
)}
```

### 3. Videos Page (`src/pages/VideosPage.tsx`)

**Public Video Gallery:**
- Lists all active videos (uploaded + YouTube)
- Grid layout with thumbnails
- Click to open full-screen dialog
- Filtered by `is_active = true`

**Display:**
- Uploaded videos: `<VideoPlayer>` in dialog
- YouTube videos: `<YouTubeEmbed>` in dialog

---

## Key Maintenance Rules

### VideoPlayer Component

**DO:**
- ✅ Let component calculate aspect ratio dynamically
- ✅ Use inline `style={{ aspectRatio }}` on container
- ✅ Keep video element with `w-full h-full`
- ✅ Use gradient overlays for controls

**DON'T:**
- ❌ Add `object-fit` classes (causes black bars/cropping)
- ❌ Remove dynamic `aspectRatio` style from container
- ❌ Use fixed aspect ratio Tailwind classes
- ❌ Change max-width logic (intentional for orientation)

**Troubleshooting:**

| Issue | Cause | Solution |
|-------|-------|----------|
| Black bars | `object-contain` added | Remove `object-fit` property |
| Cropping | `object-cover` added | Remove `object-fit` property |
| Video too large | Missing max-width | Check aspect ratio conditional logic |
| Wrong size | Fixed container aspect ratio | Use dynamic `aspectRatio` style |
| Controls not showing | z-index issue | Verify overlay positioning |

### YouTubeEmbed Component

**DO:**
- ✅ Accept any YouTube URL format
- ✅ Use `AspectRatio` wrapper for responsiveness
- ✅ Include proper iframe attributes (allow, allowFullScreen)

**DON'T:**
- ❌ Hardcode aspect ratio (make configurable)
- ❌ Forget to handle URL parsing errors
- ❌ Remove iframe security attributes

---

## Common Workflows

### Admin: Upload New Video

1. Navigate to Admin → Videos tab
2. Click "Add New Video"
3. Select video type:
   - **Upload:** Choose file → wait for upload → auto-generates thumbnail option
   - **YouTube:** Paste URL → validates format
4. Enter title + optional metadata
5. Set active status (green eye = visible)
6. Save
7. Video appears in dropdown menus and public galleries

### Admin: Feature Video on Sponsor Page

1. Admin → Sponsorships → Page Content
2. Select featured video from dropdown
3. Save
4. Video displays in header of `/sponsor-bestie`

### User: Add Video to Discussion Post

1. Create new post
2. Choose video option:
   - **Select Existing:** Dropdown of uploaded/YouTube videos
   - **Embed YouTube:** Paste URL directly
3. Finish post → video renders inline

---

## Storage Bucket Configuration

**Bucket Name:** `videos`

**Settings:**
- Public: Yes (for video playback)
- File size limit: 100MB (configurable)
- Allowed MIME types: `video/*`

**RLS Policies:**
- SELECT: Public (for playback)
- INSERT: Admins only
- DELETE: Admins only

---

## Performance Considerations

1. **Uploaded Videos:**
   - Compress videos before upload (recommended)
   - Use thumbnails for preview (faster loading)
   - Lazy-load video players (only when in viewport)

2. **YouTube Embeds:**
   - No storage cost
   - Relies on YouTube's CDN
   - Respects YouTube's embed settings (age restrictions, etc.)

3. **Thumbnails:**
   - Always provide for better UX
   - Auto-generated on upload (optional feature)
   - Fallback to placeholder if missing

---

## Future Enhancements

- [ ] Video transcoding (multiple resolutions)
- [ ] Auto-thumbnail generation on upload
- [ ] Video analytics (views, watch time)
- [ ] Playlist support
- [ ] Vimeo embed support
- [ ] Live streaming integration
- [ ] Closed captions/subtitles
- [ ] Video trimming/editing in admin

---

## Related Documentation

- Image System: `docs/ALBUM_SYSTEM_CONCISE.md`
- Discussion Posts: `docs/COMMUNITY_PREVIEWS_CONCISE.md`
- Storage Buckets: Supabase Storage policies in migrations

---

**Last Updated:** After implementing YouTube embed support and discussion post video integration
**Components:** `VideoPlayer.tsx`, `YouTubeEmbed.tsx`, `VideoManager.tsx`
**Database:** `videos` table, `videos` storage bucket
