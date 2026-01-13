# CHORE CHALLENGE SYSTEM (Monthly Scene Builder)

## Overview
A monthly visual progression system for the chore tracker where users build personalized scenes by completing daily chores. Each day they complete all their chores, they earn a sticker to place on their scene. At month's end, they can share their creation with the community and earn rewards.

## Core Concept
- **Monthly Theme**: Each month has a unique theme (e.g., Winter Wonderland, Spring Garden)
- **Scene Building**: Users pick backgrounds and place stickers to create personalized art
- **Progress Tracking**: 1 day of completed chores = 1 sticker earned
- **Rewards**: Coins + unique monthly badge upon reaching completion threshold

## Database Schema

### Tables

**chore_challenge_themes**
- `id` (uuid, PK)
- `month` (int, 1-12)
- `year` (int)
- `name` (text) - "Winter Wonderland"
- `description` (text, nullable)
- `background_options` (jsonb) - Array of background options
- `sticker_elements` (jsonb) - Array of stickers by category
- `badge_name` (text) - "Snow Artist"
- `badge_icon` (text) - "❄️"
- `badge_description` (text, nullable)
- `coin_reward` (int, default 100)
- `days_required` (int, default 15)
- `is_active` (boolean)

**chore_challenge_progress**
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `theme_id` (uuid, FK)
- `selected_background` (text, nullable)
- `placed_stickers` (jsonb) - Array of placed stickers with position/rotation/scale
- `completion_days` (int) - Total days completed this month
- `is_completed` (boolean)
- `completed_at` (timestamp, nullable)
- `shared_at` (timestamp, nullable)
- `shared_image_url` (text, nullable)

**chore_challenge_daily_completions**
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `theme_id` (uuid, FK)
- `completion_date` (date)
- `sticker_earned` (boolean)
- `sticker_placed` (boolean)

**chore_challenge_gallery**
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `theme_id` (uuid, FK)
- `progress_id` (uuid, FK)
- `title` (text, nullable)
- `image_url` (text)
- `likes_count` (int)

**chore_challenge_gallery_likes**
- `id` (uuid, PK)
- `gallery_id` (uuid, FK)
- `user_id` (uuid, FK)

### JSONB Structures

**background_options**:
```json
[
  {
    "id": "uuid",
    "name": "Snowy Forest",
    "image_url": "https://..."
  }
]
```

**sticker_elements**:
```json
[
  {
    "id": "uuid",
    "name": "Snowman",
    "image_url": "https://...",
    "category": "Characters"
  }
]
```

**placed_stickers**:
```json
[
  {
    "sticker_id": "uuid",
    "x": 50,
    "y": 50,
    "scale": 1.0,
    "rotation": 0,
    "placed_on_date": "2026-01-15T..."
  }
]
```

## Components

### User-Facing

**MonthlyChallengeCard** (`src/components/chores/MonthlyChallengeCard.tsx`)
- Displays on chore chart page
- Shows current month's challenge
- Progress bar (days completed / days required)
- Unplaced sticker indicator
- "Build" button to open scene builder
- Reward preview (coins + badge)

**SceneBuilder** (`src/components/chores/SceneBuilder.tsx`)
- Dialog for building the scene
- Left: Canvas with background and placed stickers
- Right: Tabs for backgrounds and stickers
- Drag/drop stickers onto canvas
- Scale, rotate, remove placed stickers
- Share button when complete

**ChallengeGallery** (`src/components/chores/ChallengeGallery.tsx`)
- View community creations
- Like/unlike functionality
- Full image preview

### Admin

**ChoreChallengeManager** (`src/components/admin/ChoreChallengeManager.tsx`)
- Admin → Resources → Chores → Monthly Challenges tab
- CRUD for challenge themes
- Manage backgrounds and stickers
- Activate/deactivate themes
- Preview mode

## Hooks

**useMonthlyChallenge** (`src/hooks/useMonthlyChallenge.ts`)
- Loads current month's active theme
- Manages user's progress
- Functions: selectBackground, placeSticker, updateStickerPosition, removeSticker, completeChallenge
- Auto-creates progress record if none exists

## Triggers

**check_daily_chore_completion** - Database function that:
1. Runs when chore_completions are updated
2. Checks if all daily chores are completed
3. Creates daily_completion record
4. Increments completion_days in progress

## Workflows

### Daily Flow
1. User completes all daily chores
2. Trigger creates daily completion record
3. Progress.completion_days incremented
4. User opens SceneBuilder
5. User places earned sticker
6. Save position to placed_stickers

### Monthly Completion
1. User reaches days_required threshold
2. "Complete Challenge" button appears
3. User clicks to complete
4. Badge + coins awarded
5. User can share to community gallery

### Sharing Flow
1. Challenge must be complete
2. User clicks "Share Creation"
3. Canvas rendered to image (future: html2canvas)
4. Image uploaded to storage
5. Gallery entry created
6. Community can view and like

## RLS Policies

- Users can view own progress
- Users can update own progress
- Admins can manage all themes
- Anyone authenticated can view gallery
- Users can like (insert/delete own likes)

## Admin Setup

1. Go to Admin → Resources → Chores → Monthly Challenges
2. Click "Create Theme"
3. Set month/year and name
4. Add background options (image URLs)
5. Add sticker elements with categories
6. Set days_required and coin_reward
7. Set badge name and icon
8. Activate theme

## Files

- `src/hooks/useMonthlyChallenge.ts` - State management hook
- `src/components/chores/MonthlyChallengeCard.tsx` - Progress card
- `src/components/chores/SceneBuilder.tsx` - Scene building dialog
- `src/components/chores/ChallengeGallery.tsx` - Community gallery
- `src/components/admin/ChoreChallengeManager.tsx` - Admin interface
- `supabase/migrations/*_chore_challenge*.sql` - Database schema

## Future Enhancements

1. **Canvas Export**: Use html2canvas to render scene as image for sharing
2. **Sticker Pack Rewards**: Award themed stickers from sticker album
3. **Leaderboard**: Most liked creations per month
4. **Templates**: Pre-made scene layouts users can start from
5. **Sound Effects**: Audio on sticker placement
6. **Undo/Redo**: History for sticker placements
