# SAVED LOCATIONS SYSTEM - COMPLETE DOCS

## Overview
Centralized location management allowing admins to create reusable location presets that can be selected across the application (events, vendor profiles, etc.).

## Database

**saved_locations table:**
- `id`, `name`, `address`
- `is_active` (boolean, default: true)
- `created_by`, `created_at`, `updated_at`

**RLS Policies:**
- **SELECT:** All authenticated users can view active locations
- **INSERT/UPDATE/DELETE:** Admins only

## Components

### SavedLocationsManager
**Location:** Admin → Format Pages → Locations
**File:** `src/components/admin/SavedLocationsManager.tsx`

**Features:**
- Create/edit/delete saved locations
- Toggle active/inactive status (visibility toggle standard)
- Display name + full address in card format
- Requires name and address (both trimmed before save)

**Visual Standard:**
- Active: Green background (Eye icon)
- Inactive: Red background (EyeOff icon)
- Card layout with MapPin icon, name (bold), address (muted)

### LocationAutocomplete
**File:** `src/components/LocationAutocomplete.tsx`

**Features:**
- **Saved Location Dropdown:** Shows all active saved locations
  - Displays: Location name (bold) + address (small, muted)
  - Icon: MapPin with proper alignment
  - Selection updates both dropdown display AND input field
- **Google Places Autocomplete:** Manual search with autocomplete
- **Manual Input:** Can type directly if Google API unavailable

**Display Format:**
```
[MapPin Icon] Location Name
              Full Address (smaller, muted text)
```

**State Management:**
- `selectedLocationId`: Tracks which saved location is selected
- Auto-matches on edit: If editing event with location matching saved location, dropdown shows selection
- Clear on manual input: Typing in input field clears saved location selection
- Maintains selection: Dropdown shows selected location name + address

**Props:**
```typescript
interface LocationAutocompleteProps {
  value: string;              // Current location value
  onChange: (value: string) => void;  // Called when location changes
  label?: string;             // Field label (default: "Location")
  placeholder?: string;       // Placeholder text
  required?: boolean;         // Is field required
}
```

## User Workflows

### Admin: Create Saved Location
1. Admin → Format Pages → Locations
2. Click "Add Location"
3. Enter name (e.g., "Best Day Ever Coffee and Crêpes")
4. Enter full address (e.g., "516 Coffman St, Longmont, CO 80504")
5. Click "Create"
6. Location available immediately in all location fields

### Admin: Deactivate Location
1. Find location in list
2. Click Eye icon (green) → changes to EyeOff (red)
3. Location hidden from dropdown but not deleted
4. Existing events keep the address value

### User: Select Saved Location (Event Creation)
1. Create/edit event → Location field
2. See dropdown: "Select a saved location..."
3. Click dropdown → see all active locations with name + address
4. Select location → dropdown shows selection, input field updates with address
5. Can override: Type in input field → clears dropdown selection

### User: Use Google Places Autocomplete
1. Skip dropdown, type directly in input field
2. Google Places suggestions appear as you type
3. Select from suggestions → address auto-fills
4. Saved location dropdown clears (manual input mode)

## Integration Points

**Current Usage:**
- Event Management (`EventManagement.tsx`)
- Future: Vendor profiles, organization profiles

**Data Flow:**
1. `SavedLocationsManager` creates locations → `saved_locations` table
2. `LocationAutocomplete` fetches active locations → displays in dropdown
3. User selects → `onChange` called with `address` value
4. Parent component (e.g., EventManagement) stores in `location` state
5. On save → address stored in `events.location` field

## Google Places API

**API Key Storage:** Stored in Supabase secrets as `GOOGLE_PLACES_API_KEY`

**Edge Function:** `get-google-places-key`
- Fetches key securely
- Returns to frontend for Google Maps SDK initialization

**Fallback:** If Google API unavailable or key missing:
- Saved locations still work
- Manual input still works
- Only autocomplete suggestions unavailable

**Loading States:**
- "Fetching API key..." → while fetching key from edge function
- "Loading location search..." → while loading Google Maps SDK
- "Location autocomplete unavailable..." → if error loading

## Visual Design Standards

### Saved Location Dropdown Display
```
┌─────────────────────────────────────────┐
│ [MapPin] Select a saved location...  ▼ │
└─────────────────────────────────────────┘

When opened:
┌─────────────────────────────────────────┐
│ [MapPin] Best Day Ever Coffee           │
│          516 Coffman St, Longmont...    │ ← Full address in muted text
├─────────────────────────────────────────┤
│ [MapPin] Community Center               │
│          123 Main St, Boulder, CO...    │
└─────────────────────────────────────────┘

When selected:
┌─────────────────────────────────────────┐
│ [MapPin] Best Day Ever Coffee         ▼ │
│          516 Coffman St, Longmont...    │ ← Shows in trigger too
└─────────────────────────────────────────┘
```

### Input Field (Below Dropdown)
```
┌─────────────────────────────────────────┐
│ [MapPin] 516 Coffman St, Longmont, CO...│ ← Actual value saved
└─────────────────────────────────────────┘
```

### SavedLocationsManager Card
```
┌─────────────────────────────────────────┐
│ [MapPin] Best Day Ever Coffee           │
│          516 Coffman St, Longmont, CO   │
│                      [Eye] [Edit] [Del] │ ← Active (green)
└─────────────────────────────────────────┘
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Saved location not appearing in dropdown | `is_active = false` | Toggle active in admin |
| Selection doesn't save | Not clicking submit after selecting | Verify form submission logic |
| Address doesn't show in input | `onChange` not called | Check SelectValue implementation |
| Google autocomplete not working | API key missing/invalid | Check `GOOGLE_PLACES_API_KEY` secret |
| Dropdown shows old selection | State not resetting on form reset | Clear `selectedLocationId` in reset |
| Manual input doesn't clear dropdown | Missing state update | Add `setSelectedLocationId("")` on input change |

## Security

**RLS Policies:**
- Only admins can create/modify saved locations
- All authenticated users can view active locations
- Locations linked to creator (`created_by` field)

**Input Validation:**
- Name and address trimmed before save
- Both fields required
- No special character restrictions (addresses may contain punctuation)

## Performance

**Optimization:**
- Saved locations fetched once on component mount
- Cached in component state
- Only active locations fetched in autocomplete
- Google Maps SDK loaded asynchronously

## Future Enhancements

**Planned:**
- [ ] Coordinates storage (lat/lng) for mapping
- [ ] Location categories (venue type, capacity)
- [ ] Location images/photos
- [ ] Favorite locations per user
- [ ] Location usage analytics (most used)
- [ ] Import from Google Places API
- [ ] Bulk import/export

**Potential Integrations:**
- Vendor profiles
- Organization listings
- Discussion post tagging
- Event series templates

---

**Last Updated:** After implementing improved saved location display with name + address in dropdown and trigger
