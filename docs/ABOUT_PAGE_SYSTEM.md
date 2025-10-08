ABOUT PAGE SYSTEM - CONCISE DOCS

## Overview
The About page (`/about`) displays the organization's story, documentary links, and Best Day Ever coffee shop partnership. All content is editable via Admin → About.

## Component Structure

**About.tsx** (`src/components/About.tsx`)
- Three main sections: Our Story, Documentary, Best Day Ever
- Dynamic content from `about_sections` table (via `homepage_sections` shared content)
- Decorative gradient background elements

## Content Sections

### 1. Our Story
**Editable Fields:**
- `badge_text` - Header badge (default: "Founded with Love")
- `heading` - Main heading (default: "Our Story")
- `story_paragraph1` - First paragraph about Seth/founding
- `story_paragraph2` - Second paragraph about mission

**Styling:**
- Word "Story" in heading gets gradient treatment (`bg-gradient-to-r from-primary via-accent to-secondary`)
- Decorative gradient orbs (primary/secondary colors with blur)

### 2. Documentary Section
**Editable Fields:**
- `doc_title` - Section title (default: "Joy Redefined")
- `doc_description` - Description text
- `doc_youtube_url` - YouTube link
- `doc_vimeo_url` - Vimeo link
- `doc_dailymotion_url` - Dailymotion link
- `doc_image_url` - Featured image (right side)

**Layout:**
- 2-column grid (content left, image right)
- Film icon with hover scale animation
- Multiple platform buttons (YouTube, Vimeo, Dailymotion)

**Button Implementation:**
```tsx
<Button variant="outline" size="default" asChild>
  <a href={doc_youtube_url} target="_blank" rel="noopener noreferrer">
    <Play className="mr-2 h-4 w-4" />
    YouTube
  </a>
</Button>
```

**Critical:** Uses anchor tags with `asChild` prop to avoid iframe blocking issues

### 3. Best Day Ever Section
**Editable Fields:**
- `bde_logo_url` - Best Day Ever logo (editable in admin)
- `bde_description1` - Partnership description
- `bde_description2` - Call to action
- `bde_address` - Street address
- `bde_city` - City/state
- `bde_status` - Status text (default: "Open NOW!")
- `bde_button_text` - Button label
- `bde_button_link` - URL
- `bde_button_link_type` - "internal" or "custom"
- `bde_image_url` - Featured image (right side)

**Styling:**
- Custom beige/brown color scheme:
  - Background: `hsl(27 41% 88%)` (warm beige)
  - Text: `hsl(13 33% 36%)` (brown)
- **Button:** Solid brown (NO gradient) - `bg-[hsl(13,33%,36%)] hover:bg-[hsl(13,33%,36%)]/90`
- Coffee icon in button

**Layout:**
- 2-column grid (content left, image right on desktop, reversed on mobile)
- Logo displays at 256px width
- MapPin and Clock icons for location/status

## Admin Management

**Location:** Admin → About → Edit "Best Day Ministries Story"

**Editable via SectionContentDialog:**
- All text content (textarea/input fields)
- Documentary platform URLs (YouTube, Vimeo, Dailymotion)
- BDE logo upload (new as of latest update)
- Images for both sections (upload to `app-assets` bucket)
- Button link types (internal page vs custom URL)

**Image Upload:**
- Documentary image: `doc_image_url`
- BDE logo: `bde_logo_url` (object-contain, shows on beige background)
- BDE section image: `bde_image_url`

## Database Storage

**Table:** `homepage_sections` (section_key: 'about')
- Content stored in JSONB `content` column
- Shared between Homepage "About" section and full About page

**Update Pattern:**
```typescript
await supabase
  .from("homepage_sections")
  .update({ content: updatedContent })
  .eq("section_key", "about");
```

## Key Design Rules

### Button Styling
- **Documentary buttons:** Outline variant (white bg, border, hover accent)
- **BDE button:** Solid brown (matches custom color scheme, NO gradient)

**Why no gradient on BDE button?**
- Brown is the primary color in that section
- Gradient is reserved for brand orange/mustard colors
- Maintains visual consistency with section's color palette

### Color Tokens
- **Brand colors:** Use semantic tokens (`--burnt-orange`, `--mustard`)
- **BDE section:** Custom HSL values for beige/brown theme
- **Icons:** Match text color in each section

### Layout
- Responsive grid switches to single column on mobile
- Images fill container, `object-cover` for full bleed
- Gradient overlays on images for depth

## Common Issues

| Issue | Fix |
|-------|-----|
| YouTube link blocked | Use anchor tag with `asChild`, not `window.open()` |
| BDE logo too large | Set max width (`w-64` = 256px) |
| Button has gradient | Use `variant="ghost"` with custom bg color |
| Colors not theming | Use HSL format, check `index.css` tokens |

## Integration Points

**Homepage:** Shares same content from `homepage_sections.about`
**Admin:** `AboutPageManager.tsx` for section ordering/visibility
**Router:** `/about` route in `App.tsx`

## Future Enhancements
- [ ] Video embedding in documentary section (instead of external links)
- [ ] BDE hours of operation (dynamic schedule)
- [ ] Multiple partner organization sections
- [ ] Testimonials/reviews integration

**Files:** `About.tsx`, `AboutPageManager.tsx`, `SectionContentDialog.tsx`
