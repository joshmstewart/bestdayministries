
## Fix: Sticker Album Rarity Sorting Bug

### Problem Identified
Stickers are getting out of order (should be C→U→R→E→L) because after opening a pack, the stickers are refetched without applying the rarity sort.

### Root Cause
In `src/components/StickerAlbum.tsx`, there are **two places** that set the stickers:

1. **Initial load** (`fetchCollectionData` - line 349-373): Correctly sorts by rarity then sticker number
2. **After pack opening** (`handleCardScratched` - line 531-544): **BUG** - Uses `.order('sticker_number')` from the database instead of applying the rarity sort

When you open a pack, the stickers get refetched with the wrong ordering and overwrites the properly sorted list.

### Code Showing the Bug
```typescript
// Lines 531-544 - AFTER opening a pack, stickers refetched incorrectly:
const { data: stickers } = await supabase
  .from('stickers')
  .select('*')
  .eq('collection_id', selectedCollection)
  .eq('is_active', true)
  .order('sticker_number');  // ❌ Wrong! Orders by sticker_number

setAllStickers(stickers || []);  // ❌ No rarity sorting applied!
```

### Fix
Apply the same rarity sorting logic after fetching in `handleCardScratched`:

```typescript
// Fetch stickers
const { data: stickers } = await supabase
  .from('stickers')
  .select('*')
  .eq('collection_id', selectedCollection)
  .eq('is_active', true);

// Apply rarity sorting (same as initial load)
const rarityOrder: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5
};

const sortedStickers = (stickers || []).sort((a, b) => {
  const rarityDiff = (rarityOrder[a.rarity] || 99) - (rarityOrder[b.rarity] || 99);
  if (rarityDiff !== 0) return rarityDiff;
  return (a.sticker_number || 0) - (b.sticker_number || 0);
});

setAllStickers(sortedStickers);
```

### Files to Change
- `src/components/StickerAlbum.tsx` - Fix the sticker refetch in `handleCardScratched` (around line 531-544)

### Optional Improvement
Extract the rarity sorting logic into a reusable helper function to avoid code duplication and prevent this bug from happening again.
