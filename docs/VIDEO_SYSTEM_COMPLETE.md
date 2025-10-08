VIDEO SYSTEM - CONCISE DOCS

## Components

**VideoPlayer** (`src/components/VideoPlayer.tsx`)
- Custom HTML5 player with auto-hiding controls
- Dynamic aspect ratio from metadata, `max-w-md` (vertical) | `max-w-2xl` (landscape)
- **Critical:** NO `object-fit` classes (prevents bars/cropping)

**YouTubeEmbed** (`src/components/YouTubeEmbed.tsx`)
- Iframe embed, parses all YouTube URL formats
- Default 16:9 aspect ratio

**YouTubeChannel** (`src/components/YouTubeChannel.tsx`)
- Channel promotion section with custom YouTube logo
- Configurable badge, heading, description, channel URL
- Displays as card with gradient background

## Database

**videos table:** `id`, `title`, `video_url` (uploads), `youtube_url` (embeds), `video_type`, `thumbnail_url`, `description`, `category`, `is_active`, `display_order`

**about_sections table:** Stores YouTube channel content in `youtube_channel` section
- `content.badge_text`, `content.heading`, `content.description`, `content.channel_url`, `content.button_text`

**Storage:** `videos` bucket (100MB limit) | **RLS:** Public SELECT (active), Admins ALL

## Admin (`VideoManager.tsx`)

**Location:** Admin → Videos  
**Actions:** Upload/embed, add thumbnails, set metadata, toggle visibility, reorder (drag-drop), delete

**YouTube Channel Admin:**
- Admin → About → Edit "YouTube Channel" section
- Configure channel URL, button text, description

## Integration Points

**Discussion Posts:** `video_id` (links to table) OR `youtube_url` (direct)  
**Sponsor Page:** Featured video via `app_settings.sponsor_page_content.featured_video_id`  
**Videos Page:** Public gallery, full-screen dialog on click
**About Page:** YouTube channel section via `about_sections` table
- Documentary watch buttons (YouTube, Vimeo, Dailymotion) in About section
- Platform URLs stored in `about_sections.content.doc_*_url` fields

## Maintenance Rules

**VideoPlayer:**
- ✅ Dynamic `aspectRatio` inline style, `w-full h-full`, gradient overlays
- ❌ `object-fit` classes, fixed aspect ratios

**YouTubeEmbed:**
- ✅ Flexible URL parsing, `AspectRatio` wrapper, iframe security attrs

**YouTubeChannel:**
- ✅ Red YouTube logo SVG (rounded rectangle with white triangle)
- ✅ Button opens channel in new tab
- ❌ Don't use Lucide YouTube icon directly

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Black bars/cropping | Remove `object-fit` |
| Wrong size | Use dynamic style |
| YouTube logo wrong | Use custom SVG with red bg + white triangle |

**Files:** `VideoPlayer.tsx`, `YouTubeEmbed.tsx`, `VideoManager.tsx`, `YouTubeChannel.tsx`, `About.tsx` (documentary section)
