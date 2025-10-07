EVENTS SYSTEM - CONCISE

## Overview
Community calendar (`/events`) with recurring events, multiple dates, role-based visibility, AI image moderation.

## Database
**events:** `title`, `description`, `image_url`, `audio_url`, `location`, `event_date`, `aspect_ratio` (default: '9:16'), `is_recurring`, `recurrence_type`, `expires_after_date`, `visible_to_roles[]`, `is_active`

**event_dates:** `event_id`, `event_date` (additional dates for recurring events)

**event_attendees:** `event_id`, `user_id`, `status` (future feature)

## Event Types
- **Single:** `is_recurring: false`, only `event_date` used
- **Recurring (multi-date):** `is_recurring: true` + entries in `event_dates` → separate card per date
- **Recurring (template):** `is_recurring: true` without `event_dates` → shows primary date only

## Display Logic
**Upcoming:** `date >= now()`, chronological, each date = separate card
**Past:** `date < now()` AND `expires_after_date = false`, reverse chronological, grayscale + "Past Event" badge
**Expiration:** If `expires_after_date = true`, past dates hidden completely

**Role Filter:** Client-side filter by `visible_to_roles` after DB fetch

## Event Card Components
- **Image:** `AspectRatio` wrapper, parse string ("9:16") → decimal (9/16)
- **Dates:** Primary date (large box) + all dates list (if multiple) with current highlighted
- **TTS:** Reads `title + description + date + location`
- **Location:** Clickable `LocationLink` → Google Maps
- **Audio:** Inline `AudioPlayer` if `audio_url` exists

## Event Detail Dialog
Click card → `EventDetailDialog` with full details, all dates, recurrence info, audio, location

## Linked Events
**URL:** `/events?eventId=xxx` (from discussion posts via `event_id`)
- Auto-opens dialog, bypasses expiration for linked events

## Content Moderation
**Image:** `moderate-image` edge function on upload → stores `moderation_status`, `moderation_severity`, `moderation_reason`

## Admin (`/event-management`)
Create/edit events: title, description, date/time, recurrence settings, image (crop + aspect ratio), audio, visibility roles, expiration toggle
**Add Multiple Dates:** Edit event → Add Date → creates `event_dates` entry

## RLS Policies
- **SELECT:** All authenticated (client-side role filter)
- **INSERT:** Authenticated users
- **UPDATE/DELETE:** Author or admin
- **event_dates:** Event creator only

## Common Issues
| Issue | Fix |
|-------|-----|
| Event not showing | Check `is_active`, `visible_to_roles`, user role |
| Wrong aspect ratio | Parse string to decimal |
| Past event visible | Check `expires_after_date` |
| Recurring shows once | Add `event_dates` entries |

**Files:** `EventsPage.tsx`, `EventManagement.tsx`, `EventDetailDialog.tsx`, `moderate-image/index.ts`
