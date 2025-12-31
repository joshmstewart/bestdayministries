# Printify Integration - Complete Documentation

## Overview

Print-on-demand integration with Printify for selling custom merchandise. Products are designed in Printify, imported to our database, and orders are fulfilled by Printify when customers purchase.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ADMIN: Printify Tab                               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ PrintifyProductImporter                                            │  │
│  │  ├── fetch-printify-products → List all Printify catalog          │  │
│  │  ├── import-printify-product → Import to products table           │  │
│  │  ├── refresh-printify-product → Sync images/variants from API     │  │
│  │  └── generate-printify-images → Check image status                │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                        STORE: /marketplace                               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ ProductCard → Shows color swatches + "Select Options" btn         │  │
│  │ ProductDetail → Color/Size dropdowns + image filtering            │  │
│  │ UnifiedCartSheet → Checkout with variant info                     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                        ORDER FULFILLMENT                                 │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ create-printify-order → Send order to Printify API                │  │
│  │ order_items.printify_order_id → Track Printify fulfillment        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### products table (Printify columns)

| Column | Type | Purpose |
|--------|------|---------|
| `is_printify_product` | boolean | Flag for Printify products |
| `printify_product_id` | text | Printify's product ID |
| `printify_blueprint_id` | integer | Blueprint ID (e.g., t-shirt type) |
| `printify_print_provider_id` | integer | Print provider ID |
| `printify_variant_ids` | jsonb | Map of `"Color / Size" → variant_id` |
| `printify_original_title` | text | Title at import time (for change detection) |
| `printify_original_description` | text | Description at import time |
| `printify_original_price` | numeric | Base price at import time |

### order_items table (Printify columns)

| Column | Type | Purpose |
|--------|------|---------|
| `printify_order_id` | text | Printify's order ID after submission |
| `printify_line_item_id` | text | Line item ID in Printify order |
| `printify_status` | text | pending | processing | shipped | delivered |

## Edge Functions

### fetch-printify-products
**Purpose:** Fetch all products from Printify API and compare with imported products

**Auth:** Admin/owner required

**Flow:**
1. Get Printify API key from secrets
2. Fetch shop ID from Printify
3. Fetch all products from shop
4. Load existing imported products from database
5. Compare current Printify data vs `printify_original_*` fields
6. Flag `has_changes` if Printify data differs from original baseline
7. Return products with `is_imported` and `has_changes` flags

**Response:**
```typescript
{
  success: boolean;
  products: PrintifyProduct[];
  shop: { id: number; title: string };
}
```

### import-printify-product
**Purpose:** Import a Printify product to our products table

**Auth:** Admin/owner required

**Input:**
```typescript
{
  printifyProduct: PrintifyProduct;
  priceMarkup: number;  // Calculated from (sellingPrice - basePrice)
}
```

**Flow:**
1. Extract first enabled variant price as base
2. Clean HTML from description
3. Remove "(Printify)" prefix from title
4. Build variant ID mapping: `{ "Natural / XS": 12345, ... }`
5. Calculate final price: `basePrice + priceMarkup`
6. Insert product with all Printify metadata
7. Store original values for change detection

### refresh-printify-product
**Purpose:** Sync latest images and variants from Printify API

**Auth:** Admin/owner required

**Input:** `{ productId: string }` (local product ID)

**Flow:**
1. Look up `printify_product_id` from local product
2. Fetch fresh data from Printify API
3. Update `images[]`, `printify_variant_ids`
4. Update `printify_original_*` baseline values

**Use Case:** When new mockup images are generated in Printify

### generate-printify-images
**Purpose:** Check which variants are missing images in Printify

**Auth:** Admin/owner required

**Flow:**
1. Fetch product from Printify API
2. Map variant IDs to images
3. Find enabled variants without images
4. Return diagnostic info (cannot generate images via API)

**Note:** Images must be generated in Printify's dashboard

### create-printify-order
**Purpose:** Submit order to Printify for fulfillment

**Auth:** Service role (called after payment)

**Flow:**
1. Get order and order_items
2. Filter to Printify products only
3. Match products to Printify catalog by blueprint/provider
4. Build line items with variant IDs
5. Submit order to Printify API
6. Store `printify_order_id` on order_items

