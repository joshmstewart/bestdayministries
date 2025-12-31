# Changelog - January 16, 2025

## Marketplace & Printify Improvements

### Printify Import: Selling Price Instead of Markup
**Component:** `PrintifyPreviewDialog.tsx`

**Problem:** The import dialog asked for a "Price Markup" (amount to add to base cost), but the product edit screen showed the full selling price. This inconsistency was confusing.

**Solution:** Changed the import dialog to show and edit the **Selling Price** directly, matching the product edit experience.

**Implementation:**
- Replaced `priceMarkup` state with `finalPrice` state
- Default final price is set to the base price (no markup by default)
- Shows base cost and calculated markup for context
- Markup is calculated as `finalPrice - basePrice` when importing

**UI Changes:**
- Label changed from "Price Markup" to "Selling Price ($)"
- Input minimum is now `basePrice` (can't sell below cost)
- Helper text shows: "Base cost: $X.XX (+$Y.YY markup)" when markup > 0

**Benefits:**
- Consistent pricing experience between import and edit
- Users see the actual price customers will pay
- Easy to understand profit margin at a glance

### Marketplace Category Tabs with Product Thumbnails
**Component:** `Marketplace.tsx`

**Change:** Added small product image thumbnails to the category tabs.

**Implementation:**
- Extended `category-status` query to fetch product images
- Shows up to 3 stacked circular product images per tab
- Images are pulled from active products in each category:
  - "All Products" - All active products
  - "Artisan-Made" - Handmade vendor products
  - "Official Merch" - Printify + house vendor products

**Visual Design:**
- 6x6 circular images with border
- Stacked with overlapping offset (-2 spacing)
- Hidden on mobile, visible on sm+ screens

---

## Album Video Support (Database Ready)

### Database Migration
**Table:** `album_images` (now supports mixed media)

**New Columns Added:**
| Column | Type | Purpose |
|--------|------|---------|
| `video_url` | text | URL for uploaded videos |
| `video_type` | text | 'image', 'upload', 'youtube', or 'linked' |
| `youtube_url` | text | YouTube video URL |
| `video_id` | uuid | FK to videos table for linking existing videos |

**Constraints:**
- `album_media_has_content` - Ensures at least one media type is present (image_url, video_url, youtube_url, or video_id)
- `image_url` is now nullable to allow video-only items

**Index:**
- Added index on `video_id` for efficient lookups

### Status: Database Ready, Frontend Pending
The database schema now supports videos in albums. Frontend implementation needed:
- [ ] Update AlbumManagement.tsx to add video upload/YouTube input
- [ ] Add video library linking (select from existing videos)
- [ ] Update album display components to render videos
- [ ] Update AlbumImage interface in TypeScript

## Files Modified

### Components
- `src/components/admin/PrintifyPreviewDialog.tsx` - Selling price input
- `src/pages/Marketplace.tsx` - Category tab thumbnails

### Documentation Updated
- `docs/PRINTIFY_INTEGRATION.md` - Updated import workflow
- `docs/MARKETPLACE_CHECKOUT_SYSTEM.md` - Updated Printify admin workflow
- `docs/MASTER_SYSTEM_DOCS.md` - Added new patterns
- `docs/CHANGELOG_2025_01_16.md` - This changelog

## Testing
1. Import Printify product → Verify selling price input works correctly
2. Set selling price above base → Verify markup calculates correctly
3. View marketplace → Verify category tabs show product thumbnails
4. Switch categories → Verify correct products show for each tab
