# COMMUNITY PAGE PREVIEWS - CONCISE GUIDE

## Data Loading Flow

### Profile Loading (CRITICAL)
```typescript
// MUST use profiles_public view (includes role from user_roles table)
fetchProfile → profiles_public (NOT profiles) → sets effectiveRole → triggers loadLatestContent()
```
**Why:** `profiles` table has no role → `effectiveRole` stays undefined → early return → no content loads.

### Latest Discussion Preview
**Query:**
```typescript
.from("discussion_posts")
.select("*, author:profiles_public(id, display_name, role)")
.eq("is_moderated", true)  // NO approval_status filter
.order("created_at", { ascending: false })
.limit(1)
```
**Visibility:** No role check - if `is_moderated = true`, shows to all.

### Upcoming Events Preview
**Query:**
```typescript
.from("events")
.select("*, event_dates(id, event_date)")
.eq("is_public", true)
.eq("is_active", true)
```
**Visibility:** Client-side filter by `event.visible_to_roles.includes(effectiveRole)`.

**Date Logic:**
1. Collect all dates (primary + `event_dates`)
2. Filter: `date >= now` AND `(!expires_after_date OR isUpcoming)`
3. Sort chronologically, limit to 3
4. Height-limit: max 1200px cumulative (uses aspect ratio calculation)

## Visual Structure

### Grid Layout
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Latest Discussion */}
  {/* Upcoming Events */}
</div>
```

### Card Components
**Discussion Card:**
- Border: `border-2 hover:border-primary/50`
- Icon: `MessageSquare` (text-primary)
- Image: Full width, `h-48`, `object-cover`
- TTS: Right of title, `e.stopPropagation()` on click

**Event Card:**
- Border: `border-b` between events, `last:border-0`
- Icon: `Calendar` (text-secondary)
- Image: Dynamic aspect ratio from `event.aspect_ratio` field
- Location: Clickable link → Google Maps (opens new tab)
- TTS: Right of title, reads: `title + description + "Scheduled for [date]" + "At [location]"`

## Key Interactions

### Navigation
- Click discussion card → `/discussions`
- Click event card → `/events`
- Click "View All" buttons → respective pages
- TTS/location links: `e.stopPropagation()` prevents card navigation

### Text-to-Speech
**Discussion:** `${title}. ${content}`
**Event:** `[title, description, "Scheduled for [date]", location].filter(Boolean).join('. ')`

## Critical Rules

1. **Profile:** Always fetch from `profiles_public` (includes role)
2. **Discussion:** Filter only `is_moderated = true` (no approval_status)
3. **Events:** Client-side role filter after DB fetch
4. **Height:** Events limited to 1200px cumulative (aspect ratio aware)
5. **Propagation:** Stop on TTS/location clicks
6. **Empty States:** Show when no content ("No discussions yet...", "No upcoming events...")

## Color Tokens
- Discussion icon: `text-primary`
- Event icon: `text-secondary`
- Borders: `border-2`, hover `border-primary/50`
- Backgrounds: `hover:bg-muted/50`
- Metadata: `text-muted-foreground`

## Load Sequence
1. `checkUser()` → fetch session
2. Check vendor → redirect if vendor
3. `fetchProfile(userId)` → from `profiles_public`
4. `getEffectiveRole(profile.role)` → set `effectiveRole`
5. `useEffect` triggers when `effectiveRole` !== null
6. `loadLatestContent()` → fetch discussions + events
7. Client-side filter events by role
8. Render visible sections
