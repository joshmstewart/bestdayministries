# Emotion Journal System

## Overview
The Emotion Journal lets authenticated users log how they feel each day (with optional notes) and then shows a supportive response.

Key UX goal: when a user has selected a fitness avatar, the emotion selection grid should show **that avatar’s 16 emotion portraits** (when approved), falling back to standard emojis if any portrait is missing.

## Routes
- `/games/emotion-journal` — main page (log emotion, history, patterns)

## Core Tables
- `emotion_types`
  - Source of truth for available emotions.
  - Fields used by UI: `id`, `name`, `emoji`, `color`, `category`, `display_order`, `is_active`.

- `user_fitness_avatars`
  - Stores a user’s selected avatar.
  - Query pattern: `.eq('user_id', userId).eq('is_selected', true).maybeSingle()`.

- `avatar_emotion_images`
  - Stores generated emotion portraits for each avatar.
  - UI uses only approved images:
    - `.eq('is_approved', true)`
  - Fields used by UI: `emotion_type_id`, `image_url`, `crop_scale`.
  - `crop_scale` is a per-image zoom factor (typically `1.0`–`2.0`) used to keep faces framed consistently in circular UI.

- `mood_entries`
  - Stores the “daily check-in” used by Daily Bar / gamification.

- `emotion_journal_entries`
  - Stores journal-specific entries (emotion + optional text).

- `mood_messages`
  - Stores pre-written encouraging messages by emoji.

## Backend Functions
- `emotion-journal-response`
  - If the user provided journal text: returns an AI-generated simple supportive response.
  - If no journal text: returns a random pre-generated response from `mood_responses`.

## Frontend Files
- `src/pages/EmotionJournal.tsx`
  - Loads `emotion_types` for the grid.
  - Loads today’s entry from `mood_entries` (MST date).
  - **Avatar emotion portraits (grid):**
    - Fetch selected avatar from `user_fitness_avatars`.
    - Fetch all approved rows from `avatar_emotion_images` for that avatar.
    - Build a lookup map keyed by `emotion_type_id`.
    - Render a circular thumbnail per emotion:
      - If image exists: show `<img>` inside `overflow-hidden rounded-full` and apply `transform: scale(crop_scale)`.
      - Else: show the emotion’s `emoji`.

- `src/hooks/useAvatarEmotionImage.ts`
  - Single-emotion helper used for the header/selected state.

## Rendering Rule (Portrait vs Emoji)
For any given emotion type:
1. Use `avatar_emotion_images.image_url` if available and approved.
2. Otherwise, fall back to `emotion_types.emoji`.
