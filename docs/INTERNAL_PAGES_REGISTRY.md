# INTERNAL PAGES REGISTRY

## Overview
Centralized list of all internal routes used across admin interfaces for navigation, footer links, quick links, and featured items.

## File Location
`src/lib/internalPages.ts`

## Purpose
Provides a single source of truth for internal page routes, ensuring consistency across:
- Navigation Bar Manager
- Footer Links Manager
- Quick Links Manager
- Featured Items Manager

## Structure

```typescript
interface InternalPage {
  value: string;  // Route path (e.g., "/community")
  label: string;  // Display name (e.g., "Community")
}
```

## Current Pages

**Public Pages:**
- `/` - Home
- `/about` - About/Resources
- `/support` - Support Us
- `/joy-rocks` - Joy Rocks Coffee
- `/partners` - Partners

**Community Features:**
- `/community` - Community
- `/discussions` - Discussions
- `/events` - Events
- `/gallery` - Albums
- `/videos` - Videos

**Sponsorship:**
- `/sponsor-bestie` - Sponsor a Bestie

**Marketplace:**
- `/marketplace` - Marketplace
- `/orders` - Order History

**User Management:**
- `/auth` - Login/Signup
- `/profile` - Profile

**Guardian/Bestie:**
- `/guardian-links` - My Besties
- `/guardian-approvals` - Guardian Approvals
- `/bestie-messages` - Bestie Messages

**Help & Support:**
- `/help` - Help Center

**Admin:**
- `/admin` - Admin Panel

## Adding New Pages

**CRITICAL:** When adding a new route to `App.tsx`, you MUST also add it to `internalPages.ts`:

1. Add route in `src/App.tsx`:
```typescript
<Route path="/new-page" element={<NewPage />} />
```

2. Add to `src/lib/internalPages.ts`:
```typescript
{ value: "/new-page", label: "New Page" },
```

3. Entry immediately becomes available in all admin dropdowns

## Why This Matters

**Without Registry Entry:**
- Admins can't link to page in navigation bar
- Page won't appear in footer link options
- Can't create quick links to page
- Featured items can't link to page

**With Registry Entry:**
- Page automatically appears in all admin interfaces
- Consistent labeling across the app
- Easy to maintain and update

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| New page not in admin dropdowns | Missing from registry | Add to `internalPages.ts` |
| Wrong page label | Incorrect `label` value | Update label in registry |
| Dead link | Route deleted but registry entry remains | Remove from registry |

## Maintenance Rules

1. **Keep in sync with routes** - Registry should match `App.tsx` routes
2. **Use descriptive labels** - Users see these in admin interfaces
3. **Alphabetize by category** - Maintain logical grouping
4. **No external URLs** - Only internal routes (starting with `/`)

## Files

- `src/lib/internalPages.ts` - Registry definition
- `src/App.tsx` - Route definitions
- `src/components/admin/NavigationBarManager.tsx` - Uses registry
- `src/components/admin/FooterLinksManager.tsx` - Uses registry
- `src/components/admin/QuickLinksManager.tsx` - Uses registry
- `src/components/admin/FeaturedItemManager.tsx` - Uses registry

---

## Games Pages

The following game pages are registered:
- `/games/memory-match` - Memory Match Game
- `/games/match3` - Match-3 Game
- `/games/drink-creator` - Drink Creator
- `/virtual-pet` - Virtual Pet
- `/sticker-album` - Sticker Album
- `/store` - JoyCoins Store

## Resources Pages

The following resource pages are registered (accessed via Resources dropdown in nav):
- `/games/recipe-gallery` - Recipe Pal (main unified page with 3 tabs)
- `/games/recipe-maker` - Recipe Maker (redirects to Recipe Pal)

---

**Last Updated:** After adding Recipe Pal (`/games/recipe-gallery`) route
