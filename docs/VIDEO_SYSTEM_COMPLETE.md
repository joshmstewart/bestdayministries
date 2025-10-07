VIDEO SYSTEM - CONCISE DOCS

## Components

**VideoPlayer** (`src/components/VideoPlayer.tsx`)
- Custom HTML5 player with auto-hiding controls
- Dynamic aspect ratio from metadata, `max-w-md` (vertical) | `max-w-2xl` (landscape)
- **Critical:** NO `object-fit` classes (prevents bars/cropping)

**YouTubeEmbed** (`src/components/YouTubeEmbed.tsx`)
- Iframe embed, parses all YouTube URL formats
- Default 16:9 aspect ratio

## Database

**videos table:** `id`, `title`, `video_url` (uploads), `youtube_url` (embeds), `video_type`, `thumbnail_url`, `description`, `category`, `is_active`, `display_order`

**Storage:** `videos` bucket (100MB limit) | **RLS:** Public SELECT (active), Admins ALL

## Admin (`VideoManager.tsx`)

**Location:** Admin → Videos  
**Actions:** Upload/embed, add thumbnails, set metadata, toggle visibility, reorder (drag-drop), delete

## Integration Points

**Discussion Posts:** `video_id` (links to table) OR `youtube_url` (direct)  
**Sponsor Page:** Featured video via `app_settings.sponsor_page_content.featured_video_id`  
**Videos Page:** Public gallery, full-screen dialog on click

## Maintenance Rules

**VideoPlayer:**
- ✅ Dynamic `aspectRatio` inline style, `w-full h-full`, gradient overlays
- ❌ `object-fit` classes, fixed aspect ratios

**YouTubeEmbed:**
- ✅ Flexible URL parsing, `AspectRatio` wrapper, iframe security attrs

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Black bars/cropping | Remove `object-fit` |
| Wrong size | Use dynamic style |

**Files:** `VideoPlayer.tsx`, `YouTubeEmbed.tsx`, `VideoManager.tsx`
