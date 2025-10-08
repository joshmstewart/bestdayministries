ADMIN DASHBOARD - CONCISE

## Overview
Central admin interface (`/admin`) for managing all platform content and settings.

**Access:** Admin or owner role only (from `user_roles` table)
**Redirect:** Non-admins sent to `/community` with access denied toast

## Stats Overview (Top Cards)
- Total Users (`profiles` count)
- Events (`events` count)
- Discussion Posts (`discussion_posts` count)
- Featured Besties (`featured_besties` count)

## Tabs

### Analytics
**Component:** `AnalyticsDashboard`
- Comprehensive platform metrics
- User activity, engagement, trends

### Users
**Component:** `UserManagement`
- View/edit user profiles
- Assign/change roles
- Grant permissions (e.g., moderation)
- Create test accounts
- Delete users
- Send password resets

### Events
**Redirect:** `/admin/events` (EventManagement page)
- Create/edit events
- Recurring events
- Image/audio upload
- Date management

### Albums
**Redirect:** `/admin/albums` (AlbumManagement page)
- Create/manage photo albums
- Image cropping, reordering
- Link to events/discussions

### Videos
**Component:** `VideoManager`
- Upload videos or embed YouTube
- Thumbnails, metadata
- Active/inactive toggle
- Drag-and-drop reordering

### Besties
**Sub-tabs:** Featured Besties | Sponsor Besties | Sponsor Page Order | Sponsor Page Content | Receipt Settings | Transactions | Year-End Settings | Year-End History
- Manage featured bestie posts
- Sponsorship management
- Configure sponsor page layout
- Receipt/tax settings

### Partners
**Component:** `PartnersManager`
- Add/edit partner organizations
- Logo upload, website links
- Display order management

### Donations
**Component:** `SupportPageManager`
- Configure donation page content
- Stripe integration settings
- View donation transactions (future)
- Export donation data (future)
**Status:** Webhook automation complete, admin UI pending
**See:** `docs/DONATION_SYSTEM.md` for complete documentation

### Featured Item
**Component:** `FeaturedItemManager`
- Manage homepage featured items
- Image/link/description
- Active/inactive toggle
- Display order

### Vendors
**Component:** `VendorManagement`
**Badge:** Shows `pendingVendorsCount` (vendors with "pending" status)
**Sub-tabs:** Vendors | Products | Orders
- Approve/reject vendor applications
- Manage vendor products
- View vendor orders

### Format Pages
**Sub-tabs:** Homepage | Community | About | Footer | Quick Links | Navigation | Locations
- **Homepage:** Section visibility/order (`HomepageOrderManager`)
- **Community:** Section visibility/order (`CommunityOrderManager`)
- **About:** Page content (`AboutPageManager`)
- **Footer:** Link sections (`FooterLinksManager`)
- **Quick Links:** Community page quick links (`QuickLinksManager`)
- **Navigation:** Top nav links (`NavigationBarManager`)
- **Locations:** Saved locations (`SavedLocationsManager`)

### Moderation
**Badge:** `moderationCount + messageModerationCount`
**Sub-tabs:** Content | Messages | Policies
- **Content:** Unmoderated posts/comments (redirect to `/moderation`)
- **Messages:** Sponsor messages pending moderation (`MessageModerationQueue`)
- **Policies:** AI moderation settings (`ModerationPolicyManager`)

### Contact
**Badge:** `contactFormCount` (new submissions)
**Component:** `ContactFormManager`
- View contact form submissions
- Mark as read/resolved
- Configure form settings

### Settings
**Sub-tabs:** App Settings | Avatars | Impersonation
- **App Settings:** Logo, favicon, mobile app icon/name (`AppSettingsManager`)
  - Favicon dynamically updates via `FaviconManager` component on app load
  - Stored in `app_settings` table with key `favicon_url`
- **Avatars:** Upload composite avatars (`AvatarUploader`)
- **Impersonation:** Test UI as different roles (`RoleImpersonator`)

## Role Impersonation
**Feature:** Admin can view UI as different roles without switching accounts
**Hook:** `useRoleImpersonation`
- Stored in `localStorage`
- Affects badge counts, visibility, permissions
- Used for testing role-based features

## Access Control
**Check:** Queries `user_roles` table for role
**Function:** `has_admin_access(user_id)` returns true for admin/owner
**Security:** RLS policies use this function, never client-side checks

## Badge Count Hooks
- `useModerationCount` - Unmoderated posts/comments
- `usePendingVendorsCount` - Pending vendor applications
- `useMessageModerationCount` - Pending sponsor messages
- `useContactFormCount` - New contact form submissions

## Common Issues
| Issue | Fix |
|-------|-----|
| Can't access | Check `user_roles` table, must be admin/owner |
| Tab won't load | Check component import/mount |
| Badge count wrong | Verify hook subscription filters |
| Settings not saving | Check RLS policies on target table |

**Files:** `Admin.tsx`, `UserManagement.tsx`, `VideoManager.tsx`, `VendorManagement.tsx`, plus 20+ admin components
