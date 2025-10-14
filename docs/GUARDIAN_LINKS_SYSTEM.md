# Guardian Links System Documentation

## Overview
The Guardian Links page (`/guardian-links`) is the central hub for caregivers, admins, and owners to manage their relationships with bestie accounts. It provides comprehensive controls for content moderation, vendor relationships, sponsor communication, and sponsorship management.

## Access Control
**Allowed Roles:** `caregiver`, `admin`, `owner`

**Route:** `/guardian-links`

Users without appropriate roles are redirected to `/community` with an "Access denied" toast message.

## Page Structure

### 1. Link a Bestie Section
- **Friend Code Search:** 3-emoji code system using emoji picker
- **Relationship Input:** Text field for describing the relationship (e.g., "Mother", "Sister", "Cousin")
- **Security:** Role verification via `user_roles` table before creating link
- **Database:** `caregiver_bestie_links` table

### 2. Your Besties Section
Displays all linked besties with accordion-based settings for each:

#### Content Moderation Accordion (Always Visible)
- **Require Post Approval:** Toggle for reviewing bestie's discussion posts before publication
- **Require Comment Approval:** Toggle for reviewing bestie's comments before publication
- **Allow Featured Posts:** Toggle allowing guardian to create featured posts for this bestie
- **Manage Featured Posts Button:** Opens `GuardianFeaturedBestieManager` (only visible if "Allow Featured Posts" is enabled)

#### Vendor Relationships Accordion (Admin/Owner Only)
- **Visibility:** Only shown to users with `admin` or `owner` roles
- **Badge:** "Admin Only" badge displayed on accordion trigger
- **Settings:**
  - Require Vendor Asset Approval
  - Show Vendor Store Link on Bestie Profile
  - Show Vendor Store Link on Your Profile
- **Linked Vendors Display:** Shows approved vendor links with remove functionality

#### Sponsor Communication Accordion (Conditional)
- **Visibility:** Only shown if the bestie is enrolled in the sponsorship program
- **Database Check:** Queries `sponsor_besties` table for `bestie_id` where `is_active = true`
- **Settings:**
  - Allow Sponsor Messages
  - Require Message Approval
- **State Management:** `bestiesInSponsorProgram` Set tracks which besties are eligible

### 3. Send Messages to Sponsors Section (Conditional)
- **Visibility:** Only shown if ANY linked bestie is in the sponsor program
- **Condition:** `bestiesInSponsorProgram.size > 0`
- **Component:** `GuardianSponsorMessenger`

### 4. My Sponsorships Section
- **Visibility:** Shown if user has any active sponsorships
- **Features:**
  - View bestie details with avatar and name
  - See sponsorship amount and frequency
  - Change monthly sponsorship amount
  - Manage subscription via Stripe customer portal
  - Share sponsorship access with other linked besties
  - View featured bestie content (image, audio, funding progress)
  - Mode indicator (Test/Live) badge

## Database Schema

### Primary Table: `caregiver_bestie_links`
```sql
- id: uuid
- caregiver_id: uuid (references user)
- bestie_id: uuid (references user)
- relationship: text
- require_post_approval: boolean (default: false)
- require_comment_approval: boolean (default: false)
- allow_featured_posts: boolean (default: true)
- require_vendor_asset_approval: boolean (default: false)
- show_vendor_link_on_bestie: boolean (default: true)
- show_vendor_link_on_guardian: boolean (default: true)
- allow_sponsor_messages: boolean (default: true)
- require_message_approval: boolean (default: true)
```

### Related Tables
- `sponsor_besties` - Tracks besties in sponsorship program
- `sponsorships` - User sponsorship records
- `vendor_bestie_requests` - Vendor-bestie link requests
- `profiles` - User profile data
- `user_roles` - Role-based access control

## State Management

### Key State Variables
```typescript
const [bestiesInSponsorProgram, setBestiesInSponsorProgram] = useState<Set<string>>(new Set());
const [links, setLinks] = useState<BestieLink[]>([]);
const [linkedBesties, setLinkedBesties] = useState<LinkedBestie[]>([]);
const [vendorLinks, setVendorLinks] = useState<Map<string, VendorLink[]>>(new Map());
const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
```

### Loading Sequence
1. **checkAccess()** - Verify user authentication and role
2. **loadLinks()** - Load linked besties and check which are in sponsor program
3. **loadLinkedBesties()** - Load bestie profile data
4. **loadVendorLinks()** - Load approved vendor relationships
5. **loadSponsorships()** - Load active sponsorships (own + shared)

## Conditional Rendering Logic

### Vendor Relationships Section
```typescript
{(userRole === 'admin' || userRole === 'owner') && (
  <AccordionItem value="vendor-relationships">
    <Badge variant="outline">Admin Only</Badge>
    // ... vendor settings
  </AccordionItem>
)}
```

