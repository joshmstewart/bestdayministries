# MEMORY MATCH SYSTEM

## Overview
Memory Match is a card-matching game with optional, database-driven image packs. Packs are managed in Admin and can be previewed directly from the pack manager.

### UX / Performance Notes (Frontend)
- The game **warms (preloads)** pack card-face images and the card-back image when packs are loaded/selected and when a round is dealt. This prevents:
  - The **slow first flip** (waiting on the first card-face image download)
  - The "**second card never showed**" effect (image loads so late that the non-match flip-back timer finishes before the image paints)
- Non-matching pairs flip back down after a short delay (currently ~600ms), guarded by an interaction lock (`isProcessingRef`) to prevent extra taps during the flip-back window.

## Routes
- `/games/memory-match` 
  Main Memory Match game

## Admin
- Admin 2 Games 2 Memory Match
  - `MemoryMatchPackManager` 
    Manage packs + images, generate icons/card-backs, and preview gameplay.

## Database
- `memory_match_packs` 
  Pack metadata (name, description, design_style, is_active, is_default, card_back_url, background_color, module_color, etc.)
  - `background_color` - Hex color for the outer glow/background area behind the game module
  - `module_color` - Hex color for the inner module/card that contains the game elements
- `memory_match_images` 
  Individual card faces (name, image_url, display_order, pack_id)
- `user_memory_match_packs` 
  Records which users own which packs
- `game_sessions` 
  Stores completed games for scoring/coins

## Backend Functions
### `generate-memory-match-icon`
Generates a pack icon for a single `memory_match_images` record.

**Key guarantee:** icons are always saved as **full-bleed 5120512 squares** with a **solid, consistent background** across the whole pack.

#### Pipeline (why this is reliable)
1. AI generates the *subject* on a **transparent background** (no borders, no frames).
2. The backend composites that subject onto a **deterministic theme background hex**.
3. The result is encoded as PNG and uploaded, guaranteeing:
   - No accidental margins
   - No rounded-corner containers
   - Identical background across all icons in the pack

#### Background selection
- Deterministic palette chosen from pack name (e.g. Space uses bright cosmic colors).
- **Override:** if the admin includes a hex code anywhere in `design_style`, the first hex is used as the pack background.

### `generate-memory-match-card-back`
Generates an ornate themed card back for the pack and stores it on `memory_match_packs.card_back_url`.

### `generate-memory-match-description`
Generates pack description + suggested item names + optionally a style guide.

## Game image selection logic
When a game starts, the game randomly shuffles the current packs images and then picks the required number of pairs based on difficulty:
- Easy: 6 pairs
- Medium: 8 pairs
- Hard: 10 pairs

## Files
- `src/components/games/MemoryMatch.tsx`
- `src/components/admin/MemoryMatchPackManager.tsx`
- `src/components/admin/MemoryMatchPreview.tsx`
- `supabase/functions/generate-memory-match-icon/index.ts`
- `supabase/functions/generate-memory-match-card-back/index.ts`
