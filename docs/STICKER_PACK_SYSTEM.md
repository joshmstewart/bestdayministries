# STICKER & PACK OPENING SYSTEM

## Overview
Complete digital sticker collection system with daily free packs, purchasable bonus packs, rarity-based drops, collection progress tracking, and animated pack opening experience.

## Core Features
- **Daily Free Pack**: One free pack per day per user (MST timezone)
- **Bonus Packs**: Purchasable with JoyCoins (exponential pricing)
- **Pack Opening Animation**: Modern tear-and-reveal animation with holographic effects
- **Rarity System**: Common, Uncommon, Rare, Epic, Legendary
- **Collection Progress**: Track completion percentage and missing stickers
- **Duplicate Detection**: Shows when you get a duplicate sticker
- **Real-time Updates**: Pack state updates across all views instantly
- **Role-Based Access**: Collections can be visible to specific user roles

## Database Schema

### Tables

#### `sticker_collections`
Main collection configuration:
- `id` - UUID primary key
- `name` - Collection name
- `description` - Collection description
- `theme` - Collection theme/category
- `is_active` - Whether collection is active
- `start_date` - Collection start date
- `end_date` - Collection end date (nullable)
- `visible_to_roles` - Array of user_role types who can access
- `preview_sticker_id` - Featured sticker for pack preview
- `pack_image_url` - Custom pack cover image (nullable)
- `pack_animation_url` - Custom pack animation URL (nullable)
- `rarity_percentages` - JSONB with drop rates: `{"common": 50, "uncommon": 30, "rare": 15, "epic": 4, "legendary": 1}`
- `completion_badge_id` - Badge awarded on completion (nullable)
- `display_order` - Sort order for admin UI

**RLS Policies:**
- SELECT: Active collections viewable by users with matching role
- ALL: Admins can manage all collections

#### `stickers`
Individual stickers in collections:
- `id` - UUID primary key
- `collection_id` - FK to sticker_collections
- `name` - Sticker name
- `description` - Sticker description (nullable)
- `image_url` - Sticker image URL
- `rarity` - Enum: common, uncommon, rare, epic, legendary
- `is_active` - Whether sticker is available for drops
- `display_order` - Sort order in collection

**RLS Policies:**
- SELECT: Stickers in active collections viewable by all auth users
- ALL: Admins can manage all stickers

#### `daily_scratch_cards`
Pack instances (daily free + bonus):
- `id` - UUID primary key
- `user_id` - FK to profiles
- `collection_id` - FK to sticker_collections
- `date` - Date card was created (MST)
- `is_bonus_card` - Boolean: true for purchased packs
- `purchase_number` - Which bonus pack # for the day (1, 2, 3...)
- `is_scratched` - Boolean: has been opened
- `scratched_at` - Timestamp when opened
- `revealed_sticker_id` - FK to stickers (what was revealed)
- `expires_at` - Expiration timestamp (24h from creation)
- `created_at` - Creation timestamp

**RLS Policies:**
- SELECT: Users can view their own cards, admins see all
- UPDATE: Users can update their own cards (for scratching)
- INSERT: System generates via RPC function
- DELETE: Admins only

#### `user_stickers`
User's sticker collection inventory:
- `id` - UUID primary key
- `user_id` - FK to profiles
- `sticker_id` - FK to stickers
- `collection_id` - FK to sticker_collections
- `quantity` - How many copies owned
- `obtained_at` - When first obtained
- `updated_at` - Last updated timestamp

**RLS Policies:**
- SELECT: Users view own stickers, admins see all
- INSERT/UPDATE: System only (via edge functions)
- DELETE: Admins only

### App Settings
Key: `stickers_enabled` - Boolean to enable/disable entire system
Key: `bonus_card_base_cost` - Base JoyCoin cost for bonus packs (default: 100)

## Database Functions

