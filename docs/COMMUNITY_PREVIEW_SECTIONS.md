# COMMUNITY PAGE - LATEST DISCUSSION & UPCOMING EVENTS PREVIEW SECTIONS

**Complete Documentation for Future Reference**

---

## OVERVIEW

The Community page (`src/pages/Community.tsx`) contains two preview sections that display the latest activity:
1. **Latest Discussion** - Shows the most recent approved discussion post
2. **Upcoming Events** - Shows up to 3 upcoming events

These sections are rendered side-by-side in a responsive grid layout and include interactive features like Text-to-Speech playback.

---

## SECTION LAYOUT & STRUCTURE

### Grid Layout
- **Container:** `grid grid-cols-1 lg:grid-cols-2 gap-6`
- **Desktop (lg+):** Two columns side-by-side
- **Mobile (<lg):** Single column, stacked vertically
- **Gap:** 24px (`gap-6`) between cards

### Card Container
Both sections use the same Card component structure:
- **Component:** `Card` with `border-2 hover:border-primary/50 transition-colors`
- **Border:** 2px solid border that changes to primary color at 50% opacity on hover
- **Transition:** Smooth color transitions on hover

---

## LATEST DISCUSSION SECTION

### Visual Elements

#### Header
- **Icon:** `MessageSquare` (w-5 h-5, text-primary color)
- **Title:** "Latest Discussion" (text-xl)
- **Button:** "View All" with `ArrowRight` icon (variant="ghost", size="sm")
- **Layout:** Flex row with space-between alignment

#### Content Card
- **Container:** `space-y-3 cursor-pointer hover:bg-muted/50 p-3 rounded-lg transition-colors`
- **Hover Effect:** Muted background at 50% opacity
- **Padding:** 12px all around (`p-3`)
- **Border Radius:** Large (`rounded-lg`)

#### Image or Video Thumbnail (if available)
- **Dimensions:** Full width, 192px height (`h-48`)
- **Object Fit:** Cover (fills space while maintaining aspect ratio)
- **Border Radius:** Large (`rounded-lg`)
- **Source Priority:** `image_url` OR `video.thumbnail_url` (video thumbnail used if no image)
- **Condition:** Only displays if `latestDiscussion.image_url` OR `latestDiscussion.video?.thumbnail_url` exists

#### Title
- **Font:** Semibold, text-lg
- **Layout:** Flex container with gap-2
- **TTS Button:** Positioned to the right of title

#### Description
- **Font:** Small (text-sm), muted foreground color
- **Line Clamp:** 2 lines maximum (`line-clamp-2`)
- **Text:** Displays `latestDiscussion.content`

#### Metadata Footer
- **Container:** Flex row with gap-2, extra small text (text-xs), muted foreground
- **Format:** `by [author name] • [date]`
- **Author:** From `latestDiscussion.author.display_name`
- **Date:** Formatted using `toLocaleDateString()`

#### Empty State
- **Message:** "No discussions yet. Be the first!"
- **Style:** Muted foreground, center-aligned, vertical padding of 16px (`py-4`)

### Data Loading Rules

#### Database Query
```javascript
supabase
  .from("discussion_posts")
  .select(`
    *,
    author:profiles_public!discussion_posts_author_id_fkey(id, display_name, role),
    video:videos(thumbnail_url)
  `)
  .eq("is_moderated", true)
  .order("created_at", { ascending: false })
  .limit(3)
```

**Query Rules:**
1. **Table:** `discussion_posts`
2. **Joins:** 
   - Fetches author profile from `profiles_public` view (id, display_name, role)
   - Fetches video thumbnail from `videos` table (thumbnail_url)
3. **Filter:** Only posts with `is_moderated = true`
4. **Sort:** Most recent first (`created_at DESC`)
5. **Limit:** 3 posts (changed from 1 to show multiple discussions)
6. **Video Support:** If post has `video_id`, the joined `video.thumbnail_url` is used as fallback when `image_url` doesn't exist

**CRITICAL:** The query does NOT filter by `approval_status` - only by `is_moderated`. This matches the behavior of the main Discussions page.

### Text-to-Speech Integration

#### TTS Button Position
- Located to the right of the title
- Click is prevented from bubbling up to parent (stops navigation)
- Uses `onClick={(e) => e.stopPropagation()}`

#### TTS Text Format
```javascript
`${latestDiscussion.title}. ${latestDiscussion.content}`
```
- Title and content joined with period and space
- Full text is read aloud when play button is clicked

