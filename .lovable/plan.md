
# Plan: Daily Fortune Dedicated Page + Remove Daily Check-in

## Overview
Create a dedicated Daily Fortune page and remove the redundant Daily Check-in page since mood tracking is handled by the Emotion Journal.

## Changes

### 1. Create New Daily Fortune Page
**New file:** `src/pages/DailyFortune.tsx`
- Standard page layout (UnifiedHeader, Footer)
- "Back to Home" button (per memory standard)
- Uses existing `DailyFortune` component as main content
- Also shows `FortuneComments` below the fortune for discussion
- Link to "My Fortunes" (saved bookmarks) in header

### 2. Update App Routes
**File:** `src/App.tsx`
- Add route: `/daily-fortune` → `DailyFortune` page
- Remove route: `/daily-checkin` → `DailyCheckin` page
- Remove lazy import for `DailyCheckin`

### 3. Update Apps Grid Configuration
**File:** `src/components/community/appsConfig.ts`
- Change the "daily-checkin" entry:
  - ID: `daily-fortune`
  - Name: "Daily Fortune" (or "Daily Inspiration")
  - Route: `/daily-fortune`
  - Icon: Sparkles
  - Description: "Today's inspiration"

### 4. Update Internal Pages Registry
**File:** `src/lib/internalPages.ts`
- Remove `/daily-checkin` entry
- Add `/daily-fortune` entry

### 5. Delete Redundant Files
**Delete:** `src/pages/DailyCheckin.tsx`
**Keep:** `src/components/daily-features/DailyHub.tsx` (may be useful for other purposes, or can be deleted if unused)

### 6. Update DailyBar Fortune Behavior (Optional Enhancement)
**File:** `src/components/daily-features/DailyBar.tsx`
- Add "Full Page" link to Fortune popup (like Daily Five has)
- Links to `/daily-fortune`

## Summary

| Change | Action |
|--------|--------|
| New `/daily-fortune` page | Create |
| `/daily-checkin` route | Remove |
| Apps grid config | Update ID/name/route |
| Internal pages registry | Update |
| `DailyCheckin.tsx` | Delete |
| DailyBar popup | Add "Full Page" link |

## Result
- Fortune gets its own dedicated page at `/daily-fortune`
- Streak stays where it is (Community/Homepage)
- Mood tracking goes through Emotion Journal
- No more duplicate Daily Check-in page
