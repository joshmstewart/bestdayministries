# SPONSOR PAGE SYSTEM - COMPLETE DOCUMENTATION

## Overview
The sponsor page (`/sponsor-bestie`) allows users to financially support besties through one-time or monthly sponsorships via Stripe Checkout.

---

## CORE COMPONENTS

### 1. SponsorBestie Page (`src/pages/SponsorBestie.tsx`)
**Route:** `/sponsor-bestie?bestieId={optional}`

**Key Features:**
- Dynamic section ordering via `sponsor_page_sections` table
- URL parameter handling for pre-selection
- Random vs ordered bestie display logic
- Stripe checkout integration
- Role-based access control (blocks besties from sponsoring)

**State Management:**
```typescript
besties: Bestie[]           // Available besties for sponsorship
selectedBestie: string      // Currently selected bestie ID
frequency: "one-time" | "monthly"
amount: string             // Sponsorship amount
email: string              // User email (auto-filled if logged in)
fundingProgress: {}        // Funding status per bestie
sections: []               // Page section configuration
pageContent: {}            // Header/description content
featuredVideo: Video       // Optional video player
```

**Pre-Selection Logic:**
- **With `bestieId` param**: Selected bestie moves to top of list, pre-selected
- **Without param**: Besties randomized, first one selected
- **Implementation**: `loadBesties(preSelectedBestieId)` handles both cases

**Section Rendering:**
- Fetches from `sponsor_page_sections` (ordered by `display_order`)
- Only renders sections with `is_visible: true`
- Available sections: `header`, `featured_video`, `sponsor_carousel`, `selection_form`, `impact_info`

---

### 2. SponsorBestieDisplay Component (`src/components/SponsorBestieDisplay.tsx`)
**Purpose:** Carousel/single display of sponsor besties

**Display Logic:**
- **Single Bestie**: Direct card render (no carousel)
- **Multiple Besties**: Carousel with controls (prev/next/play/pause)

**Auto-Advance:**
- 7-second interval when playing
- Pauses on manual navigation
- Pauses when TTS audio playing
- Uses `autoScrollRef` to track manual vs auto scrolls

**Card Features:**
- Image with aspect ratio preservation
- "Available for Sponsorship" badge
- "You're Sponsoring!" badge (if active sponsorship exists)
- Text sections with TTS on first section
- Voice note audio player
- Funding progress bar (if `monthly_goal` > 0)
- "Sponsor This Bestie" button → navigates to `/sponsor-bestie?bestieId={id}`
- "Fully Funded" message (if `is_fully_funded` or 100% progress)

**Data Loading:**
- Fetches from `sponsor_besties` table (`is_active: true`)
- Randomizes order on every load
- Checks user's active sponsorships via `sponsorships` table
- Loads funding progress from `sponsor_bestie_funding_progress` view

---

## DATABASE SCHEMA

### sponsor_besties
**Columns:**
- `id` (uuid, PK)
- `bestie_id` (uuid, nullable) - Links to profiles
- `bestie_name` (text)
- `image_url` (text)
- `voice_note_url` (text, nullable)
- `text_sections` (jsonb) - Array of `{header, text}` objects
- `aspect_ratio` (text, default: '9:16')
- `monthly_goal` (numeric, nullable)
- `is_active` (boolean)
- `is_fully_funded` (boolean)
- `created_at`, `updated_at`

**RLS Policies:**
- SELECT: Public access (is_active = true)
- INSERT/UPDATE/DELETE: Admins only

---

### sponsor_page_sections
**Columns:**
- `id` (uuid, PK)
- `section_key` (text, unique) - `header`, `featured_video`, `sponsor_carousel`, `selection_form`, `impact_info`
- `section_name` (text)
- `is_visible` (boolean)
- `display_order` (integer)
- `content` (jsonb, nullable) - Future use for section-specific config
- `created_at`, `updated_at`

**RLS Policies:**
- SELECT: Public access
- INSERT/UPDATE/DELETE: Admins only

**Default Sections:**
1. `header` - Badge, heading, description
2. `featured_video` - Optional video player
3. `sponsor_carousel` - SponsorBestieDisplay component (20% scaled)
4. `selection_form` - Bestie selection + sponsorship form
5. `impact_info` - Stats/impact cards

---

### sponsor_bestie_funding_progress (VIEW)
**Purpose:** Aggregates funding status per bestie

**Returns:**
- `sponsor_bestie_id` (uuid)
- `bestie_id` (uuid)
- `bestie_name` (text)
- `current_monthly_pledges` (numeric) - Sum of active monthly sponsorships
- `monthly_goal` (numeric)
- `funding_percentage` (numeric) - (current / goal) * 100
- `remaining_needed` (numeric) - goal - current