#### TTS Button Component
- **Component:** `<TextToSpeech />`
- **Props:** `text` (combined title and content)
- **Icon Size:** w-5 h-5
- **Color:** Primary background with hover effect (bg-primary hover:bg-primary/90)
- **States:**
  - Loading: Animated gradient pulse
  - Playing: Pause icon
  - Stopped: Play icon (with 2px left margin for visual centering)

---

## UPCOMING EVENTS SECTION

### Visual Elements

#### Header
- **Icon:** `Calendar` (w-5 h-5, text-secondary color)
- **Title:** "Upcoming Events" (text-xl)
- **Button:** "View All" with `ArrowRight` icon (variant="ghost", size="sm")
- **Layout:** Flex row with space-between alignment

#### Event Cards
- **Container:** `space-y-4` (16px vertical spacing between events)
- **Individual Card:** `space-y-3 cursor-pointer hover:bg-muted/50 p-3 rounded-lg transition-colors border-b last:border-0`
- **Border:** Bottom border on all except last item
- **Hover:** Muted background at 50% opacity
- **Click:** Navigates to `/events` page

#### Event Image (if available)
- **Container:** Full width with overflow hidden, rounded-lg
- **Aspect Ratio:** Dynamic based on `event.aspect_ratio` field (default: '9:16')
- **Calculation:** Splits ratio string (e.g., '9:16') and applies as CSS `aspectRatio`
- **Image:** `w-full h-full object-cover` (fills container while maintaining ratio)
- **Condition:** Only displays if `event.image_url` exists

#### Event Title & TTS
- **Container:** Flex row with gap-2, items-start alignment
- **Title:** Semibold, base size, flex-1 (takes remaining space)
- **TTS Button:** Positioned to the right, click prevented from bubbling

#### Event Description
- **Font:** Small (text-sm), muted foreground
- **Line Clamp:** 2 lines maximum (`line-clamp-2`)

#### Event Metadata Footer
- **Container:** Flex row with gap-2, extra small text (text-xs), muted foreground
- **Icon:** Calendar icon (w-3 h-3)
- **Date:** Formatted using `toLocaleDateString()`
- **Separator:** Bullet point (`•`) if location exists
- **Location:** Clickable link that opens Google Maps in new tab

#### Location Link Behavior
```javascript
window.open(
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`,
  '_blank',
  'noopener,noreferrer'
)
```
- **Hover Effect:** Text turns primary color with underline
- **Click:** Opens Google Maps search in new tab
- **Security:** Uses `noopener,noreferrer` for security

#### Audio Player (if available)
- **Component:** `<AudioPlayer src={event.audio_url} />`
- **Condition:** Only displays if `event.audio_url` exists
- **Click:** Prevented from bubbling up to parent

#### Empty State
- **Message:** "No upcoming events. Check back soon!"
- **Style:** Muted foreground, center-aligned, vertical padding of 16px (`py-4`)

### Data Loading Rules

#### Database Query
```javascript
supabase
  .from("events")
  .select(`
    *,
    event_dates(id, event_date)
  `)
  .eq("is_public", true)
  .eq("is_active", true)
  .order("event_date", { ascending: true })
