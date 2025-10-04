# SPONSOR PAGE SYSTEM

## Overview
Route: `/sponsor-bestie?bestieId={optional}` - One-time/monthly sponsorships via Stripe

## COMPONENTS

### SponsorBestie Page (`src/pages/SponsorBestie.tsx`)

**Features:**
- Dynamic section ordering from `sponsor_page_sections` table
- URL param handling: `?bestieId=xxx` → pre-select + move to top | no param → randomize
- Blocks besties from sponsoring (role check)
- Stripe checkout integration

**Key State:**
`besties`, `selectedBestie`, `frequency` (one-time/monthly), `amount`, `email` (auto-filled if logged in), `fundingProgress`, `sections`, `pageContent`, `featuredVideo`

**Sections:** `header`, `featured_video`, `sponsor_carousel`, `selection_form`, `impact_info` (renders only `is_visible: true`, ordered by `display_order`)

---

### SponsorBestieDisplay (`src/components/SponsorBestieDisplay.tsx`)

**Display:** Single card or carousel (7s auto-advance, pauses on manual nav/TTS)

**Card Elements:**
- Image (aspect ratio preserved) + "Available for Sponsorship" badge
- "You're Sponsoring!" badge (if active sponsorship)
- Text sections (TTS on first) + voice note player
- Funding progress bar (if `monthly_goal > 0`)
- "Sponsor This Bestie" → `/sponsor-bestie?bestieId={id}`
- "Fully Funded" message (if `is_fully_funded` or ≥100%)

**Data:** Fetches `sponsor_besties` (active), randomizes, checks user sponsorships, loads `sponsor_bestie_funding_progress` view

---

## DATABASE

### sponsor_besties
**Columns:** `id`, `bestie_id` (nullable), `bestie_name`, `image_url`, `voice_note_url`, `text_sections` (jsonb: `[{header, text}]`), `aspect_ratio` (default: '9:16'), `monthly_goal`, `is_active`, `is_fully_funded`, timestamps
**RLS:** Public SELECT (active only) | Admins ALL

### sponsor_page_sections
**Columns:** `id`, `section_key` (unique), `section_name`, `is_visible`, `display_order`, `content` (jsonb), timestamps
**Keys:** `header`, `featured_video`, `sponsor_carousel`, `selection_form`, `impact_info`
**RLS:** Public SELECT | Admins ALL

### sponsor_bestie_funding_progress (VIEW)
**Returns:** `sponsor_bestie_id`, `bestie_id`, `bestie_name`, `current_monthly_pledges` (SUM active monthly), `monthly_goal`, `funding_percentage`, `remaining_needed`
**Calculation:** Joins `sponsor_besties` with `sponsorships` (status='active', frequency='monthly'), groups by bestie

---

## ADMIN CONTROLS

### SponsorBestieManager (`Admin → Sponsorships → Sponsor Besties`)
**CRUD:** Create/edit/delete besties | Upload image + voice note (app-assets) | Add text sections (min 1) | Set aspect ratio, monthly goal | Toggle active/fully funded

### SponsorPageOrderManager (`Admin → Sponsorships → Sponsor Page Order`)
**Reorder:** Drag-and-drop sections (dnd-kit) | Toggle visibility (green eye = visible, red eye-off = hidden) | Auto-saves

### SponsorBestiePageManager (`Admin → Sponsorships → Page Content`)
**Edit:** Badge text, heading, description, featured video (dropdown) | Saves to `app_settings.sponsor_page_content` as JSON

---

## SPECIAL RULES

### URL Parameter Behavior
**With `?bestieId=xxx`:** Move to top + pre-select + scroll to form | **Without:** Randomize + select first

### Role Blocking
Besties cannot sponsor (check `user_roles.role`, redirect to /community if bestie)

### Funding Display
Progress bar only if `monthly_goal > 0` | Fully funded = hide button, show success (when `is_fully_funded` OR `≥100%`)

### Carousel Auto-Pause
Pauses on: manual nav, TTS playing, pause button | Resumes on: play button, audio ends

### Form Validation
Min $10, valid email (Zod) | Email auto-filled + disabled if logged in | Defaults: $25, monthly

### TTS Rendering
Only first section gets TTS button (combines header + text)

---

## STRIPE INTEGRATION

**Edge Function:** `create-sponsorship-checkout`
**Request:** `{bestie_id, amount, frequency, email}`
**Flow:** Auth → Check/create Stripe customer → Create price → Create session (payment/subscription mode) → Store pending → Return URL
**URLs:** Success: `/sponsorship-success` | Cancel: `/sponsor-bestie`

---

## FILES
- `src/pages/SponsorBestie.tsx` - Main page
- `src/components/SponsorBestieDisplay.tsx` - Carousel
- `src/components/admin/SponsorBestieManager.tsx` - Bestie CRUD
- `src/components/admin/SponsorPageOrderManager.tsx` - Section ordering
- `src/components/admin/SponsorBestiePageManager.tsx` - Header editor
- `supabase/functions/create-sponsorship-checkout/` - Stripe

---

## WORKFLOWS

**Admin Add Bestie:** Admin → Sponsorships → Sponsor Besties → Add → Upload image/voice → Enter name + sections → Set ratio/goal → Save

**Admin Reorder:** Admin → Sponsor Page Order → Drag sections → Toggle visibility → Auto-saves

**User Sponsor (Carousel):** Click "Sponsor This Bestie" → `/sponsor-bestie?bestieId=xxx` → Bestie pre-selected at top → Adjust amount → Checkout

**User Sponsor (Nav):** Nav "Sponsor" → `/sponsor-bestie` → Random order → Select bestie → Checkout

---

## TROUBLESHOOTING

| Issue | Cause | Fix |
|-------|-------|-----|
| Bestie not pre-selecting | Invalid `bestieId` param | Check carousel URL generation |
| Not randomizing | Param present | Remove `bestieId` from URL |
| No progress bar | `monthly_goal` null/0 | Set goal in admin |
| Carousel not pausing | `onPlayingChange` disconnected | Check TextToSpeech prop |
| Button hidden | `is_fully_funded` true | Check database flag |
