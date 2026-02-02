
# Plan: Optimize Avatar Emotion Image Loading

## Problem
The mood picker shows 16 avatar emotion portraits. Each time you open it, the app fetches all image URLs from the database, then your browser downloads each full-size image (likely 512×512 or larger PNG files). Since these display at only 64×64 pixels, you're downloading ~10-20x more data than needed.

## Solution Overview
Two-part fix for significantly faster loading:

### Part 1: Add Client-Side Caching (Instant Repeat Loads)
Cache the image URLs in your browser's session storage so repeat opens are instant—no database call, no waiting for image URLs.

**Technical approach:**
- Create a new hook `useAvatarEmotionImagesWithCache` that wraps the existing fetch logic
- Store the image URL map in `sessionStorage` with a 5-minute TTL (matching existing patterns)
- On first load: fetch from database, cache result
- On subsequent loads: use cached data instantly, optionally refresh in background

### Part 2: Compress Images During Generation (Smaller Downloads)
Reduce the stored image size from ~500KB to ~50KB per image.

**Technical approach:**
- Modify `generate-avatar-emotion-image` edge function to:
  - Resize images to 256×256 pixels (plenty for circular displays up to 128px retina)
  - Convert from PNG to WebP (same quality, ~80% smaller)
  - Apply quality compression (0.85 quality level)
- Use canvas-based compression similar to `src/lib/imageUtils.ts`

---

## Technical Implementation Details

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useAvatarEmotionImages.ts` | Add sessionStorage caching with 5-min TTL |
| `src/components/daily-features/QuickMoodPicker.tsx` | Use the cached hook |
| `supabase/functions/generate-avatar-emotion-image/index.ts` | Compress images before storage |

### New Caching Pattern
```typescript
const CACHE_KEY = "avatar_emotion_images_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache structure: { [avatarId]: { images: {...}, timestamp } }
```

### Image Compression in Edge Function
```typescript
// Resize to 256x256 and convert to WebP
const targetSize = 256;
// ... canvas resize logic
const compressedBlob = await canvas.toBlob('image/webp', 0.85);
```

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Repeat load time | 1-2 seconds | Instant (~10ms) |
| Image file size (each) | ~300-500KB | ~30-50KB |
| Total data per open | ~5-8MB (16 images) | ~500-800KB (first load) or 0 (cached) |
| Database calls | Every open | First open only (per 5 min) |

---

## Backward Compatibility
- Existing full-size images will continue to work
- New images will be smaller; old images won't auto-update
- Optional: Create admin button to regenerate all images with compression

---

## Implementation Order
1. Add caching to `useAvatarEmotionImages` (immediate improvement)
2. Update edge function to compress new images (future improvement)
3. Optionally: add admin tool to batch-recompress existing images
