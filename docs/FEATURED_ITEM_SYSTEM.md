# FEATURED ITEM SYSTEM - CONCISE DOCS

## Overview
Rotating carousel on homepage/community page displaying featured content with role-based visibility.

## Components

**FeaturedItem** (`src/components/FeaturedItem.tsx`)
- Auto-rotating carousel (10s intervals)
- Pause/play controls
- Manual navigation (prev/next, dot indicators)
- Dynamic aspect ratio from metadata
- TTS support for title + description
- Event detail integration (date, time, location)

**FeaturedItemManager** (`src/components/admin/FeaturedItemManager.tsx`)
- Admin CRUD interface
- Image upload/crop with aspect ratio selection
- Link resolution (internal/external/event/album/post)
- Display order management
- Role-based visibility controls

## Database

**featured_items table:**
- `id`, `title`, `description`, `image_url`, `original_image_url` (for re-cropping)
- `link_url`, `link_text`, `aspect_ratio` (default: '16:9')
- `is_active`, `is_public`, `visible_to_roles[]`, `display_order`
- `created_by`, `created_at`, `updated_at`

## Data Loading (OPTIMIZED)

**Parallel Loading Pattern:**
```typescript
const [authResult, itemsResult] = await Promise.all([
  supabase.auth.getUser(),
  supabase.from("featured_items").select("*")...
]);
```

**Flow:**
1. Fetch auth + items in parallel (2 queries, not 3-4)
2. If authenticated, fetch user role (1 additional query)
3. Filter items client-side by role/public status
4. Resolve URL for current item (may trigger event details fetch)

**Performance:** Reduces sequential database calls, loads faster than previous implementation

## Link Types

**Internal:**
- `/route` → React Router Link
- `event:uuid` → `/events` (loads event details)
- `album:uuid` → `/gallery`
- `post:uuid` → `/discussions`

**External:**
- `https://...` → Opens in new tab

## Visibility Rules

**Non-authenticated:** Only `is_public: true` items
**Authenticated:** Items where `visible_to_roles` includes user's role OR `is_public: true`
**Admin/Owner:** All items visible

## Carousel Controls

**Auto-advance:** Every 10 seconds
**Pause triggers:** Manual navigation, user clicks pause
**Resume:** User clicks play button
**Indicators:** Dot navigation (current slide highlighted)

## Event Details Display

When `link_url` starts with `event:`:
- Fetches event date, time, location from `events` table
- Loads saved locations from `saved_locations` table
- Displays with icons (Calendar, Clock, MapPin)
- Format: "EEEE, MMMM d, yyyy" and "h:mm a"
- **Location Display:**
  - If event location matches a saved location (case-insensitive): Shows **location name** (bold) + address (below)
  - Otherwise: Shows address string only
  - Location is clickable (opens Google Maps)
- Link text becomes event CTA

**Integration:** Uses `saved_locations` table to provide context for event addresses (see SAVED_LOCATIONS_SYSTEM.md)

## Admin Features

**Create/Edit:**
- Upload image → crop with aspect ratio selector
- Set title, description, link (with type detection)
- Configure visibility (public + roles)
- Set display order (drag-and-drop)

**Re-crop:** Loads `original_image_url` for unlimited re-cropping without quality loss

**Link Resolution:** Admin selects from dropdowns (events, albums, posts) or enters custom URL

## RLS Policies

- **SELECT:** Public sees active items matching visibility rules
- **INSERT/UPDATE/DELETE:** Admins only

## Common Issues

| Issue | Fix |
|-------|-----|
| Slow loading | Optimized: parallel auth + items fetch |
| Wrong aspect ratio | Parse string ("16:9") to decimal (16/9) |
| Items not showing | Check `is_active`, `is_public`, role visibility |
| Carousel doesn't auto-advance | Check items.length > 1 |
| Event details not showing | Verify `link_url` format: `event:uuid` |

## Files

- `src/components/FeaturedItem.tsx` - Display component
- `src/components/admin/FeaturedItemManager.tsx` - Admin CRUD
- `src/components/ImageCropDialog.tsx` - Crop interface
- `src/components/LocationLink.tsx` - Clickable Google Maps links

## Related Systems

- **Saved Locations:** See `docs/SAVED_LOCATIONS_SYSTEM.md` for location name/address management
- **Events:** See `docs/EVENTS_SYSTEM_CONCISE.md` for event data structure

---

**Last Updated:** After adding saved locations integration for event display