### Sponsor Communication Section
```typescript
{bestiesInSponsorProgram.has(link.bestie_id) && (
  <AccordionItem value="sponsor-communication">
    // ... sponsor settings
  </AccordionItem>
)}
```

### Send Messages to Sponsors
```typescript
{['caregiver', 'admin', 'owner'].includes(userRole) && bestiesInSponsorProgram.size > 0 && (
  <div className="space-y-4">
    <h2>Send Messages to Sponsors</h2>
    <GuardianSponsorMessenger />
  </div>
)}
```

## Security

### RLS Policies
- Links viewable by: caregiver, bestie, or admins
- Links modifiable by: caregiver or admins
- Uses `is_guardian_of()` security definer function
- Role verification via `user_roles` table (not client-supplied data)

### Authorization Checks
1. Page-level: Must be caregiver/admin/owner
2. Link creation: Role verified server-side before insert
3. Toggle changes: Validated against existing link ownership
4. Vendor link removal: Verified ownership before delete

## Components Used

### Internal Components
- `GuardianFeaturedBestieManager` - Manage featured posts for a bestie
- `GuardianSponsorMessenger` - Send messages to sponsors
- `SponsorMessageInbox` - View messages from besties
- `DonationHistory` - View donation transaction history
- `AvatarDisplay` - Display user avatars
- `TextToSpeech` - Audio playback of content
- `FundingProgressBar` - Display sponsorship funding progress

### UI Components
- Dialog, AlertDialog - Modal interactions
- Card, CardHeader, CardContent - Content containers
- Accordion, AccordionItem - Collapsible sections
- Switch - Toggle controls
- Button, Badge - Interactive elements

## Integration Points

### Stripe Integration
- Mode switcher moved to Admin > Settings > Stripe Mode tab
- Sponsorship management via customer portal
- Test/Live mode indicator on sponsorship cards

### Notification System
- Real-time updates via `useGuardianApprovalsCount`
- Approval status changes trigger notifications

### Audio System
- Voice notes for featured besties
- Audio messages in sponsor communication
- Text-to-speech for bestie descriptions

## Testing Coverage

### E2E Tests (`tests/e2e/guardian-linking.spec.ts`)
- Navigation to guardian links page
- Link bestie form display
- Emoji selector functionality
- Approval settings display (conditional)
- Role-based access (redirect non-caregivers)

### Test Notes
- Vendor Relationships section not tested for non-admins (conditional)
- Sponsor Communication not tested without sponsored besties (conditional)
- Settings accordion tests account for conditional visibility

## Recent Changes (2025-01-14)

### 1. Stripe Mode Switcher Relocation
- **Before:** Displayed on `/guardian-links` and `/sponsor-bestie` pages
- **After:** Moved to Admin panel (Admin > Settings > Stripe Mode tab)
- **Reason:** Centralized admin control for payment mode switching

### 2. Vendor Relationships - Admin Only
- **Change:** Section now only visible to admin/owner roles
- **Visual:** "Admin Only" badge added to accordion trigger
- **Reason:** Simplify interface for regular caregivers; vendor management is advanced feature

### 3. Sponsor Communication - Conditional Display
- **Change:** Section only appears if bestie is in sponsor program
- **Check:** Queries `sponsor_besties` table on page load
- **State:** `bestiesInSponsorProgram` Set tracks eligible besties
- **Reason:** Avoid confusion with sponsor-specific settings for non-sponsored besties

### 4. Send Messages Section - Enhanced Condition
- **Before:** Shown if `links.length > 0`
- **After:** Shown if `bestiesInSponsorProgram.size > 0`
- **Reason:** Only relevant when at least one linked bestie can receive sponsor messages

## Future Considerations

### Potential Enhancements
1. Bulk operations for managing multiple links
2. Activity logs for approval actions
3. Notification preferences per bestie
4. Advanced filtering for linked besties
5. Analytics dashboard for guardian activity

### Performance Optimizations
1. Implement pagination for large numbers of links
2. Lazy load vendor links only when accordion opens
3. Cache sponsorship data to reduce database queries
4. Optimize image loading for featured bestie content

## Related Documentation
- [BESTIE_LINKING_CONCISE.md](./BESTIE_LINKING_CONCISE.md) - Friend code linking system
- [SPONSORSHIP_SYSTEM_MASTER.md](./SPONSORSHIP_SYSTEM_MASTER.md) - Sponsorship workflows
- [VENDOR_BESTIE_SYSTEM_CONCISE.md](./VENDOR_BESTIE_SYSTEM_CONCISE.md) - Vendor relationships
- [GUARDIAN_APPROVALS_CONCISE.md](./GUARDIAN_APPROVALS_CONCISE.md) - Approval workflows
