# FEATURED BESTIE ON VENDOR STORES

## System Overview
Vendors showcase approved featured bestie content (images, videos, voice notes) on their vendor profile page with guardian approval.

## Database Tables
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `featured_besties` | Guardian-created bestie content | `image_url`, `voice_note_url`, `description`, `bestie_name`, `aspect_ratio`, `approval_status` |
| `vendor_bestie_requests` | Vendor → bestie linking workflow | `vendor_id`, `bestie_id`, `status` (pending/approved) |
| `vendor_bestie_assets` | Approved assets for vendor display | `vendor_id`, `bestie_id`, `asset_url`, `asset_type`, `approval_status` |
| `caregiver_bestie_links` | Guardian-bestie relationships | `caregiver_id`, `bestie_id`, `require_vendor_asset_approval` |

## Workflow
**1. Guardian Creates Post** (Community page)
- Upload image/video/voice note
- Add bestie name, description, aspect ratio
- Set `approval_status: 'approved'` → appears on community page

**2. Vendor Links to Bestie** (Vendor Dashboard → Linked Besties)
- Enter 3-emoji friend code + optional message
- Creates `vendor_bestie_requests` with `status: 'pending'`

**3. Guardian Approves Link** (`/guardian-approvals` → Vendor Links)
- Views request (business name + message)
- Approve → `status: 'approved'` → vendor can request assets

**4. Vendor Requests Asset** (Vendor Dashboard → Linked Besties)
- Select asset from bestie's featured posts (image/video/voice)
- Add optional title/description
- Creates `vendor_bestie_assets` with `status: 'pending'`

**5. Guardian Approves Asset** (`/guardian-approvals` → Asset Requests)
- Preview asset + vendor details
- Approve → `status: 'approved'` → displays on vendor store

**6. Asset Displays** (`/vendors/{id}`)
- Fetches approved assets via `VendorBestieAssetDisplay.tsx`
- Layout matches community page featured besties

## Technical Implementation

### Data Fetching (`VendorProfile.tsx`)
```typescript
// 1. Fetch approved assets
const { data: assetsData } = await supabase
  .from("vendor_bestie_assets")
  .select("*")
  .eq("vendor_id", vendorId)
  .eq("approval_status", "approved")

// 2. Enrich with bestie details
const enrichedAssets = await Promise.all(
  assetsData.map(async (asset) => {
    // Get display_name from profiles_public
    const { data: profile } = await supabase
      .from("profiles_public")
      .select("display_name")
      .eq("id", asset.bestie_id)
      .maybeSingle();

    // Get description/aspect_ratio from featured_besties
    const { data: featuredBestie } = await supabase
      .from("featured_besties")
      .select("description, aspect_ratio, bestie_name, voice_note_url")
      .or(`image_url.eq.${asset.asset_url},voice_note_url.eq.${asset.asset_url}`)
      .eq("approval_status", "approved")
      .maybeSingle();

    return {
      id: asset.id,
      bestie_name: featuredBestie?.bestie_name || profile?.display_name,
      description: featuredBestie?.description || asset.asset_title,
      asset_type: asset.asset_type,
      asset_url: asset.asset_url,
      aspect_ratio: featuredBestie?.aspect_ratio || "9:16"
    };
  })
);
```

### Display Component (`VendorBestieAssetDisplay.tsx`)
```typescript
interface BestieAsset {
  id: string;
  bestie_name: string;
  description: string;
  asset_type: 'image' | 'video' | 'voice_note';
  asset_url: string;
  aspect_ratio: string; // "9:16", "16:9"
}

// Layout: 2-column grid (md:grid-cols-2)
// Left: Asset with AspectRatio wrapper
// Right: Bestie name + description + TTS
// Badge: "Bestie of the Month" (vendor store) vs "Featured Bestie" (community)
```

### Layout Structure
```tsx
<div className="max-w-6xl mx-auto">
  <Card>
    <div className="grid md:grid-cols-2 gap-6 p-6">
      {/* Left: Asset */}
      {/* Right: Name + Description + TTS */}
    </div>
  </Card>
</div>
```

## Badge Rules
- **Community Page:** "Featured Bestie" badge
- **Vendor Store:** "Bestie of the Month" badge
- Position: `absolute top-4 left-4`, primary background, heart icon + text

## Key Files
**Vendor Components:**
- `VendorBestieLinkRequest.tsx` - Link via friend code
- `VendorLinkedBesties.tsx` - View approved links
- `VendorBestieAssetManager.tsx` - Request asset usage
- `VendorBestieAssetDisplay.tsx` - Display approved assets

**Guardian Components:**
- `VendorLinkRequests.tsx` - Approve vendor links
- `VendorAssetRequests.tsx` - Approve asset usage

**Pages:**
- `VendorProfile.tsx` - Public vendor store
- `Community.tsx` - Original featured besties
- `GuardianApprovals.tsx` - Guardian approval hub

## RLS Policies
**`vendor_bestie_assets` SELECT:**
- Vendors see their own assets
- Guardians see assets for their linked besties
- Public sees approved assets on vendor store

**`vendor_bestie_assets` INSERT:**
- Only approved vendors can request assets for approved links

**`vendor_bestie_assets` UPDATE:**
- Guardians approve/reject requests
- Admins have full access

## Common Issues
| Issue | Cause | Solution |
|-------|-------|----------|
| Images enormous, text hidden | Missing `max-w-6xl mx-auto` | Wrap in container div |
| Missing bestie name/description | Data not enriched from `featured_besties` | Cross-reference `asset_url` with `image_url`/`voice_note_url` |
| Wrong aspect ratio | Not using `AspectRatio` component | Parse `aspect_ratio` string ("9:16") to decimal (9/16) |

## Duplication Guide (for Sponsorship Posts)
1. **Tables:** Create `sponsor_content` (like `featured_besties`) + `sponsor_content_shares` (like `vendor_bestie_assets`)
2. **Components:** Clone `VendorBestieAssetDisplay.tsx` → `SponsorContentDisplay.tsx`
3. **Layout:** Keep 2-column grid + `max-w-6xl mx-auto` + aspect ratio handling
4. **Badge:** Change text (e.g., "Sponsored Content")
5. **Workflow:** Same approval pattern (sponsor requests → guardian approves)