**Shipping Address:** Currently uses placeholder - needs shipping address collection

### send-order-shipped
**Purpose:** Send a "your order shipped" email (tracking + carrier) to the customer

**Auth:** Internal (service role)

**Called by:** `check-printify-status` and `printify-webhook` when Printify orders transition to shipped

**Input:**
```ts
{
  orderId: string;        // local orders.id (uuid)
  trackingNumber: string;
  trackingUrl: string;
  carrier: string;
}
```

**Notes:**
- Uses `order_items.price_at_purchase` (not `unit_price`)
- `shipping_address` keys typically come from checkout as `line1`, `line2`, `city`, `state`, `postal_code`

## Frontend Components

### Admin: PrintifyProductImporter
**Location:** Admin → Vendors → Printify tab

**Features:**
- **Catalog View:** Shows all Printify products
- **Import Status:** Badges for "Imported", "Has Updates", "Not Imported"
- **Archive:** Hide products you don't want to import (localStorage)
- **Preview Dialog:** Edit title/description/markup before import
- **Sync:** Pull latest data from Printify for imported products
- **Keep My Version:** Dismiss "Has Updates" flag without syncing

**Sections:**
1. Needs Update (amber) - Printify changed since import
2. Available to Import (primary) - Not yet imported
3. Already Imported (success) - In your store
4. Archived (collapsed) - Hidden products

### Admin: PrintifyPreviewDialog
**Purpose:** Preview and edit product before import/sync

**Features:**
- Image gallery with color selection
- Editable title and description
- **Selling Price input** (shows base cost + calculated markup)
- Option chips for colors/sizes
- Clicking color shows matching images