**Calculation:**
```sql
SELECT 
  sb.id as sponsor_bestie_id,
  sb.bestie_id,
  sb.bestie_name,
  COALESCE(SUM(s.amount), 0) as current_monthly_pledges,
  sb.monthly_goal,
  CASE 
    WHEN sb.monthly_goal > 0 THEN (COALESCE(SUM(s.amount), 0) / sb.monthly_goal * 100)
    ELSE 0
  END as funding_percentage,
  CASE
    WHEN sb.monthly_goal > 0 THEN GREATEST(sb.monthly_goal - COALESCE(SUM(s.amount), 0), 0)
    ELSE 0
  END as remaining_needed
FROM sponsor_besties sb
LEFT JOIN sponsorships s ON s.bestie_id = sb.bestie_id 
  AND s.status = 'active' 
  AND s.frequency = 'monthly'
WHERE sb.is_active = true
GROUP BY sb.id
```

---

## ADMIN CONTROLS

### 1. Sponsor Bestie Manager (`src/components/admin/SponsorBestieManager.tsx`)
**Location:** Admin Panel → Sponsorships → Sponsor Besties

**Features:**
- Create/edit/delete sponsor besties
- Upload image and voice note (app-assets bucket)
- Add multiple text sections (header + text pairs)
- Set aspect ratio (9:16, 16:9, 1:1, or custom)
- Set monthly funding goal (optional)
- Toggle active status
- Mark as fully funded

**Form Fields:**
- Bestie Name (required)
- Image Upload (required)
- Voice Note Upload (optional)
- Text Sections (dynamic array, min 1 section)
- Aspect Ratio dropdown
- Monthly Goal (numeric, optional)
- Is Active toggle
- Is Fully Funded toggle

---

### 2. Sponsor Page Order Manager (`src/components/admin/SponsorPageOrderManager.tsx`)
**Location:** Admin Panel → Sponsorships → Sponsor Page Order

**Features:**
- Drag-and-drop section reordering (dnd-kit)
- Toggle section visibility (eye/eye-off icons)
- Auto-saves on changes

**Sections Managed:**
1. Header (badge + heading + description)
2. Featured Video
3. Sponsor Bestie Carousel
4. Selection Form (bestie list + sponsorship form)
5. Impact Information (stats cards)

**UI Pattern:**
- Green bg + Eye icon = Visible
- Red bg + EyeOff icon = Hidden
- Drag handle on left for reordering
- Changes saved immediately to database

---

### 3. Sponsor Page Content Manager (`src/components/admin/SponsorBestiePageManager.tsx`)
**Location:** Admin Panel → Sponsorships → Page Content

**Features:**
- Edit header badge text
- Edit main heading
- Edit description (multi-line)
- Select featured video from dropdown (videos table)
- Auto-saves to `app_settings` table (key: `sponsor_page_content`)

**Stored JSON:**
```json
{
  "badge_text": "Sponsor a Bestie",
  "main_heading": "Change a Life Today",
  "description": "Sponsor a Bestie and directly support...",
  "featured_video_id": "uuid-or-empty"
}
```

---

## SPECIAL RULES & BEHAVIORS

### URL Parameter Handling
**Rule:** Page behavior changes based on entry point

**With `?bestieId=xxx`:**
1. Fetch besties in creation order (no randomization)
2. Move specified bestie to top of list
3. Pre-select that bestie
4. Scroll to selection form after load

**Without parameter:**
1. Fetch besties in creation order
2. Randomize the entire list
3. Select first bestie in randomized list
4. No auto-scroll

**Implementation:**
```typescript
const bestieId = searchParams.get('bestieId');
loadBesties(bestieId); // Pass to control randomization

// In loadBesties:
if (preSelectedBestieId) {
  // Move to top, maintain order of rest
  finalBesties = [selected, ...rest];
} else {
  // Randomize entire array
  finalBesties = parsedBesties.sort(() => Math.random() - 0.5);
}
```

---

### Role-Based Access Control
**Rule:** Besties cannot sponsor other besties

**Implementation:**
```typescript
const { data: roleData } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", user.id)
  .maybeSingle();

if (roleData?.role === "bestie") {
  toast.error("Besties cannot sponsor other besties at this time");
  navigate("/community");
  return;
}
```

**Applied:** In `checkAuthAndLoadEmail()` on page load

---

### Funding Progress Display
**Rule:** Only show progress bar if `monthly_goal > 0`

**Display Logic:**
```typescript
{bestie.monthly_goal && bestie.monthly_goal > 0 && fundingProgress[bestie.id] && (
  <FundingProgressBar
    currentAmount={fundingProgress[bestie.id].current_monthly_pledges}
    goalAmount={fundingProgress[bestie.id].monthly_goal}
  />
)}
```

**Fully Funded State:**
- Shows when `is_fully_funded = true` OR `funding_percentage >= 100`
- Hides "Sponsor This Bestie" button
- Displays green success message

---

### Carousel Auto-Advance Rules
**Rule:** Pause carousel when user interacts or audio plays

**Pause Triggers:**
1. Manual navigation (prev/next/dot click)
2. TTS audio playing (`isAudioPlaying = true`)
3. User clicks pause button

