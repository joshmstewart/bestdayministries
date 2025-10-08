VENDOR BESTIE SYSTEM - CONCISE

## Overview
Vendors display guardian-approved featured bestie content (images, videos, voice notes) on their vendor profile with guardian approval workflow.

**Note:** Vendor is a status (tracked in `vendors` table), not a role. Users can be caregivers, besties, or supporters AND vendors simultaneously.

## Database
**Tables:** `featured_besties`, `vendor_bestie_requests`, `vendor_bestie_assets`, `caregiver_bestie_links`

## Workflow
1. Guardian creates approved featured bestie post → community page
2. Vendor enters 3-emoji friend code → creates `vendor_bestie_requests` (pending)
3. Guardian approves link at `/guardian-approvals` → vendor can request assets
4. Vendor selects asset → creates `vendor_bestie_assets` (pending)
5. Guardian approves asset → displays on vendor store (`/vendors/{id}`)

## Display (`VendorBestieAssetDisplay.tsx`)
**Layout:** 2-column grid (`md:grid-cols-2`) with `max-w-6xl mx-auto`
- Left: Asset with `AspectRatio` wrapper
- Right: Bestie name + description + TTS
- Badge: "Bestie of the Month" (`absolute top-4 left-4`)

## Data Fetching
1. Fetch approved assets from `vendor_bestie_assets` by `vendor_id`
2. Enrich with `profiles_public` (display_name) + `featured_besties` (description, aspect_ratio)
3. Cross-reference `asset_url` with `image_url`/`voice_note_url` for metadata

## RLS Policies
- **SELECT:** Vendors (own), guardians (linked besties), public (approved on store)
- **INSERT:** Approved vendors only
- **UPDATE:** Guardians approve/reject, admins full access

## Common Issues
| Issue | Fix |
|-------|-----|
| Images enormous | Add `max-w-6xl mx-auto` container |
| Missing name/description | Enrich from `featured_besties` table |
| Wrong aspect ratio | Parse string ("9:16") to decimal (9/16) |

**Files:** `VendorBestieAssetDisplay.tsx`, `VendorBestieLinkRequest.tsx`, `VendorLinkedBesties.tsx`, `VendorProfile.tsx`, `VendorLinkRequests.tsx`, `VendorAssetRequests.tsx`
