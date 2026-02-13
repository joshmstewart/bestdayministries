

# Fix Mobile Audio Behavior (Mute Switch + Music Interruption)

## The Two Problems

1. **Sounds ignore the mute switch**: On iPhones, flipping the silent switch should silence app sounds, but currently it does not.
2. **Sounds stop background music**: When a sticker pack opens or any sound plays, it kills whatever music the user was listening to (Spotify, Apple Music, etc.).

## Root Cause

Both problems stem from the same underlying issue: the app uses `new Audio()` (HTMLAudioElement) for all sound playback. On iOS, this creates a "media" audio session that:
- Ignores the silent/ringer switch
- Takes exclusive audio focus, pausing other apps' audio

## Solution

Replace all sound-effect playback with a shared `AudioContext` configured to behave as "ambient" audio. This is a two-part approach:

### Part 1: Capacitor Native Audio Session (for the native app)

Since the project already uses Capacitor, install and configure `@nicepkg/capacitor-native-audio` (or a similar Capacitor audio session plugin) that can set the iOS audio session category to `ambient`. This:
- Respects the mute/silent switch
- Mixes with other audio (won't pause Spotify)

If no suitable Capacitor plugin exists, create a small custom native plugin or use `@nicepkg/capacitor-silent` to detect the silent switch, combined with the Web Audio API approach below.

### Part 2: Web Audio API with "Ambient" Behavior (for both web and native)

Refactor the `useSoundEffects` hook (the central sound playback system) to:

1. **Use a single shared `AudioContext`** instead of creating `new Audio()` elements per sound
2. **Fetch and decode audio buffers** for each sound effect URL upfront (or lazily on first use)
3. **Play sounds through `AudioContext`** buffer sources, which on iOS with the correct session category will mix with other audio

### Files to Modify

1. **`src/hooks/useSoundEffects.ts`** -- The main change. Replace `new Audio()` with:
   - A shared `AudioContext` (singleton)
   - `fetch()` + `decodeAudioData()` to load sound files into buffers
   - `createBufferSource()` + `connect()` + `start()` to play them
   - Volume control via `GainNode`

2. **`src/components/PackOpeningDialog.tsx`** -- No changes needed (it already uses `useSoundEffects.playSound()`)

3. **`src/components/chores/SpinningWheel.tsx`** -- Refactor its local `new Audio()` pool to use the shared audio system

4. **`src/components/TextToSpeech.tsx`** -- Refactor `new Audio(audioUrl)` to use `AudioContext.decodeAudioData` for the base64 TTS audio

5. **`src/components/AudioPlayer.tsx`** -- This uses `<audio>` element with user-initiated play, which is fine. But we should add the `playsInline` attribute for iOS.

6. **Other scattered `new Audio()` usages** (admin previews, profile settings, etc.) -- Lower priority since those are admin/settings pages, but ideally converted too

7. **New file: `src/lib/audioManager.ts`** -- A singleton audio manager that:
   - Creates and manages one `AudioContext`
   - Handles buffer caching
   - Provides a `playBuffer(url, volume)` method
   - On Capacitor native: configures the audio session category

8. **`capacitor.config.ts`** -- Add any needed plugin configuration for native audio session

## Technical Details

### The AudioManager Singleton

```text
AudioManager (singleton)
  |-- audioContext: AudioContext (created on first user interaction)
  |-- bufferCache: Map<string, AudioBuffer>
  |-- loadBuffer(url): fetches + decodes + caches
  |-- play(url, volume): loads if needed, creates source, plays
  |-- Capacitor: sets iOS audio session to "ambient"
```

### Key Behavioral Changes

- **Mute switch respected**: The "ambient" audio session category on iOS respects the hardware silent switch
- **Music keeps playing**: "Ambient" category mixes with other audio sources instead of taking exclusive focus
- **User interaction still required**: AudioContext must be resumed after a user gesture (already handled in the app's existing patterns)

### Capacitor Plugin Evaluation

Need to evaluate which Capacitor plugin best handles iOS audio session configuration. Options:
- `capacitor-plugin-audio-session` -- set category to `.ambient` or `.playback` with `.mixWithOthers`
- Custom Swift plugin (small, just sets `AVAudioSession.sharedInstance().setCategory(.ambient)`)
- If no plugin works well, the Web Audio API approach alone still fixes the music-interruption issue on most browsers

### Migration Strategy

- All changes go through the centralized `audioManager.ts`
- Existing `useSoundEffects` hook API stays the same (`playSound('event_type')`) -- no consumer changes needed
- The `PackOpeningDialog` and all other callers continue working identically
- Graceful fallback: if `AudioContext` is unavailable, fall back to `new Audio()` (desktop browsers)

## Risk Assessment

- **Low risk**: The `playSound` API surface doesn't change, only the internal implementation
- **Testing needed**: Must test on actual iOS device with silent switch and background music playing
- **Edge case**: Very first sound after app load may require a user tap (AudioContext resume) -- already handled in existing patterns