### `generate_daily_scratch_card(_user_id uuid) RETURNS uuid`
Generates or retrieves today's free daily pack:
- Checks for active collection matching today's date
- Returns existing free card if found
- Creates new free card if needed
- Returns card ID or NULL if no active collection

**Security:** `SECURITY DEFINER` - runs with elevated privileges

### `check_collection_completion(_user_id uuid, _collection_id uuid) RETURNS boolean`
Checks if user completed a collection and awards badge:
- Counts total stickers in collection
- Counts user's unique stickers
- If complete and badge configured, awards badge
- Returns true if complete, false otherwise

**Security:** `SECURITY DEFINER` - runs with elevated privileges

## Database Triggers

### `on_sticker_obtained()`
**Trigger:** AFTER INSERT ON `user_stickers`
**Action:** Calls `check_collection_completion()` to check if collection is now complete

## Edge Functions

### `scratch-card`
Opens a pack and reveals a sticker.

**Auth:** Required (uses user's JWT)

**Request Body:**
```json
{
  "cardId": "uuid-of-scratch-card"
}
```

**Logic:**
1. Validates user authentication
2. Fetches scratch card, verifies ownership and not already scratched
3. Gets collection's rarity percentages
4. Randomly selects rarity based on percentages
5. Randomly selects active sticker of that rarity from collection
6. Updates scratch card: `is_scratched = true`, `scratched_at = now()`, `revealed_sticker_id`
7. Checks if user already owns sticker (duplicate detection)
8. Inserts/updates `user_stickers` (increments quantity if duplicate)
9. Returns sticker details with `isDuplicate` flag

**Response Success:**
```json
{
  "sticker": {
    "id": "uuid",
    "name": "Sticker Name",
    "description": "Description",
    "image_url": "https://...",
    "rarity": "rare",
    "collection_id": "uuid"
  },
  "isDuplicate": false,
  "quantity": 1
}
```

**Response Error:**
```json
{
  "error": "Error message"
}
```

**Error Cases:**
- No authentication: "Not authenticated"
- Card not found: "Scratch card not found"
- Not user's card: "Scratch card not found"
- Already scratched: "This pack has already been opened today"
- No stickers available: "No stickers available for this rarity"

### `purchase-bonus-card`
Purchases an additional pack using JoyCoins.

**Auth:** Required (uses user's JWT)

**Request Body:** None

**Logic:**
1. Validates user authentication
2. Gets `bonus_card_base_cost` from settings (default 100)
3. Calculates today's date in MST
4. Counts user's existing bonus cards for today
5. Calculates exponential cost: `base_cost * (2 ^ purchase_number)`
   - 1st bonus: 100 coins
   - 2nd bonus: 200 coins
   - 3rd bonus: 400 coins
   - 4th bonus: 800 coins, etc.
6. Checks user's coin balance
7. Gets active sticker collection
8. Deducts coins from user's profile
9. Logs coin transaction
10. Creates new bonus card record
11. Returns success with card ID and cost

**Response Success:**
```json
{
  "cardId": "uuid-of-new-card",
  "cost": 200,
  "remainingCoins": 850
}
```

**Response Error:**
```json
{
  "error": "Insufficient JoyCoins. You need 200 coins but only have 50."
}
```

**Error Cases:**
- No authentication: "Not authenticated"
- Insufficient coins: "Insufficient JoyCoins..."
- No active collection: "No active sticker collection available"

## Frontend Components

### `PackOpeningDialog`
Main pack opening experience with tear animation.

**Location:** `src/components/PackOpeningDialog.tsx`

**Props:**
- `open: boolean` - Dialog open state
- `onOpenChange: (open: boolean) => void` - Open state handler
- `cardId: string` - UUID of daily_scratch_card to open
- `onOpened: () => void` - Callback after pack is opened

**Features:**
- **Loading State:** Shows loading spinner while fetching data
- **Pack Animation:** 
  - Custom image if `pack_image_url` exists
  - Generated holographic gradient pack if not
  - "Click to tear open" prompt
- **Tear Effect:** Click/tap triggers tearing animation
- **Reveal Animation:** Sticker appears with holographic shimmer effect
- **Rarity-Based Confetti:** Different confetti patterns for each rarity
- **Duplicate Detection:** Shows "Duplicate!" badge and quantity
- **Collection Info:** Displays collection name and sticker details

**Audio Workflow:**
- **Pack Reveal Sound:** `sticker_pack_reveal` plays ONCE when dialog opens and pack first appears
  - Uses `useRef` to track if sound has played
  - Plays after audio clips are loaded
  - Only plays on initial pack display, NOT on sticker reveal
- **Rarity Sound:** Plays after tear animation when sticker is revealed
  - Different sound per rarity level
- **Load Order:** Audio clips load → Pack reveal sound → User tears → Rarity sound

**Visual Effects:**
- Holographic gradient on packs and revealed stickers
- CSS `@keyframes holographic` for color cycling
- CSS `@keyframes shimmer` for sparkle effect
- Canvas-confetti integration with rarity-specific configs

**Confetti Configs by Rarity:**
```typescript
common: { particleCount: 50, spread: 50 }
uncommon: { particleCount: 75, spread: 60 }
rare: { particleCount: 100, spread: 70 }
epic: { particleCount: 150, spread: 80, gravity: 0.5 }
legendary: { particleCount: 200, spread: 90, gravity: 0.3, scalar: 1.5 }
```

### `DailyScratchCard`
Community page widget showing daily/bonus pack availability.

**Location:** `src/components/DailyScratchCard.tsx`

**Features:**
- Displays single sticker icon (preview from collection)
- Shows daily free pack OR next unscratched bonus pack
- Status indicators:
  - ✓ Check mark: Already scratched
  - ✨ Sparkles: Available to open
  - Grayscale filter: Used or expired
- Real-time updates via Supabase realtime subscription
- MST timezone handling for daily reset
- Navigates to `/sticker-album` when clicked if no pack available

**State Management:**
- Parallel queries for fast initial load
- Background fetch for preview sticker (non-blocking)
- Realtime subscription for instant updates when packs are opened
- Refetches on route changes (via `location.key`)

**Display Logic:**
1. If free card not scratched: Show free pack
2. If free card scratched AND bonus cards exist: Show first bonus pack
3. If all packs scratched: Show completed state (grayscale)

### `StickerAlbum`
Full album view for browsing and purchasing packs.

**Location:** `src/components/StickerAlbum.tsx`

**Route:** `/sticker-album`

**Features:**
- **Collection Selector:** Dropdown to switch between collections
- **Available Packs:** Shows daily free pack + purchasable bonus packs
- **Progress Bar:** Visual completion percentage
- **Stats:** X/Y collected, completion %
- **Rarity Filter:** Filter view by rarity
- **Drop Rate Table:** Shows percentage chances for each rarity
- **Purchase Bonus Pack:** Button with coin cost (exponential pricing)
- **Sticker Grid:** Display all stickers with status:
  - Owned: Full color with quantity badge
  - Missing: Grayscale with lock icon
- Opens `PackOpeningDialog` when clicking available packs

**Bonus Pack Pricing Display:**
Shows current cost with coin icon and handles insufficient coins state.

### `StickerCollectionManager`
Admin interface for managing collections and stickers.

**Location:** `src/components/admin/StickerCollectionManager.tsx`

**Access:** Admin dashboard → Besties tab → Collections sub-tab

**Features:**
- Create/edit/delete collections
- Configure rarity percentages (with validation: must total 100%)
- Set visibility roles
- Set preview sticker
- Upload custom pack images/animations
- Create/edit/delete stickers with image upload
- Drag-and-drop reordering
- Background removal tool for sticker images
- Test pack opening (preview animation)
- Bulk enable/disable stickers

## Rarity System

### Rarity Levels
1. **Common** (50%): Gray badge
2. **Uncommon** (30%): Green badge
3. **Rare** (15%): Blue badge
4. **Epic** (4%): Purple badge
5. **Legendary** (1%): Gold badge

### Drop Rate Customization
Percentages are configurable per collection in `rarity_percentages` JSONB field. Default:
```json
{
  "common": 50,
  "uncommon": 30,
  "rare": 15,
  "epic": 4,
  "legendary": 1
}
```

**Validation:** Total must equal 100%

### Probability Algorithm
Edge function `scratch-card` uses weighted random selection:
1. Generate random number 0-100
2. Check cumulative percentages:
   - 0-50: Common
   - 50-80: Uncommon
   - 80-95: Rare
   - 95-99: Epic
   - 99-100: Legendary

## Timezone Handling

### MST (Mountain Standard Time)
All daily resets occur at midnight MST (UTC-7):

```typescript
const getMSTDate = () => {
  const now = new Date();
  const mstOffset = -7 * 60; // MST is UTC-7 in minutes
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const mstTime = new Date(utc + (mstOffset * 60000));
  return mstTime;
};
```

**Usage:**
- Daily card date field uses `YYYY-MM-DD` in MST
- Cards expire 24 hours after creation
- New daily cards available at midnight MST

## Real-time Updates

### Supabase Realtime Subscription
`DailyScratchCard` subscribes to changes:

```typescript
supabase
  .channel('daily_scratch_cards_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'daily_scratch_cards',
    filter: `user_id=eq.${user.id}`
  }, (payload) => {
    checkDailyCard(); // Refetch data
  })
  .subscribe();
```

**Triggers refresh when:**
- Pack is opened (UPDATE)
- New bonus pack purchased (INSERT)
- Any pack-related change occurs

## Workflows

### Daily Pack Opening Flow
1. User clicks sticker icon on community page
2. `PackOpeningDialog` opens with loading state
3. Component fetches collection and sticker data
4. Displays pack cover with "Click to tear open" prompt
5. User clicks pack → tear animation plays
6. Component calls `scratch-card` edge function
7. Edge function:
   - Validates card is unscratched
   - Determines rarity via weighted random
   - Selects random sticker of that rarity
   - Updates card: `is_scratched=true`, `scratched_at=now()`
   - Checks for duplicate, updates user_stickers
   - Returns sticker details
8. Component displays revealed sticker with holographic effect
9. Triggers rarity-appropriate confetti
10. Shows duplicate badge if applicable
11. Real-time subscription triggers update in community widget
12. User closes dialog
13. `onOpened` callback refetches data

### Bonus Pack Purchase Flow
1. User on `/sticker-album` page
2. Clicks "Purchase Bonus Pack" button
3. Frontend displays current cost (exponential based on purchase #)
4. User confirms purchase
5. Frontend calls `purchase-bonus-card` edge function
6. Edge function:
   - Counts existing bonus packs today
   - Calculates cost: `base * (2 ^ purchase_number)`
   - Validates sufficient coins
   - Deducts coins
   - Logs transaction
   - Creates new bonus card
7. Success toast displayed
8. Page refetches data after 500ms delay (ensures DB commit)
9. New bonus pack appears in "Available Packs" section
10. User can immediately open it

### Collection Completion Flow
1. User obtains sticker (via opening pack)
2. Sticker added to `user_stickers` table
3. AFTER INSERT trigger fires: `on_sticker_obtained()`
4. Trigger calls `check_collection_completion(user_id, collection_id)`
5. Function:
   - Counts total active stickers in collection
   - Counts user's unique stickers in collection
   - If equal AND collection has `completion_badge_id`:
     - Inserts row in `user_badges` (ON CONFLICT DO NOTHING)
     - Returns true
6. Badge now visible in user's profile/achievements

## Admin Configuration

### Creating a Collection
1. Navigate to Admin → Besties → Collections
2. Click "Create Collection"
3. Fill out form:
   - Name (required)
   - Description (optional)
   - Theme (required)
   - Start Date (required)
   - End Date (optional, for limited-time collections)
   - Visible to Roles (array, required)
   - Preview Sticker (select after creating stickers)
   - Pack Image URL (optional, uses generated pack if empty)
   - Pack Animation URL (optional)
   - Rarity Percentages (defaults provided, must total 100%)
   - Completion Badge (optional)
4. Save collection
5. Add stickers (see below)
6. Set collection to `is_active = true`

### Adding Stickers to Collection
1. Select collection from dropdown
2. Click "Add Sticker"
3. Upload image (supports background removal)
4. Enter name (required)
5. Enter description (optional)
6. Select rarity
7. Set `is_active = true`
8. Save
9. Repeat for all stickers in collection

### Setting Preview Sticker
1. Create at least one sticker in collection
2. Edit collection
3. Select sticker from "Preview Sticker" dropdown
4. This sticker image appears on daily pack widget

### Adjusting Rarity Percentages
1. Edit collection
2. Adjust sliders or input exact percentages
3. Total must equal 100% (validation enforced)
4. Common practice: 50/30/15/4/1
5. For beginner-friendly: 60/25/10/4/1
6. For hardcore: 40/30/20/8/2

### Testing Pack Opening
1. Admin panel → Collections tab
2. Click "Test Pack" button on collection
3. Opens preview of pack opening animation
4. Does NOT consume actual pack or affect user data

## Settings Management

### Enable/Disable Stickers System
**Admin → Settings → App Settings**

Toggle: `stickers_enabled`
- ON: Stickers visible in community, routes accessible
- OFF: All sticker features hidden

### Bonus Pack Base Cost
**Admin → Settings → App Settings**

Setting: `bonus_card_base_cost`
- Default: 100 JoyCoins
- Affects exponential calculation for all bonus packs
- Change takes effect immediately

## Performance Optimizations

### Parallel Queries
`DailyScratchCard.checkDailyCard()` uses `Promise.all()`:
```typescript
const [settings, profile, activeCollections, existingCard, existingBonusCards] = 
  await Promise.all([...]);
```
Reduces load time from ~500ms sequential to ~100ms parallel.

### Background Preview Fetch
Preview sticker image fetches after setting main card state:
```typescript
(async () => {
  const { data } = await supabase.from('stickers').select('image_url')...;
  setSampleSticker(data.image_url);
})();
```
Prevents blocking card display, improves perceived performance.

### Realtime Subscription Filtering
Subscribe only to user's own cards:
```typescript
filter: `user_id=eq.${user.id}`
```
Reduces unnecessary events and refetches.

## Common Issues & Solutions

### "This pack has already been opened today"
**Cause:** Card's `is_scratched` field is already `true`
**Fix:** Check card in database, verify `scratched_at` timestamp matches

### Bonus pack shows scratcher instead of pack animation
**Cause:** Component using old `ScratchCardDialog` instead of `PackOpeningDialog`
**Fix:** All instances now use `PackOpeningDialog` (updated 2025-10-19)

### Pack state not updating after opening
**Cause:** Missing RLS UPDATE policy on `daily_scratch_cards`
**Fix:** Policy added: "Users can scratch their own cards" (2025-10-19)

### Daily pack not resetting at midnight
**Cause:** Timezone mismatch (using local time instead of MST)
**Fix:** Use `getMSTDate()` function consistently for date calculations

### No stickers in collection
**Cause:** All stickers `is_active = false` or no stickers created
**Fix:** Create stickers and set `is_active = true`

### Can't purchase bonus pack (insufficient coins error)
**Cause:** Exponential cost exceeds user's coin balance
**Fix:** Check cost calculation: `base_cost * (2 ^ purchase_number)`
  - 1st bonus: 100 coins
  - 2nd: 200
  - 3rd: 400
  - User needs adequate coins

### Duplicate detection not working
**Cause:** `user_stickers` query not checking existing records
**Fix:** Edge function now queries `user_stickers` before insert, increments quantity if exists

## Testing

### Manual Testing Checklist
- [ ] Daily pack appears on community page
- [ ] Click pack opens `PackOpeningDialog`
- [ ] Pack animation plays smoothly
- [ ] Sticker reveals with holographic effect
- [ ] Confetti triggers based on rarity
- [ ] Pack marked as used after opening
- [ ] Real-time update reflects in community widget
- [ ] Bonus pack purchase deducts correct coins
- [ ] Exponential pricing calculates correctly
- [ ] Duplicate badge shows when getting duplicate
- [ ] Collection progress updates correctly
- [ ] MST timezone resets packs at midnight
- [ ] RLS policies prevent unauthorized access

### Edge Function Testing
Use Supabase function invocation:
```typescript
const { data, error } = await supabase.functions.invoke('scratch-card', {
  body: { cardId: 'test-card-uuid' }
});
```

## Future Enhancements

### Potential Features
- Trading system (swap duplicates with friends)
- Sticker showcase (display favorite stickers)
- Achievements for collecting specific sets
- Seasonal collections with themed stickers
- Animated stickers (GIF/video support)
- Special event packs with boosted legendary rates
- Friend leaderboards (who collected most)
- Pack opening history log
- Gift packs to friends
- Lucky streak bonuses (open X packs in a row)

### Performance Improvements
- Image CDN integration for faster loading
- Pack preview caching
- Optimistic UI updates (assume success, rollback on error)
- Service worker for offline pack viewing

## Admin Daily Card Reset

### Overview
Admins can manually reset daily scratch cards with scoped targeting, useful for testing or fixing issues.

**Location:** Admin → Besties → Collections → Reset Daily Cards button

### Reset Scopes

#### 1. Only Me (self)
Deletes only the logged-in admin's daily cards for today.

**Use case:** Admin wants to test pack opening again without affecting others

**Query:**
```sql
DELETE FROM daily_scratch_cards 
WHERE user_id = <admin_user_id> 
  AND date = <today_mst>
```

#### 2. All Admins & Owners (admins)
Deletes daily cards for all users with admin or owner roles.

**Use case:** Reset cards for admin team testing

**Query:**
```sql
DELETE FROM daily_scratch_cards 
WHERE user_id IN (
  SELECT user_id FROM user_roles 
  WHERE role IN ('admin', 'owner')
) 
AND date = <today_mst>
```

#### 3. All Users (all)
Deletes daily cards for everyone in the system.

**Use case:** Major fix deployed, give everyone fresh daily pack

**Requires:** Confirmation dialog ("This will reset daily cards for ALL users")

**Query:**
```sql
DELETE FROM daily_scratch_cards 
WHERE date = <today_mst>
```

### Edge Function: `reset-daily-cards`

**Auth:** Admin or Owner only (via `has_admin_access()`)

**Request Body:**
```json
{
  "scope": "self" | "admins" | "all"
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Reset X daily cards",
  "deletedCount": 42
}
```

**Response Error:**
```json
{
  "error": "Admin access required"
}
```

### UI Flow
1. Admin clicks "Reset Daily Cards" button
2. Dialog opens with three radio button options:
   - ✓ Only Me (default)
   - ✓ All Admins & Owners
   - ✓ All Users (shows warning badge)
3. If "All Users" selected, additional confirmation text required
4. Click "Reset Cards" button
5. Success toast shown with count deleted
6. Cards immediately available for re-opening

## Documentation Status
**Last Updated:** 2025-10-20
**Status:** Complete - All pack opening instances use `PackOpeningDialog`, admin reset functionality with scope targeting
**Coverage:** Database schema, edge functions, components, workflows, admin tools, reset functionality

## Related Documentation
- `MASTER_SYSTEM_DOCS.md` - High-level sticker system overview
- `EDGE_FUNCTIONS_REFERENCE.md` - Edge function catalog
- `AUTOMATED_TESTING_SYSTEM.md` - E2E testing for sticker features
