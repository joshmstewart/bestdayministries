# Sticker Pack RLS Policy Fix

## Issue
Users unable to see stickers after opening packs - stickers not appearing in StickerAlbum even after refresh.

## Root Cause
The `user_stickers` table was missing INSERT and UPDATE RLS policies, causing the `scratch-card` edge function to fail silently when trying to add stickers to user collections.

### Problems Identified:
1. **Missing RLS Policies**: No INSERT or UPDATE policies on `user_stickers`
2. **Silent Failures**: Edge function only logged errors instead of throwing them
3. **No Duplicate Handling**: Edge function didn't check for existing stickers
4. **No Realtime Updates**: StickerAlbum didn't subscribe to changes

## Solution

### 1. Added RLS Policies (Migration)
```sql
-- Allow users to insert their own stickers (when opening packs)
CREATE POLICY "Users can insert their own stickers"
ON user_stickers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own stickers (for incrementing quantity on duplicates)
CREATE POLICY "Users can update their own stickers"
ON user_stickers
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow admins to insert stickers for any user
CREATE POLICY "Admins can insert stickers"
ON user_stickers
FOR INSERT
WITH CHECK (has_admin_access(auth.uid()));

-- Allow admins to update any stickers
CREATE POLICY "Admins can update stickers"
ON user_stickers
FOR UPDATE
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));
```

### 2. Fixed Edge Function Duplicate Handling
**File**: `supabase/functions/scratch-card/index.ts`

**Changes**:
- Added check for existing stickers before insert
- If duplicate: increment quantity, update `last_obtained_at`
- If new: insert with `quantity=1`, set `first_obtained_at` and `last_obtained_at`
- Throw errors instead of silently logging them
- Properly set timestamp fields

**Before**:
```typescript
// Simple insert - fails silently if RLS blocks it
const { error: insertError } = await supabase
  .from('user_stickers')
  .insert({
    user_id: card.user_id,
    sticker_id: selectedSticker.id,
    collection_id: card.collection_id,
    obtained_from: obtainedFrom
  });

if (insertError) {
  console.error('Error adding sticker to collection:', insertError);
  // Don't throw - card is already scratched, just log the error
}
```

**After**:
```typescript
// Check for existing sticker (duplicate detection)
const { data: existingSticker, error: checkError } = await supabase
  .from('user_stickers')
  .select('id, quantity')
  .eq('user_id', card.user_id)
  .eq('sticker_id', selectedSticker.id)
  .eq('collection_id', card.collection_id)
  .single();

const now = new Date().toISOString();

if (existingSticker) {
  // Duplicate - increment quantity
  const { error: updateStickerError } = await supabase
    .from('user_stickers')
    .update({
      quantity: (existingSticker.quantity || 1) + 1,
      last_obtained_at: now,
      obtained_from: obtainedFrom
    })
    .eq('id', existingSticker.id);

  if (updateStickerError) {
    throw updateStickerError; // Throw instead of silent fail
  }
} else {
  // New sticker - insert
  const { error: insertError } = await supabase
    .from('user_stickers')
    .insert({
      user_id: card.user_id,
      sticker_id: selectedSticker.id,
      collection_id: card.collection_id,
      obtained_from: obtainedFrom,
      quantity: 1,
      first_obtained_at: now,
      last_obtained_at: now
    });

  if (insertError) {
    throw insertError; // Throw instead of silent fail
  }
}
```

### 3. Added Realtime Subscription
**File**: `src/components/StickerAlbum.tsx`

**Changes**:
- Added realtime subscription to `user_stickers` table changes
- Auto-refreshes when INSERT, UPDATE, or DELETE occurs
- Filters by selected collection for efficiency
- Properly cleans up subscription on unmount

```typescript
// Realtime subscription for new stickers
useEffect(() => {
  if (!selectedCollection) return;

  const channel = supabase
    .channel('user_stickers_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_stickers',
        filter: `collection_id=eq.${selectedCollection}`
      },
      (payload) => {
        console.log('✨ Sticker update received:', payload);
        fetchStickers(); // Refresh the album
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [selectedCollection]);
```

## Impact

### Before Fix:
- ❌ Stickers not added to user_stickers (RLS blocked)
- ❌ No error shown to user (silent failure)
- ❌ Duplicates created new rows instead of incrementing quantity
- ❌ Manual refresh required to see new stickers

### After Fix:
- ✅ Stickers properly inserted with correct RLS permissions
- ✅ Errors thrown and shown to user if something fails
- ✅ Duplicates increment quantity correctly
- ✅ Album auto-updates via realtime when stickers are added
- ✅ Proper timestamp tracking (first_obtained_at, last_obtained_at)

## Testing

### Test Cases:
1. **First-time sticker**: Should insert with quantity=1
2. **Duplicate sticker**: Should increment quantity
3. **Multiple collections**: Realtime should filter correctly
4. **Failed insert**: Should show error to user
5. **Album refresh**: Should happen automatically after opening pack

### Verification:
```sql
-- Check RLS policies are active
SELECT * FROM pg_policies WHERE tablename = 'user_stickers';

-- Verify sticker insert
SELECT us.*, s.sticker_number, s.name 
FROM user_stickers us
JOIN stickers s ON us.sticker_id = s.id
WHERE us.user_id = auth.uid()
ORDER BY us.last_obtained_at DESC;
```

## Related Files
- `supabase/functions/scratch-card/index.ts` - Edge function logic
- `src/components/StickerAlbum.tsx` - Album UI and realtime
- `src/components/PackOpeningDialog.tsx` - Pack opening animation
- `docs/STICKER_PACK_SYSTEM.md` - System documentation

## Security Considerations
- ✅ Users can only insert/update their own stickers
- ✅ Admins can manage all stickers
- ✅ No way to manipulate other users' collections
- ✅ RLS enforced at database level (edge function inherits user context)

## Future Enhancements
- Consider using database triggers for duplicate handling
- Add optimistic updates in UI before database confirmation
- Implement collection completion badges/rewards
- Add sticker trading between users (would need additional RLS policies)