```

**Initial Filters:**
1. **Table:** `events` with joined `event_dates` table
2. **Public Only:** `is_public = true`
3. **Active Only:** `is_active = true`
4. **Sort:** Earliest date first (`event_date ASC`)

#### Role-Based Filtering
After fetching, events are filtered based on the user's role:
```javascript
filteredEvents = events.filter(event => 
  event.visible_to_roles?.includes(effectiveRole)
)
```
- **Field:** `visible_to_roles` (array of roles)
- **Check:** User's `effectiveRole` must be in the array
- **Roles:** caregiver, bestie, supporter, admin, owner

**CRITICAL:** This filtering happens client-side AFTER the database query. Console logs show:
- Total events fetched
- Each event's visibility check
- Final filtered count

#### Date Processing

**1. Collect All Dates:**
```javascript
const allDates = [new Date(event.event_date)];
if (event.event_dates) {
  allDates.push(...event.event_dates.map(d => new Date(d.event_date)));
}
```
- Primary date from `event.event_date`
- Additional dates from `event_dates` join table (for recurring events)

**2. Sort Dates:**
```javascript
allDates.sort((a, b) => a.getTime() - b.getTime());
```
- Chronological order (earliest to latest)

**3. Filter Upcoming Dates:**
```javascript
const isUpcoming = date >= now;
const shouldShow = event.expires_after_date ? isUpcoming : true;
```
- **`isUpcoming`:** Date is today or in the future
- **`shouldShow`:** If `expires_after_date` is true, only show upcoming dates; otherwise show all
- **Result:** Only dates that pass both checks are included

**4. Create Event Cards:**
Each valid date creates a separate event card with:
- All event details
- Specific date as `event_date` (ISO string)
- `displayDate` object for sorting

**5. Final Sorting & Limiting:**
```javascript
upcomingEventCards.sort((a, b) => a.displayDate.getTime() - b.displayDate.getTime());
const topThree = upcomingEventCards.slice(0, 3);
```
- **Sort:** By display date (earliest first)
- **Limit:** First 3 events only

#### Height-Based Display Limiting

Events are further filtered by cumulative height to prevent overflow:

**Constants:**
- `MAX_HEIGHT`: 1200px (maximum total height)
- `CARD_PADDING`: 24px (12px top + 12px bottom from `p-3`)
- `SPACING`: 16px (from `space-y-4`)
- `TEXT_HEIGHT`: 120px (approximate height for title, description, date, location)

**Calculation for Each Event:**
```javascript
const ratio = event.aspect_ratio || '9:16';
const [w, h] = ratio.split(':').map(Number);
const cardWidth = 400; // Approximate card width
const imageHeight = (cardWidth * h) / w;

const eventHeight = imageHeight + TEXT_HEIGHT + CARD_PADDING + 
                    (eventsToShow.length > 0 ? SPACING : 0);
