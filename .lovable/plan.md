

## Optimize Album Management Page Image Loading

The current implementation has three performance problems:

1. **N+1 query problem** -- Loads all albums, then fires a separate DB query per album for its images
2. **All images rendered immediately** -- Every thumbnail in every album card loads full-resolution images at once (line 1199: plain `<img>` tags with no lazy loading)
3. **Full-res for tiny thumbnails** -- Images that display at 64px tall (`h-16`) download the full upload (up to 4.5MB each)

### Changes

**File: `src/pages/AlbumManagement.tsx`**

1. **Consolidate to a single query** -- Replace the N+1 pattern (lines 161-182) with a single `album_images` query that fetches all images at once, then groups them by `album_id` client-side. This cuts potentially dozens of DB calls down to 2 total (1 for albums, 1 for all album_images).

2. **Collapse album image grids by default** -- Instead of showing all thumbnails for every album, show only the cover image. Add a "Show images (N)" toggle button per album card to expand and reveal the thumbnail grid. This avoids rendering hundreds of images on mount.

3. **Add lazy loading to thumbnail images** -- For the thumbnail grid (lines 1196-1238) and cover images (line 1151), add `loading="lazy"` to the `<img>` tags so the browser only fetches images as they scroll into view.

4. **Limit visible thumbnails** -- In the expanded grid, show only the first 8 images with a "+N more" indicator. The full set is already available when editing.

### Technical Details

**Single query approach:**
```typescript
// Instead of N+1:
const { data: allImages } = await supabase
  .from("album_images")
  .select("*")
  .order("display_order", { ascending: true });

// Group client-side:
const imagesByAlbum = new Map();
(allImages || []).forEach(img => {
  const list = imagesByAlbum.get(img.album_id) || [];
  list.push(img);
  imagesByAlbum.set(img.album_id, list);
});
```

**Collapsed state:**
```typescript
const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set());
```

**Lazy img tags:**
```html
<img loading="lazy" src={...} className="w-full h-16 object-cover rounded" />
```

No database or backend changes needed. This is purely a frontend optimization.

