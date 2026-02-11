
## Compressed Avatar Thumbnails — Multi-Size Strategy

### The Problem
All fitness avatars are stored as full-size AI-generated PNGs (typically 1024x1024, ~500KB-2MB each). These same images load everywhere — from tiny 32px profile circles to large workout displays — causing slow loads on weaker connections.

### Display Size Inventory

There are three distinct size tiers across the app:

```text
Tier       Rendered Size     Where Used
-------    ---------------   ------------------------------------------
Small      32-64px           Header avatar, feed items, leaderboards,
                             discussion comments, guardian links
Medium     80-200px          Avatar picker grids (both Profile Settings
                             and Workout picker), purchase preview dialog
Large      300px+            Workout "Today" display, full avatar preview
                             in workout tab
```

### Proposed Solution: Two Thumbnail Sizes

Instead of one thumbnail, generate **two** compressed copies per avatar to cover all tiers nicely:

1. **Small thumbnail (128px)** — for the "Small" tier (32-64px display). At 128px it covers 2x retina at 64px. Expected size: ~5-15KB (95-99% reduction).
2. **Medium thumbnail (256px)** — for the "Medium" tier (80-200px display). Covers retina at up to 128px and looks crisp at 200px. Expected size: ~15-40KB (still 90-95% reduction).

The **full-size image** stays for the "Large" tier (workout display, full previews) where quality matters most.

### Step-by-step Implementation

**1. Database: Add two new columns to `fitness_avatars`**
- `thumbnail_sm_url` (TEXT, nullable) — 128px compressed copy
- `thumbnail_md_url` (TEXT, nullable) — 256px compressed copy

No breaking changes; existing queries continue to work.

**2. New Edge Function: `compress-fitness-avatars`**
- Follows the existing `compress-avatar-emotion-images` pattern (ImageScript, admin-only auth, batch processing)
- For each avatar with a `preview_image_url`:
  - Generate 128px and 256px resized PNGs (compression level 3)
  - Upload to `app-assets/fitness-avatars/thumbnails-sm/` and `thumbnails-md/`
  - Update both URL columns

**3. Update `useProfileAvatarUrl` hook**
- Fetch `thumbnail_sm_url` alongside `preview_image_url` in the DB query
- Add `thumbnailSmUrl` to the `AvatarCropSettings` type
- Cache works the same way — just an extra field

**4. Update `AvatarDisplay` component**
- For `sm` and `md` sizes: prefer `thumbnailSmUrl` over full `url`
- For `lg` size: also use `thumbnailSmUrl` (128px is 2x for 64px — plenty)
- Falls back to full image if thumbnail not yet generated

**5. Update `ProfileAvatarPicker` grid + `FitnessAvatarPicker` grid**
- Both picker grids display avatars at ~80-150px
- Use `thumbnail_md_url` (256px) when available, falling back to `preview_image_url`
- Purchase preview dialog (192px) also uses medium thumbnail
- No visual change, just faster loading

**6. Large displays remain untouched**
- `CurrentAvatarDisplay` (workout "Today" image) already loads generated workout images, not avatar previews
- The avatar preview shown before logging a workout uses the full image — this is one image, not a grid, so the impact is minimal

**7. Auto-generate on new avatars**
- Update `generate-avatar-image` to produce both thumbnails at creation time
- New avatars are pre-optimized from day one

**8. Admin batch trigger**
- Add a "Compress Avatar Thumbnails" button in Admin Settings (Avatars area)
- Shows count of avatars needing compression
- One-click batch processing for all 46+ existing avatars

### Expected Performance Impact

```text
Context                  Before            After
---------------------    ---------------   ---------------
Header avatar (32px)     ~500KB-2MB        ~5-15KB (128px)
Feed (multiple 32px)     ~2-10MB total     ~25-75KB total
Picker grid (46 items)   ~23-92MB total    ~700KB-1.8MB total (256px)
Workout display          ~500KB-2MB        Unchanged (full size)
```

Pages showing multiple avatars (feed, leaderboards, picker grids) will see the biggest improvement — potentially 95%+ reduction in image data transferred.

### Files to Create/Modify
- New migration: add `thumbnail_sm_url` and `thumbnail_md_url` columns
- New edge function: `supabase/functions/compress-fitness-avatars/index.ts`
- `src/hooks/useProfileAvatarUrl.ts` — fetch + cache small thumbnail
- `src/components/AvatarDisplay.tsx` — prefer small thumbnail
- `src/components/ProfileAvatarPicker.tsx` — use medium thumbnail in grid
- `src/components/workout/FitnessAvatarPicker.tsx` — use medium thumbnail in grid
- `supabase/functions/generate-avatar-image/index.ts` — auto-generate thumbnails
- Admin UI — batch compression button