**Pricing UX (Updated 2025-01-16):**
- Input shows "Selling Price ($)" - the price customers will pay
- Minimum is base cost (can't sell below cost)
- Helper text shows: "Base cost: $X.XX (+$Y.YY markup)"
- Consistent with product edit dialog experience

### Admin: ProductColorImagesManager
**Purpose:** Manage per-color product images

**Launched from:** Imported product cards in PrintifyProductImporter

### Store: ProductCard
**Features for Printify products:**
- Color swatches overlay (top-right of image)
- "Select Options" button (instead of "Add to Cart")
- Navigates to ProductDetail for variant selection

**Color Detection:**
```typescript
// Extracts colors from variant titles like "Natural / XS"
const sizePatterns = /^(xs|s|m|l|xl|xxl|2xl|3xl|4xl|5xl|6xl|one size|\d+oz|\d+″|\d+x\d+|\d+)$/i;
// If part[0] matches size pattern, color is part[1], else part[0]
```

**Color Swatches:**
- Maps color names to CSS colors (66+ colors)
- Shows up to 6 swatches + "+N" overflow
- Tooltip shows color name on hover

### Store: ProductDetail
**Route:** `/store/product/:productId`

**Features:**
- Separate Color and Size dropdowns
- Smart detection of which option is color vs size
- **Image gallery shows ALL images** (Printify + any custom uploads)
- Images are **ordered by color sections** using `product_color_images` mappings (no duplicates)
- Selecting a color **jumps** to that color's images (does not filter/hide others)
- Quantity selector
- Add to Cart with variant info in `shopping_cart.variant_info`

**Variant Parsing:**
```typescript
// Parses "Color / Size" format
// Detects sizes by pattern matching (xs, s, m, l, xl, 2xl, etc.)
// Whichever set has size patterns becomes "sizes", other becomes "colors"
```

## Workflows

### Product Import Workflow

```
1. Design product in Printify dashboard
2. Generate mockups in Printify (important!)
3. Admin → Vendors → Printify tab
4. Click "Refresh" to fetch catalog
5. Click "Preview" on product
6. Edit title/description if needed
7. Set selling price (shows base cost + calculated markup)
8. Click "Import to Store"
9. Product appears in /marketplace
```

### Change Detection Workflow

```
1. Product imported with baseline values stored
2. Later, Printify data changes (price, description, etc.)
3. fetch-printify-products compares current vs baseline
4. Product flagged "Has Updates"
5. Admin choices:
   a) "Sync Updates" - Overwrite local with Printify data
   b) "Keep My Version" - Update baseline to match local
```

### Customer Purchase Workflow

```
1. Customer browses /marketplace
2. Clicks Printify product → ProductDetail
3. Selects Color and Size
4. Adds to cart (variant_info stored)
5. Checks out via create-marketplace-checkout
6. Payment verified via verify-marketplace-payment
7. (Future) create-printify-order sends to Printify
8. Printify fulfills and ships
```

## Color to CSS Mapping

The ProductCard component includes a comprehensive color mapping:

```typescript
const colorNameToCSS: Record<string, string> = {
  'white': '#FFFFFF',
  'black': '#000000',
  'navy': '#1E3A5A',
  'sport grey': '#9CA3AF',
  'natural': '#FAF0E6',
  // ... 66+ colors
};
```

Supports fuzzy matching for variations like "light pink", "heather gray", etc.

## Secrets Required

| Secret | Purpose |
|--------|---------|
| `PRINTIFY_API_KEY` | Printify API authentication |

## Current Status

### ✅ Implemented
- [x] Fetch Printify catalog
- [x] Import products with variant mapping
- [x] Change detection (Printify vs baseline)
- [x] Sync/refresh from Printify
- [x] Dismiss updates ("Keep My Version")
- [x] Color swatches on product cards
- [x] Separate Color/Size dropdowns
- [x] Image filtering by color
- [x] Variant info in cart
- [x] Archive/unarchive products

### ⚠️ Needs Work
- [ ] create-printify-order - Exists but needs shipping address collection
- [ ] Per-variant pricing (currently uses base variant price)

## Automatic Status Updates (Cron Job)

### Overview
A cron job automatically polls Printify every 15 minutes for order status updates.

### How It Works
```
┌─────────────────────────────────────────────────────────────────┐
│  Every 15 minutes (pg_cron)                                     │
│  ↓                                                              │
│  net.http_post → check-printify-status edge function            │
│  ↓                                                              │
│  Query order_items with pending Printify orders                 │
│  ↓                                                              │
│  Fetch status from Printify API for each order                  │
│  ↓                                                              │
│  Update order_items:                                            │
│    - printify_status                                            │
│    - fulfillment_status                                         │
│    - tracking_number, carrier, tracking_url (when shipped)      │
│    - shipped_at, delivered_at timestamps                        │
└─────────────────────────────────────────────────────────────────┘
```

### Status Mapping
| Printify Status | printify_status | fulfillment_status |
|-----------------|-----------------|-------------------|
| pending, on-hold | pending | pending |
| in-production, printing | in_production | pending |
| fulfilled, shipped | shipped | shipped |
| delivered | delivered | delivered |
| canceled, cancelled | cancelled | cancelled |

### Cron Job Details
- **Job Name:** `check-printify-status-job`
- **Schedule:** Every 15 minutes (`*/15 * * * *`)
- **Extensions Required:** `pg_cron`, `pg_net`

### Verification
```sql
-- Check cron job status
SELECT * FROM cron.job WHERE jobname = 'check-printify-status-job';

-- Check recent job runs
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-printify-status-job')
ORDER BY start_time DESC LIMIT 10;
```

### Manual Trigger
The status check can also be triggered manually via the Admin UI or by calling:
```bash
curl -X POST https://nbvijawmjkycyweioglk.supabase.co/functions/v1/check-printify-status \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Files Reference

### Edge Functions
- `supabase/functions/fetch-printify-products/index.ts`
- `supabase/functions/import-printify-product/index.ts`
- `supabase/functions/refresh-printify-product/index.ts`
- `supabase/functions/generate-printify-images/index.ts`
- `supabase/functions/create-printify-order/index.ts`
- `supabase/functions/check-printify-status/index.ts`

### Frontend Components
- `src/components/admin/PrintifyProductImporter.tsx`
- `src/components/admin/PrintifyPreviewDialog.tsx`
- `src/components/admin/ProductColorImagesManager.tsx`
- `src/components/admin/ProductEditDialog.tsx`
- `src/components/marketplace/ProductCard.tsx`
- `src/pages/ProductDetail.tsx`

### Related Documentation
- `docs/MARKETPLACE_CHECKOUT_SYSTEM.md`
- `docs/STRIPE_CONNECT_CONCISE.md`
