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

### Media
**Sub-tabs:** Videos | Audio Clips
- **Videos** (`VideoManager`): Upload videos or embed YouTube
  - Thumbnails, metadata
  - Active/inactive toggle
  - Drag-and-drop reordering
- **Audio Clips** (`AudioClipsManager`): Upload and manage audio clips
  - Titles, descriptions, categories
  - Audio preview player
  - Visibility toggle
  - Search and category filtering

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
**Performance:** Optimized parallel loading (auth + items fetched simultaneously)

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
- **Locations:** Saved locations (`SavedLocationsManager`) - See `docs/SAVED_LOCATIONS_SYSTEM.md`

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
- Reply to submissions via email

### Help Center
**Component:** `HelpCenterManager`
**Sub-tabs:** Tours | Guides | FAQs
- **Tours:** Interactive product tours using react-joyride
  - Create step-by-step walkthroughs
  - Configure target elements and content
  - Set duration estimates
- **Guides:** Long-form documentation
  - Markdown-like formatting
  - Category/audience targeting
  - Reading time estimates
- **FAQs:** Question/answer pairs
  - Category grouping
  - Target specific audiences
  - Quick visibility toggle
**See:** `docs/HELP_CENTER_SYSTEM.md` for complete documentation

### Product Updates
**Component:** `ProductUpdateBroadcaster`
- Broadcast platform announcements to users
- Target all users or specific roles
- Custom title, message, and optional link
- Creates in-app notifications + sends emails
- Respects user notification preferences
**See:** `docs/NOTIFICATION_SYSTEM_COMPLETE.md` for complete notification documentation

### Notifications
**Component:** `EmailTemplatePreview`
- Preview email notification templates
- Send test emails
- View email styles and formatting

### Settings
**Sub-tabs:** App Settings | Stripe Mode | Social Sharing | Static Meta Tags | Avatars | Text-to-Speech | Coins | Store Items | Pet Types | Locations | Games | Impersonation
- **App Settings:** Logo, favicon, mobile app icon/name (`AppSettingsManager`)
  - Favicon dynamically updates via `FaviconManager` component on app load
  - Stored in `app_settings` table with key `favicon_url`
- **Stripe Mode:** Toggle between test and live Stripe modes (`StripeModeSwitcher`)
- **Social Sharing:** Guide for social media preview configuration (`SocialSharingGuide`)
- **Static Meta Tags:** Configure default meta tags (`StaticMetaTagsManager`)
- **Avatars:** Upload composite avatars (`AvatarUploader`)
- **Text-to-Speech:** Configure TTS voice settings (`TTSVoiceManager`)
- **Coins:** Manage virtual coin system (`CoinsManager`)
- **Store Items:** Configure store products (`StoreItemsManager`)
- **Pet Types:** Manage pet type categories (`PetTypesManager`)
- **Locations:** Saved locations management (`SavedLocationsManager`)
- **Games:** Game-related content management
  - **Drink Ingredients** (`DrinkIngredientsManager`): Manage Drink Creator ingredients with AI icon generation
  - **Drink Vibes** (`DrinkVibesManager`): Manage drink moods/vibes with AI icon generation
  - **Recipe Ingredients** (`RecipeIngredientsManager`): Manage Recipe Pal ingredients (119 items) with AI icons
  - **Recipe Tools** (`RecipeToolsManager`): Manage Recipe Pal kitchen tools (52 items) with smart suggestions and AI icons
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
