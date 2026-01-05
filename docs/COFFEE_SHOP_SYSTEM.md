# COFFEE SHOP SYSTEM - CONCISE DOCS

## Overview
Dedicated website for Best Day Ever Coffee & Crepes (`/coffee-shop` route) with admin management interface.

## Database
**Settings:** Content stored in `app_settings` table with key `coffee_shop_content`

**Menu Tables:**
- `coffee_shop_menu_categories` - Menu categories (Coffee, Crepes, etc.)
- `coffee_shop_menu_items` - Individual menu items with flexible pricing
- `coffee_shop_menu_addons` - Add-ons (espresso shot, milk substitutes)

## Admin Management
**Location:** Admin → Coffee Shop Website tab

### Site Settings Tab
**Editable Content:**
- Hero section: heading, subheading, image (upload with crop)
- Mission: title, description
- Buttons: text + links (internal page dropdown or custom URL)
- Location info: hours, address, phone
- Menu visibility toggle

**Image Upload:**
- Hero image uses `ImageCropDialog` with 16:9 aspect ratio
- Uploads to `app-assets/coffee-shop/` bucket
- Compressed to 4.5MB max

### Menu Tab
**Features:**
- CRUD for categories, items, and add-ons
- Flexible pricing: single price, small/large, or coffee-style (hot 12oz/16oz, iced 16oz/24oz)
- Visibility toggle per item/category
- Display order management
- Featured item flag

**Pricing Types:**
- **Single Price:** For items with one price (e.g., Affogato $5.00)
- **Small/Large:** For crepes and specialty drinks
- **Coffee-style:** For coffee with hot/iced and size options

## Frontend Display
**Component:** `CoffeeShopHome.tsx`
**Route:** `/coffee-shop`

**Sections:**
1. Hero with background image, heading, subheading, CTA buttons
2. Mission statement card
3. Hours/location info cards
4. Menu (database-driven, conditionally rendered)

**Menu Display:** `CoffeeShopMenu.tsx`
- Fetches from database
- Auto-detects pricing type and renders appropriate layout
- Coffee table for multi-size drinks
- Card grid for crepes and specialty items
- Warm amber/orange color scheme for café aesthetic

## Domain Routing
**Hook:** `useDomainRouting.ts`
- Detects coffee shop domain (`bestdayevercoffeeandcrepes.com`)
- Shows coffee shop landing page when accessed from that domain
- Handles legacy domain redirects

## Files
- `src/components/admin/CoffeeShopManager.tsx` - Admin interface with tabs
- `src/components/admin/CoffeeShopMenuManager.tsx` - Menu CRUD admin
- `src/pages/CoffeeShopHome.tsx` - Frontend display
- `src/components/CoffeeShopMenu.tsx` - Menu component (database-driven)
- `src/hooks/useDomainRouting.ts` - Domain detection
- `docs/COFFEE_SHOP_SYSTEM.md` - This documentation

---

**Last Updated:** After implementing database-driven menu management
