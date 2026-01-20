# Beat Pad System

## Overview
Beat Pad (`/games/beat-pad`) is a step-sequencer game that lets users create beats, save them, share them to the community, and play loops from gallery lists.

## Database
- `beat_pad_sounds`
  - Source of truth for available instruments.
  - Fields used by the UI: `id`, `sound_type`, `name`, `emoji`, `color`, `frequency`, `decay`, `oscillator_type`, `has_noise`, `audio_url`.
- `beat_pad_creations`
  - User-created beats.
  - `pattern` is stored as a JSON object.
  - `likes_count` is maintained by a trigger that reacts to inserts/deletes in `beat_pad_likes`.
- `beat_pad_likes`
  - Community likes for public beats.
  - Inserting a like also triggers an in-app notification for the beat creator (via a trigger function).

## Pattern Storage (CRITICAL)
### Current format (preferred)
- `beat_pad_creations.pattern` keys are **sound UUIDs** (`beat_pad_sounds.id`).
- Save flow converts the grid's slot-indexed pattern into UUID-keyed pattern before inserting.

### Legacy format (supported for backward compatibility)
- Some older beats may have `pattern` keys as **sound_type** strings (e.g., `"kick"`, `"snare"`, `"bass"`).
- Load flow must detect this and load instruments via `beat_pad_sounds.sound_type`.

### Unsupported formats
- If pattern keys are neither UUIDs nor sound_type strings, the UI should show a **persistent red error with copy button** (use `showErrorToastWithCopy`).

## Loading Beats (UI)
- `src/pages/BeatPad.tsx` `handleLoadBeat()`:
  1. Stops playback
  2. Detects pattern key format
  3. Loads instruments from `beat_pad_sounds` (by `id` or by `sound_type`)
  4. Normalizes the pattern back to slot-indexed keys (`"0".."19"`) for the grid

## Loop Playback from Lists
- `src/hooks/useBeatLoopPlayer.ts`
  - Ensures only one beat loop plays globally across lists (My Beats / Community).
  - Starting a second beat stops the first.

## Mobile Scroll + Touch (CRITICAL)
- Avoid `touch-pan-x` on large beat-grid containers: it can **block vertical page scrolling on iOS**.
- Prefer `touch-manipulation` on the grid wrapper so taps feel responsive *and* the user can still scroll the page.
- For tall dialogs on iOS/Safari, avoid relying on `DialogContent`'s default `display:grid`. Use: `DialogContent` = `flex flex-col overflow-hidden`, and a child wrapper = `flex-1 min-h-0 overflow-y-auto [-webkit-overflow-scrolling:touch]`.

## Mobile Audio Preview (iOS/Safari)
- Trigger playback from `onPointerDown` (not just `onClick`).
- If `AudioContext.state === 'suspended'`, call `ctx.resume()` **without awaiting** and start nodes immediately inside the user gesture; playback will begin once the context resumes.
- If `AudioContext.state === 'suspended'`, call `ctx.resume()` and **start playback only after the resume promise resolves**; starting oscillators/buffers before resume completes can be silent on iOS.

## Deep Linking (Tabs)
Beat Pad supports opening directly to a tab via URL:
- `/games/beat-pad?tab=community` (Community tab)
- `/games/beat-pad?tab=my-beats` (My Beats tab)
- `/games/beat-pad` (defaults to Create tab)
