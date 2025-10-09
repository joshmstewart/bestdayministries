# COFFEE SHOP SYSTEM - CONCISE DOCS

## Overview
Dedicated website for Best Day Ever Coffee & Crepes (`/coffee-shop` route) with admin management interface.

## Database
**Storage:** Content stored in `app_settings` table with key `coffee_shop_content`

## Admin Management
**Location:** Admin → Coffee Shop Website tab

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

**Button Links:**
- **Type selection:** Internal page or custom URL
- **Internal:** Dropdown with all pages from `INTERNAL_PAGES`
- **Custom:** Text input for external URLs or anchor links (#menu)
- Menu button default: `#menu` (scrolls to menu section)
- About button default: `/about` (internal page)

## Frontend Display
**Component:** `CoffeeShopHome.tsx`
**Route:** `/coffee-shop`

**Sections:**
1. Hero with background image, heading, subheading, CTA buttons
2. Mission statement card
3. Hours/location info cards
4. Menu (conditionally rendered based on `show_menu` toggle)

**Button Behavior:**
- Internal links: Navigate using `window.location.href`
- Anchor links (#): Smooth scroll to element
- External links: Open in new tab

## Menu Integration
**Component:** `CoffeeShopMenu.tsx`
**Displays:** Coffee, specialty drinks, crepes, ice cream (hard-coded from original menu.html)

## Admin Preview
- **Preview button:** Opens `/coffee-shop` in new tab
- **Live Site button:** Opens actual domain (bestdayevercoffeeandcrepes.com)

## Content Structure
```typescript
{
  hero_heading: string;
  hero_subheading: string;
  hero_image_url: string;
  menu_button_text: string;
  menu_button_link: string;
  menu_button_link_type: "internal" | "custom";
  about_button_text: string;
  about_button_link: string;
  about_button_link_type: "internal" | "custom";
  mission_title: string;
  mission_description: string;
  hours_title: string;
  hours_content: string;
  address: string;
  phone: string;
  show_menu: boolean;
}
```

## Key Features
- Fully customizable via admin panel
- No code changes needed for content updates
- Image upload with cropping
- Flexible button linking (internal/external/anchors)
- Toggle menu visibility
- Real-time preview capability

## Files
- `src/components/admin/CoffeeShopManager.tsx` - Admin interface
- `src/pages/CoffeeShopHome.tsx` - Frontend display
- `src/components/CoffeeShopMenu.tsx` - Menu component
- `src/lib/internalPages.ts` - Page dropdown options
- `docs/COFFEE_SHOP_SYSTEM.md` - This documentation

---

**Last Updated:** After implementing image upload and flexible button links
