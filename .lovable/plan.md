

## Problem Analysis

The location field has a fundamental architectural issue: **Google Places Autocomplete manipulates the DOM input directly**, bypassing React's controlled `value` state. This causes a desync where:

1. User types a manual address → React state updates correctly via `onChange`
2. Google Autocomplete attaches to the input and may fire `place_changed` with empty/partial data when the user clicks away (to hit Save), **overwriting** the location state
3. Even with the `onBlur` fix, there's a race condition: Google's `place_changed` can fire *after* `onBlur`, resetting the value
4. The save function reads `location` state (line 335: `location: location?.trim() || null`) — if Google cleared it, the save succeeds with empty/wrong data

The toast says "Event updated successfully" because the DB update itself doesn't error — it just saves the wrong (empty or partial) value.

## Root Cause

Google Places Autocomplete fires `place_changed` whenever the user interacts with the input and then leaves it — even if they didn't select a suggestion. When no place is selected, `getPlace()` returns an object with only `name` (whatever text is in the input) but sometimes returns an empty object. The current handler at line 118-125 may call `onChange` with an empty/wrong value.

## Plan

### 1. Fix the `place_changed` handler to never clear valid input

In `LocationAutocomplete.tsx`, modify the `place_changed` listener to only update state if the place has meaningful data. If `getPlace()` returns no `formatted_address` and no `name`, preserve the current value instead of clearing it.

### 2. Add a DOM-sync safety net before save

Add a `ref` callback or imperative method so that **at save time**, `EventManagement.tsx` reads the actual DOM input value as a fallback. This can be done by:

- Adding a `ref` prop to `LocationAutocomplete` that exposes `getInputValue()` 
- OR simpler: making the component sync DOM→state on every input event using a `MutationObserver` or periodic sync

The simpler approach: **use an uncontrolled input pattern** — stop fighting Google by removing `value={value}` (making it uncontrolled) and instead sync from DOM→React on every change. Use `defaultValue` + `ref` to read the actual value.

### 3. Recommended approach (simplest, most reliable)

**Hybrid controlled/uncontrolled**: Keep `value` for display purposes but add a final DOM-read sync right before save:

In `LocationAutocomplete.tsx`:
- Expose the `inputRef` via `forwardRef` or a callback ref prop
- Guard `place_changed`: only update if place has real data

In `EventManagement.tsx`:
- Before building `eventData`, read `document.getElementById('location')?.value` as a final fallback
- Use whichever is non-empty: React state or DOM value

### Files to modify:
- `src/components/LocationAutocomplete.tsx` — fix `place_changed` handler, expose ref
- `src/pages/EventManagement.tsx` — add DOM fallback read at save time
- `docs/SAVED_LOCATIONS_SYSTEM.md` — update with fix details

