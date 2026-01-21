# WORKOUT_IMAGE_SYSTEM

## Overview
The Workout Tracker generates AI images for a user's logged workouts using their selected fitness avatar.

It supports two image types:
- **activity**: created when a user logs an activity (e.g. jogging)
- **celebration**: optionally created when the user meets their weekly activity goal

## Data Model

Tables:
- `user_workout_logs` — source-of-truth workout log rows
- `workout_generated_images` — image records (one row per generated image)
- `fitness_avatars` — avatar catalog (includes `character_prompt`, `image_url`, `preview_image_url`)
- `user_fitness_avatars` — user-owned/selected avatar

Storage:
- `workout-images` bucket — stores the generated PNGs

## UI Behavior (Workout tab)

`CurrentAvatarDisplay` shows a **single "Today" image**.

**Critical rule:** If a celebration image is generated *after* an activity image, the UI must still prefer the **latest activity** image so the user sees the workout they just logged.

Implementation:
- Query today’s images ordered by `created_at desc`
- Prefer the first row where `image_type === 'activity'`
- Fall back to the most recent image if no activity image exists

## Image Generation Function

Function:
- `supabase/functions/generate-workout-image`

Inputs:
```ts
{
  avatarId: string;
  imageType: 'activity' | 'celebration';
  activityName?: string;     // required for activity
  workoutLogId?: string;     // recommended for activity
  isAdminTest?: boolean;
  location?: string;
}
```

Key implementation details:
- Uses **image-to-image** generation whenever possible:
  - Prefer `fitness_avatars.image_url`
  - Fallback to `fitness_avatars.preview_image_url` (most avatars only have preview images)
- Uses Lovable AI model: `google/gemini-2.5-flash-image-preview`
- Persists:
  - image file to `workout-images` bucket
  - record to `workout_generated_images`

## Common Gotchas

1. **Celebration overwriting the Workout preview**
   - Celebration is often generated a couple seconds after the activity image.
   - If the UI naively shows "latest image", it will show the trophy celebration instead of the workout.

2. **Avatar consistency issues**
   - If `image_url` is null and the function falls back to text-only prompts, the character may drift.
   - Always use the avatar’s preview image for image-to-image when available.

## Avatar Catalog Image Generation (Admin)

There is a separate admin-only function used to generate/update the **preview image** for entries in `fitness_avatars`.

Function:
- `supabase/functions/generate-avatar-image`

Key requirement (type persistence):
- The admin UI needs a persisted character type (`human | animal | superhero | monster`) so list-view “Regenerate” can apply the right prompt rules.
- If the `fitness_avatars` table does **not** currently store this type, the list view will default to `human` and monsters can be regenerated as humans.
- Fix: add a `character_type` column (or equivalent) to the backend schema and store it on create/update.

Safety behavior:
- The image model may sometimes return **no image** with an `IMAGE_SAFETY` reason.
  - In that case, the function returns a non-200 response and the UI should show an error toast (not crash).