**Resume:**
- User clicks play button
- Audio finishes playing (TTS callback)

**Implementation:**
```typescript
useEffect(() => {
  if (!api || !isPlaying || isAudioPlaying) return;
  
  const intervalId = setInterval(() => {
    autoScrollRef.current = true;
    api.scrollNext();
  }, 7000);
  
  return () => clearInterval(intervalId);
}, [api, isPlaying, isAudioPlaying]);
```

---

### Sponsorship Form Validation
**Rule:** Minimum $10, valid email required

**Validation Schema:**
```typescript
const sponsorshipSchema = z.object({
  amount: z.number().min(10, "Minimum sponsorship is $10"),
  email: z.string().email("Invalid email address"),
});
```

**Pre-filled Fields:**
- Email auto-filled if user logged in
- Email field disabled for logged-in users
- Amount defaults to $25
- Frequency defaults to "monthly"

---

### Text Sections Rendering
**Rule:** First section header gets TTS button

**Display Pattern:**
```typescript
{text_sections.map((section, index) => (
  <div key={index}>
    {section.header && (
      <div className={index === 0 ? "flex items-start justify-between" : ""}>
        <h3>{section.header}</h3>
        {index === 0 && <TextToSpeech text={`${section.header}. ${section.text}`} />}
      </div>
    )}
    {section.text && <p>{section.text}</p>}
  </div>
))}
```

**TTS Text:** Combines header + text of first section only

---

## STRIPE INTEGRATION

### Edge Function: `create-sponsorship-checkout`
**Purpose:** Create Stripe Checkout session for sponsorship

**Request Body:**
```typescript
{
  bestie_id: string,
  amount: number,
  frequency: "one-time" | "monthly",
  email: string
}
```

**Flow:**
1. Validate user authentication
2. Check for existing Stripe customer (by email)
3. Create Stripe price (dynamic, not stored)
4. Create Checkout session:
   - Mode: `payment` (one-time) or `subscription` (monthly)
   - Success URL: `/sponsorship-success`
   - Cancel URL: `/sponsor-bestie`
5. Store pending sponsorship in database
6. Return checkout URL

**Response:**
```json
{ "url": "https://checkout.stripe.com/..." }
```

---

## FILE STRUCTURE

```
src/
├── pages/
│   └── SponsorBestie.tsx              # Main sponsor page
├── components/
│   ├── SponsorBestieDisplay.tsx       # Carousel component
│   └── admin/
│       ├── SponsorBestieManager.tsx        # Bestie CRUD
│       ├── SponsorPageOrderManager.tsx     # Section ordering
│       └── SponsorBestiePageManager.tsx    # Header/content editor
supabase/
└── functions/
    └── create-sponsorship-checkout/   # Stripe checkout
```

---

## COMMON WORKFLOWS

### Admin: Add New Bestie
1. Navigate to Admin → Sponsorships → Sponsor Besties
2. Click "Add Bestie"
3. Upload image and optional voice note
4. Enter bestie name
5. Add text sections (min 1)
6. Set aspect ratio
7. Optionally set monthly goal
8. Toggle "Is Active"
9. Click "Save"

### Admin: Reorder Page Sections
1. Navigate to Admin → Sponsorships → Sponsor Page Order
2. Drag sections to desired order
3. Toggle eye icon to hide/show sections
4. Changes auto-save

### Admin: Update Page Header
1. Navigate to Admin → Sponsorships → Page Content
2. Edit badge text, heading, description
3. Select featured video from dropdown
4. Click "Save Settings"

### User: Sponsor from Carousel
1. View SponsorBestieDisplay on Community/Home page
2. Click "Sponsor This Bestie" button
3. Redirected to `/sponsor-bestie?bestieId=xxx`
4. Selected bestie appears first and is pre-selected
5. Adjust amount/frequency, click sponsor button
6. Complete Stripe Checkout

### User: Sponsor from Nav Bar
1. Click "Sponsor" in navigation bar
2. Arrive at `/sponsor-bestie` (no param)
3. Besties shown in random order
4. First bestie auto-selected
5. Select desired bestie from list
6. Complete sponsorship flow

---

## TROUBLESHOOTING

### Issue: Bestie not pre-selecting
**Cause:** Invalid or missing `bestieId` URL parameter
**Fix:** Ensure carousel passes correct bestie ID in URL

### Issue: Besties not randomizing
**Cause:** `bestieId` param present in URL
**Fix:** Remove parameter for random order, or clear navigation state

### Issue: Funding progress not showing
**Cause:** `monthly_goal` is null or 0
**Fix:** Set monthly goal in admin manager

### Issue: Carousel not pausing for audio
**Cause:** `onPlayingChange` prop not connected
**Fix:** Ensure TextToSpeech component updates `isAudioPlaying` state

### Issue: Sponsor button hidden
**Cause:** Bestie marked as fully funded
**Fix:** Check `is_fully_funded` flag or funding percentage in database
