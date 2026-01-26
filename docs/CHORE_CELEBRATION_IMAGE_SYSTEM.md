# CHORE CELEBRATION IMAGE SYSTEM

## Overview
When a user completes all their chores for the day, they can generate an AI celebration image featuring their selected fitness avatar doing a random generic chore activity at a random location from their enabled workout locations.

## Key Behavior
- **Trigger**: All daily chores completed → Celebration dialog opens
- **Random Activity**: Picks from 15 generic chore activities (not specific to user's chores)
- **Random Location**: Uses user's enabled workout location packs (same as workout images)
- **No Avatar**: Gracefully skips image generation (same as workout behavior)

## Database Schema

**chore_celebration_images**
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `avatar_id` (uuid, FK → fitness_avatars)
- `image_url` (text)
- `activity_category` (text) - e.g., "Washing Dishes", "Sweeping"
- `completion_date` (date)
- `location_id` (uuid, FK → workout_locations, nullable)
- `location_name` (text, nullable)
- `location_pack_name` (text, nullable)
- `created_at` (timestamp)

## Edge Function

**generate-chore-celebration-image**
- Auth required
- Inputs: `{ targetUserId?: string }`
- Returns: `{ success, image, activity, location }` or `{ success: false, skipped: true, reason }`

### Generic Chore Activities
- Washing Dishes
- Sweeping
- Vacuuming
- Making the Bed
- Folding Laundry
- Watering Plants
- Taking Out Trash
- Organizing Shelves
- Wiping Counters
- Feeding a Pet
- Dusting
- Mopping
- Setting the Table
- Tidying Up Toys
- Brushing Teeth

### Location Selection Logic
1. Get user's enabled workout location packs
2. Include free packs by default
3. Avoid recently used locations (last 10 images)
4. Fall back to default "cozy home interior" if no locations

## Components

**ChoreCelebrationDialog** (`src/components/chores/ChoreCelebrationDialog.tsx`)
- Opens when all daily chores complete
- Shows existing image if already generated today
- "Generate Celebration Image" button
- Links to workout tracker if no avatar selected
- Displays activity + location on generated image

## Storage
- Bucket: `workout-images`
- Path: `chore-celebrations/{userId}/{date}_{timestamp}.png`

## Character Enhancements
Same as workout images:
- **Bubble Benny**: Always has soap bubbles
- **Xerox Xander**: Shows two identical characters
- **Sex constraints**: Male/Female/Androgynous anatomical consistency

## Files
- `supabase/functions/generate-chore-celebration-image/index.ts`
- `src/components/chores/ChoreCelebrationDialog.tsx`
- `src/pages/ChoreChart.tsx` (triggers dialog)
