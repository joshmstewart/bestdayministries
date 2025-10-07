# EVENTS SYSTEM - CONCISE DOCS

## Overview
Community calendar (`/events`) with recurring events, multiple dates, role-based visibility, and AI moderation.

## Database Tables
**events**
- `title`, `description`, `image_url`, `audio_url`, `location`
- `event_date` (primary date), `aspect_ratio` (default: '9:16')
- `is_recurring`, `recurrence_type` (daily/weekly/monthly/custom)
- `recurrence_interval` (for custom), `recurrence_end_date`
- `expires_after_date` (bool: hide after date passes)
- `visible_to_roles[]` (role-based access)
- `is_active`, `is_public`

**event_dates**
- `event_id`, `event_date`
- Stores additional dates for recurring events

**event_attendees**
- `event_id`, `user_id`, `status` (registered/cancelled)
- Future feature (not implemented yet)

## Event Types

### Single Date Event
- `is_recurring: false`
- Only `event_date` used
- Creates 1 event card

### Recurring Event with Multiple Dates
- `is_recurring: true`
- Primary `event_date` + additional dates in `event_dates` table
- Creates **separate card for each date**

### Recurring Without Explicit Dates
- `is_recurring: true` but no `event_dates` entries
- Only shows primary date (admin can add dates later)

## Display Logic

### Upcoming Events Section
- **Filter:** `event_date >= now()`
- **Sort:** Chronological (earliest first)
- Each date gets its own card
- Highlighted current date in multi-date list

### Past Events Section
- **Filter:** `event_date < now()` AND `expires_after_date = false`
- **Sort:** Reverse chronological (most recent first)
- Grayscale images, line-through dates
- "Past Event" badge

### Date Expiration
- If `expires_after_date = true`: Hide all past dates completely
- If `expires_after_date = false`: Show in Past Events section

## Role-Based Visibility
```typescript
// Client-side filter (post-query)
events.filter(event => 
  event.visible_to_roles?.includes(userRole)
)
```
- Fetches all active events from DB
- Filters by user's role on frontend
- Uses `useRoleImpersonation()` for admin testing

## Event Card Components

### Image Display
```tsx
<AspectRatio ratio={parseFloat(aspect_ratio)}>
  <img className="w-full h-full object-cover" />
</AspectRatio>
```
- Parse `aspect_ratio` string ("9:16") to decimal (0.5625)
- AspectRatio wrapper maintains ratio
- `object-cover` fills container

### Date Display
**Primary Date (large box):**
- `format(displayDate, "PPPP")` - Full date
- `format(displayDate, "p")` - Time
- Colored background for upcoming, muted for past

**All Dates List (if multiple):**
- Shows all dates with indicators
- Current date: highlighted background
- Past dates: opacity-50 + line-through
- Future dates: opacity-70

### TTS Integration
```tsx
<TextToSpeech text={`${title}. ${description}. Scheduled for ${formatDate}. At ${location}`} />
```

### Location Link
```tsx
<LocationLink location={location} />
```
- Clickable link to Google Maps
- Opens in new tab
- Event propagation stopped

### Audio Player
```tsx
{audio_url && <AudioPlayer src={audio_url} />}
```
- Inline player in card
- Event propagation stopped

## Event Detail Dialog
**Trigger:** Click event card
**Component:** `EventDetailDialog`
- Full event details
- All dates listed
- Recurrence info
- Audio player + location

## Linked Events (Discussion Integration)
**URL Pattern:** `/events?eventId=xxx`
- Discussion posts can link events via `event_id`
- URL param auto-opens event dialog
- Loads past events if linked (bypasses expiration)

## Content Moderation (AI)

### Image Moderation
- Edge function: `moderate-image`
- Checks on upload before save
- Stores: `moderation_status`, `moderation_severity`, `moderation_reason`
- Admin can override in Event Management

### Text Moderation
- Not currently implemented
- Future: Moderate title/description

## Event Creation (Admin Only)
**Location:** `/event-management`
- Title, description, location
- Date/time picker
- Recurrence settings (type, interval, end date)
- Image upload (with crop, aspect ratio)
- Audio upload
- Visibility roles (checkboxes)
- `expires_after_date` toggle

## Adding Multiple Dates
**Location:** Event Management → Edit Event → Add Date
- Adds entry to `event_dates` table
- Each date creates separate card on Events page
- Can add unlimited dates

## RLS Policies
**events SELECT:** All authenticated users (client-side role filter)
**events INSERT:** Authenticated users (author)
**events UPDATE/DELETE:** Author or admin
**event_dates INSERT/DELETE:** Event creator only

## Key Files
- `src/pages/EventsPage.tsx` - Public events page
- `src/pages/EventManagement.tsx` - Admin CRUD
- `src/components/EventDetailDialog.tsx` - Modal dialog
- `supabase/functions/moderate-image/index.ts` - Image moderation

## Common Issues
| Issue | Solution |
|-------|----------|
| Event not showing | Check `is_active`, `visible_to_roles`, role filter |
| Wrong aspect ratio | Parse `aspect_ratio` string to decimal |
| Past event not hiding | Check `expires_after_date` setting |
| Recurring event shows once | Add entries to `event_dates` table |
| Image stretched/cropped | Use AspectRatio wrapper with correct ratio |

## Future Enhancements
- Event registration/RSVP (attendees table ready)
- Waitlist for max_attendees
- Calendar view
- Email reminders
- Export to calendar (.ics)