```

**Logic:**
1. Calculate image height based on aspect ratio
2. Add text, padding, and spacing (if not first event)
3. Check if adding this event would exceed MAX_HEIGHT
4. If yes and we already have events, stop adding more
5. If no, add event and increment cumulative height

**Result:** Only events that fit within the height limit are displayed, preventing excessive scrolling.

### Text-to-Speech Integration

#### TTS Button Position
- Located to the right of the title
- Click prevented from bubbling up to parent
- Uses `onClick={(e) => e.stopPropagation()}`

#### TTS Text Format
```javascript
const eventDate = new Date(event.event_date).toLocaleDateString();
const ttsText = [
  event.title,
  event.description,
  `Scheduled for ${eventDate}`,
  event.location ? `At ${event.location}` : ''
].filter(Boolean).join('. ');
```

**Structure:**
1. Event title
2. Event description
3. "Scheduled for [date]"
4. "At [location]" (if location exists)
5. All parts joined with `. ` (period and space)
6. Empty strings filtered out using `.filter(Boolean)`

**Console Logging:** Each event's TTS text is logged for debugging.

---

## TEXT-TO-SPEECH COMPONENT DETAILS

### Component File
**Location:** `src/components/TextToSpeech.tsx`

### Props
```typescript
interface TextToSpeechProps {
  text: string;          // Text to be read aloud
  voice?: string;        // Optional voice override
  size?: 'default' | 'sm' | 'lg' | 'icon';  // Button size (default: 'icon')
  onPlayingChange?: (isPlaying: boolean) => void;  // Callback for play state
}
```

### User Preferences
The component loads user's TTS preferences from their profile:
- **Voice:** `profiles.tts_voice` (default: 'Aria')
- **Enabled:** `profiles.tts_enabled` (default: true)

**Important:** If `tts_enabled` is false, component returns null (not rendered).

### Button States

#### Loading State
- **Visual:** Gradient animated pulse
- **Classes:** `w-5 h-5 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse`
- **Disabled:** Button is disabled during loading

#### Playing State
- **Icon:** `Pause` icon (w-5 h-5)
- **Action:** Clicking stops and resets playback

#### Stopped State
- **Icon:** `Play` icon (w-5 h-5, ml-0.5 for visual centering)
- **Action:** Clicking starts playback

### Button Styling
- **Size:** `icon` (compact square button)
- **Colors:** `bg-primary hover:bg-primary/90`
- **Class:** `shrink-0` (prevents button from shrinking in flex containers)
- **Title Attribute:** "Read aloud" when stopped, "Stop reading" when playing

### Edge Function Integration
**Endpoint:** `text-to-speech`
**Request Body:**
```javascript
{
  text: string,      // Text to convert to speech
  voice: string      // Voice selection (user's preferred or component override)
}
```

**Response:**
```javascript
{
  audioContent: string  // Base64-encoded MP3 audio
}
```

### Audio Playback Process

1. **Request:** Calls Supabase edge function with text and voice
2. **Receive:** Gets base64-encoded MP3 audio
3. **Convert:** Creates Blob from base64 data
4. **Create Audio Element:**
   ```javascript
   const audioBlob = new Blob(
     [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
     { type: 'audio/mpeg' }
   );
   const audioUrl = URL.createObjectURL(audioBlob);
   const newAudio = new Audio(audioUrl);
   ```
5. **Play:** Immediately starts playback
6. **Cleanup:** Revokes object URL when audio ends or errors

### Event Handlers

#### onended
- Sets `isPlaying` to false
- Calls `onPlayingChange` callback (if provided)
- Revokes object URL to free memory

#### onerror
- Sets `isPlaying` to false
- Revokes object URL
- Shows error toast

### Click Event Handling
**Important:** The button's `onClick` uses `e.stopPropagation()` to prevent clicks from bubbling up to parent clickable elements (like the event card that navigates to `/events`).

### Console Logging
The component logs extensive debugging information:
- Text being sent to API
- Text length
- Voice selection
- Audio content received length
- Blob size
- Audio URL
- Playback start/success
- Audio ended events
- Any errors

---

## COLORS & SEMANTIC TOKENS

### Icon Colors
- **Latest Discussion Icon:** `text-primary` (MessageSquare)
- **Upcoming Events Icon:** `text-secondary` (Calendar)
- **TTS Button Background:** `bg-primary hover:bg-primary/90`

### Text Colors
- **Card Titles:** Default text color (text-xl)
- **Event/Discussion Titles:** Default text color (font-semibold)
- **Descriptions:** `text-muted-foreground`
- **Metadata:** `text-muted-foreground`

### Border Colors
- **Card Border:** `border-2` (default border color)
- **Card Hover:** `hover:border-primary/50` (primary at 50% opacity)
- **Event Card Separator:** `border-b` (between events)

### Background Colors
- **Card Hover:** `hover:bg-muted/50` (muted at 50% opacity)
- **TTS Loading:** Gradient `from-primary via-accent to-secondary`

### Transition Effects
All color changes use smooth transitions via `transition-colors` class.

---

## NAVIGATION BEHAVIOR

### Latest Discussion Card
- **Click Target:** Entire card is clickable
- **Destination:** `/discussions` page
- **Exceptions:** TTS button click (propagation stopped)

### Upcoming Events Cards
- **Click Target:** Entire card is clickable
- **Destination:** `/events` page
- **Exceptions:**
  - TTS button click (propagation stopped)
  - Location link click (opens Google Maps)
  - Audio player controls (propagation stopped)

### "View All" Buttons
- **Latest Discussion:** Navigates to `/discussions`
- **Upcoming Events:** Navigates to `/events`
- **Style:** Ghost variant, small size, with ArrowRight icon

---

## RESPONSIVE BEHAVIOR

### Desktop (lg and above)
- Two-column grid layout
- Cards displayed side-by-side
- Equal width distribution

### Mobile (below lg)
- Single-column layout
- Cards stacked vertically
- Latest Discussion appears first (if visible)
- Upcoming Events appears below (if visible)

### Image Sizing
- Latest Discussion image: Fixed height (h-48 = 192px)
- Upcoming Events images: Dynamic height based on aspect ratio
- All images: Full width, object-cover for proper cropping

---

## VISIBILITY CONTROLS

### Section Visibility
Both sections check `community_sections` table for visibility:
```javascript
const showDiscussion = sectionOrder.find(s => s.key === 'latest_discussion')?.visible;
const showEvents = sectionOrder.find(s => s.key === 'upcoming_events')?.visible;
```

**Rules:**
- If `visible` is false in database, section is not rendered
- If `visible` is true, section renders (if data exists)
- Sections load from `community_sections` table ordered by `display_order`

### Events Role-Based Visibility
Events have additional visibility control via `visible_to_roles` array:
- Each event has a `visible_to_roles` field (array of user roles)
- Only events where user's `effectiveRole` is in the array are shown
- This filtering happens AFTER database fetch, client-side

**Effect:** Two users with different roles may see different upcoming events.

---

## LOADING SEQUENCE

### Page Load Order
1. **Authentication Check:** Verify user is logged in
2. **Vendor Check:** If user is vendor, redirect to vendor dashboard
3. **Profile Fetch:** Load user profile from `profiles` table
4. **Role Fetch:** Load user role from `user_roles` table
5. **Combine Data:** Merge profile with role
6. **Set Effective Role:** Determine role (may include impersonation)
7. **Load Content:** Once `effectiveRole` is set, call `loadLatestContent()`

### Content Loading Order (in loadLatestContent)
1. **Latest Discussion Query:** Fetch single most recent approved post
2. **Upcoming Events Query:** Fetch all public, active events
3. **Events Filtering:** Filter by role, collect dates, sort, limit to 3
4. **Quick Links:** Fetch community quick links (separate section)

### Console Logging
The component logs key steps:
- "Community - Setting effectiveRole: [role]"
- "Community - Content loading useEffect triggered"
- "Community - Calling loadLatestContent"
- "Community - loadLatestContent running with role: [role]"
- "Community - User role: [role]"
- "Community - Total events fetched: [count]"
- Event visibility checks for each event
- "Community - Upcoming events count: [count]"
- Event TTS text for each event

---

## CRITICAL RULES TO MAINTAIN

### 1. Discussion Query
- **MUST** filter ONLY by `is_moderated = true` (NOT by `approval_status`)
- **MUST** use `profiles_public` view for author join (includes role)
- **MUST** match the behavior of the main Discussions page

### 2. Profile Loading (CRITICAL)
- **MUST** fetch from `profiles_public` view (NOT `profiles` table)
- **WHY:** `profiles` table doesn't include role; `profiles_public` view includes role from `user_roles` table
- **RESULT:** Without role, `effectiveRole` stays undefined → early return → no content loads

### 3. Events Role Filtering
- **MUST** happen client-side after database fetch
- **MUST** check `visible_to_roles` array includes user's `effectiveRole`
- **MUST** process all dates (primary + recurring) before filtering

### 3. Events Height Limiting
- **MUST** calculate cumulative height including aspect ratio
- **MUST** stop adding events when MAX_HEIGHT would be exceeded
- **MUST** prioritize earlier dates (chronological order)

### 4. Text-to-Speech
- **MUST** stop propagation on TTS button clicks
- **MUST** combine text with periods and spaces for natural reading
- **MUST** include date in readable format ("Scheduled for...")
- **MUST** respect user's `tts_enabled` preference (hide button if false)

### 5. Navigation
- **MUST** make entire card clickable
- **MUST** stop propagation on interactive elements (TTS, location link, audio player)
- **MUST** use hover effects to indicate clickability

### 6. Date Formatting
- **MUST** use `toLocaleDateString()` for display
- **MUST** handle timezone properly (dates stored in UTC)
- **MUST** show date in user's local format

### 7. Aspect Ratios
- **MUST** parse aspect ratio string (e.g., '9:16')
- **MUST** calculate dynamic height for event images
- **MUST** default to '9:16' if aspect_ratio is missing
- **MUST** use CSS aspectRatio property for proper image display

---

## ERROR HANDLING

### No Data Scenarios
- **Latest Discussion:** Shows "No discussions yet. Be the first!"
- **Upcoming Events:** Shows "No upcoming events. Check back soon!"
- Both messages use muted foreground color and center alignment

### Query Errors
- Logged to console
- Default quick links used as fallback
- Page continues to function with available data

### TTS Errors
- Toast notification shown to user
- Error message includes specific failure reason
- Button returns to stopped state
- Audio URL cleaned up to prevent memory leaks

---

## ACCESSIBILITY CONSIDERATIONS

### Button Titles
- TTS buttons have descriptive title attributes
- Location links have title="Open in Google Maps"

### Click Targets
- All clickable areas are large enough for easy clicking
- Hover effects provide visual feedback

### Text Contrast
- Muted foreground color maintains readability
- Primary/secondary colors meet contrast requirements

### Audio Playback
- Visual feedback during loading (animated pulse)
- Clear play/pause icons
- Stop propagation prevents accidental navigation during playback

---

## FUTURE MODIFICATION GUIDELINES

When modifying these sections:

1. **Always maintain** the height limiting logic for events
2. **Always preserve** the role-based filtering for events
3. **Always keep** the TTS text format readable and natural
4. **Always prevent** propagation on interactive elements within clickable cards
5. **Always log** key steps for debugging purposes
6. **Always test** with different user roles to ensure visibility works
7. **Always verify** that dates are processed correctly (including recurring events)
8. **Always update** this documentation when making changes

---

**Last Updated:** Created from current implementation as of Community page build
**Component Location:** `src/pages/Community.tsx`
**Related Components:** `TextToSpeech.tsx`, `AudioPlayer.tsx`, `Card` UI components
