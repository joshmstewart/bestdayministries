# Joy House Store / Marketplace Checkout System

## Overview

The Joy House Store is a unified marketplace combining:
1. **Printify Products** - Print-on-demand merchandise (t-shirts, mugs, etc.)
2. **Handmade Products** - Community vendor items with Stripe Connect
3. **Official Merch** - Shopify-integrated official merchandise

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     /marketplace                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ProductCard (with color swatches for Printify)              ││
│  │  ├── Printify → /store/product/:id → variant selection      ││
│  │  └── Other → Add to cart directly                           ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ UnifiedCartSheet (combines all cart types)                  ││
│  │  ├── Handmade/Printify → create-marketplace-checkout        ││
│  │  └── Shopify items → Shopify Storefront API checkout        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Payment Verification (No Webhooks)

The checkout uses **polling-based verification** instead of webhooks:

1. Customer completes Stripe Checkout
2. Redirected to `/checkout-success?session_id=xxx&order_id=xxx`
3. CheckoutSuccess page calls `verify-marketplace-payment`
4. Edge function checks Stripe session status directly via API
5. If paid → updates order status, clears cart
6. If pending → frontend polls again (3s intervals, max 10 attempts)

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `vendors` | Vendor accounts with Stripe Connect integration |
| `products` | Product listings (including Printify) |
| `shopping_cart` | User cart items with variant_info |
| `orders` | Order records with status tracking |
| `order_items` | Individual items with fee breakdown + Printify tracking |
| `commission_settings` | Platform commission percentage |
| `vendor_earnings` | (VIEW) Aggregated vendor earnings |

### Key Columns

**vendors:**
- `id`, `user_id`, `business_name`, `description`
- `status`: pending | approved | rejected | suspended
- `stripe_account_id`: Stripe Connect account ID
- `stripe_charges_enabled`: Can receive payments
- `stripe_onboarding_complete`: Completed Stripe onboarding
- `commission_percentage`: Vendor-specific override (optional)
- `featured_bestie_id`: Linked bestie for vendor

**products:**
- `id`, `vendor_id`, `name`, `description`, `price`
- `images[]`, `inventory_count`, `category`, `tags[]`
- `is_active`, `is_printify_product`
- Printify columns: `printify_product_id`, `printify_blueprint_id`, `printify_print_provider_id`, `printify_variant_ids`, `printify_original_title`, `printify_original_description`, `printify_original_price`

**shopping_cart:**
- `user_id`, `product_id`, `quantity`
- `variant_info`: JSONB `{ variant: "Natural / XS", variantId: 12345 }`

**orders:**
- `id`, `user_id`, `customer_id`, `total_amount`
- `status`: pending | processing | shipped | completed | cancelled | refunded
- `stripe_checkout_session_id`, `stripe_payment_intent_id`
- `stripe_mode`: test | live
- `paid_at`, `shipping_address`, `billing_address`

**order_items:**
- `id`, `order_id`, `product_id`, `vendor_id`
- `quantity`, `price_at_purchase`
- `platform_fee`, `vendor_payout` (commission split)
- `fulfillment_status`: pending | shipped | delivered
- `tracking_number`, `carrier`, `tracking_url`
- `stripe_transfer_id` (for vendor payout)
- Printify: `printify_order_id`, `printify_line_item_id`, `printify_status`

**commission_settings:**
- `id`, `commission_percentage` (default: 20%)
- `created_at`, `updated_at`, `created_by`

## Edge Functions

### create-marketplace-checkout
**Purpose:** Create Stripe checkout session for handmade products

**Flow:**
1. Authenticate user
2. Fetch cart items with product/vendor details
3. Verify all vendors have Stripe Connect enabled
4. Calculate per-vendor totals, shipping, platform fees
5. Create `orders` record (status: pending)
6. Create `order_items` with fee breakdown
7. Create Stripe checkout session
8. Return checkout URL

**Shipping Logic:**
- Flat rate: $6.99 per vendor
- Free shipping: Orders ≥ $35 per vendor

**Commission:**
- Fetches from `commission_settings` (currently 20%)
- Platform fee = subtotal × commission %
- Vendor payout = subtotal - platform fee

### verify-marketplace-payment
**Purpose:** Polling-based payment verification (no webhooks)

**Flow:**
1. Receive `session_id` and `order_id`
2. Authenticate user (optional on return), validate `session_id` matches stored order session
3. If already completed/processing → return success
4. Query Stripe for session status
5. If paid: Update order to "completed", clear cart
6. If pending: Return pending (frontend polls again)
7. If failed: Update order to "cancelled"

**Frontend Polling:**
- CheckoutSuccess page polls every 3 seconds
- Max 10 attempts (30 seconds total)

### create-vendor-transfer
**Purpose:** Transfer funds to vendor on fulfillment (exists but untested)

### submit-tracking
**Purpose:** Vendor submits tracking info, triggers AfterShip

## Frontend Components

### Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/marketplace` | Marketplace.tsx | Main store with tabs |
| `/store/product/:productId` | ProductDetail.tsx | Product detail with variant selection |
| `/checkout-success` | CheckoutSuccess.tsx | Payment verification + polling |
| `/orders` | OrderHistory.tsx | Customer order history with vendor info display |
| `/vendor-dashboard` | VendorDashboard.tsx | Vendor management portal |
| `/vendor-auth` | VendorAuth.tsx | Vendor application |
| `/vendors/:id` | VendorStorefront.tsx | Public vendor store page |

### Store Access / Maintenance Mode

The marketplace page supports a simple “store temporarily down” gate for testing/maintenance.

**Settings (in `app_settings`):**
- `marketplace_stripe_mode`: `live` | `test`
- `store_access_mode`: `open` | `authenticated` | `admins_only`

**Behavior:**
- If `marketplace_stripe_mode = test`, then **non-admin / non-owner users** can still load the page route, but will see a **Store Currently Unavailable** message instead of products.
- If `store_access_mode = admins_only`, only admins/owners can view the store.
- If `store_access_mode = authenticated`, guests are prompted to sign in.

### Recent Updates (2025-01)


| Feature | Description |
|---------|-------------|
| **Vendor Info in Orders** | Order history and details now display vendor business name for each item |
| **Product Image Lightbox** | Admin product list images are clickable to open lightbox with all product images |
| **ProductDetail Lightbox** | Main image click opens lightbox starting with currently viewed image |
| **Image List Improvements** | Reduced margins, larger thumbnails in admin product list for better visibility |

### Marketplace Components (`src/components/marketplace/`)

| Component | Purpose |
|-----------|---------|
| `ProductCard.tsx` | Product display with color swatches for Printify |
| `ProductGrid.tsx` | Grid of products |
| `ShopifyProductCard.tsx` | Official merch display |
| `ShopifyProductGrid.tsx` | Grid of Shopify products |
| `UnifiedCartSheet.tsx` | Combined cart drawer |
| `ShopifyCartSheet.tsx` | Shopify-only cart |
| `ShoppingCartSheet.tsx` | Handmade-only cart |

### Admin Components (`src/components/admin/`)

| Component | Purpose |
|-----------|---------|
| `PrintifyProductImporter.tsx` | Import/sync Printify products |
| `PrintifyPreviewDialog.tsx` | Preview before import |
| `ProductColorImagesManager.tsx` | Per-color image management |
| `ProductEditDialog.tsx` | Edit product details |
| `VendorManagement.tsx` | Manage vendors + Printify tab |

### Vendor Components (`src/components/vendor/`)

| Component | Purpose |
|-----------|---------|
| `ProductForm.tsx` | Add/edit products |
| `ProductList.tsx` | Vendor's product list |
| `StripeConnectOnboarding.tsx` | Stripe Connect setup |
| `VendorEarnings.tsx` | Earnings dashboard |
| `VendorOrderList.tsx` | Orders to fulfill |
| `VendorOrderDetails.tsx` | Order details + tracking input |
| `VendorProfileSettings.tsx` | Store settings |
| `VendorBestieLinkRequest.tsx` | Link to bestie |
| `VendorLinkedBesties.tsx` | Manage linked besties |
| `VendorBestieAssetManager.tsx` | Upload assets for bestie |

**Product options (handmade products):** `products.options` stores option groups like `{ name: "Color", values: ["Red", "Blue"] }`. The vendor `ProductForm` will block saving if an option type is selected but no choices are entered, and will auto-include any in-progress option (type + choices) even if the user forgets to click **Add Option**.

### Store Components (`src/components/store/`)
(Coin-based virtual store, separate from marketplace)

| Component | Purpose |
|-----------|---------|
| `StoreItemCard.tsx` | Virtual item display |
| `StoreItemGrid.tsx` | Grid of virtual items |
| `PurchaseDialog.tsx` | Coin purchase confirmation |
| `UserInventory.tsx` | User's purchased items |

## Workflows

### Customer Purchase Flow (Printify/Handmade)

```
1. Browse /marketplace
2. Click product → /store/product/:id (for variants)
3. Select Color and Size dropdowns
4. Add to cart (variant_info stored)
5. Open UnifiedCartSheet
6. Click "Checkout with Stripe"
7. create-marketplace-checkout → Stripe Checkout
8. Complete payment on Stripe
9. Redirect to /checkout-success?session_id=xxx&order_id=xxx
10. verify-marketplace-payment polls (3s × 10 attempts)
11. Order confirmed → View in /orders
```

### Printify Admin Workflow

```
1. Design product in Printify dashboard
2. Generate mockups for all colors
3. Admin → Vendors → Printify tab
4. Click "Refresh" to fetch catalog
5. Products show in "Available to Import"
6. Click "Preview" → edit title/description/selling price
7. Click "Import to Store"
8. Product appears in /marketplace with color swatches
```

**Note:** The preview dialog shows "Selling Price" (final price customers pay) rather than markup. Base cost and calculated markup are shown for reference.

### Vendor Onboarding Flow

```
1. User visits /vendor-auth or /marketplace → "Become a Vendor"
2. Signs up or logs in
3. Vendor record created (status: pending)
4. Admin approves in Admin → Vendors tab
5. Vendor status → approved
6. Vendor completes Stripe Connect onboarding
7. Vendor adds products
8. Products appear in marketplace
```

### Order Fulfillment Flow

```
1. Customer completes purchase
2. Order appears in vendor dashboard (pending)
3. Vendor ships order, enters tracking
4. submit-tracking → AfterShip API
5. fulfillment_status → shipped
6. (Future) create-vendor-transfer → payout on delivery
7. Customer sees tracking in /orders
```

### Printify Order Fulfillment (Future)

```
1. Customer completes purchase of Printify product
2. create-printify-order sends to Printify API
3. Printify fulfills and ships
4. Tracking updated via webhook or manual
5. Customer receives product
```

## Current Status

### ✅ Implemented

- [x] Marketplace page with product grid
- [x] Unified cart supporting handmade + Printify
- [x] Commission settings table (20% default)
- [x] create-marketplace-checkout edge function
- [x] verify-marketplace-payment (polling-based, no webhooks!)
- [x] CheckoutSuccess page with polling verification
- [x] Printify product import with variant mapping
- [x] Color swatches on product cards (66+ colors)
- [x] ProductDetail page with Color/Size dropdowns
- [x] Image filtering by selected color
- [x] Change detection (Printify vs local edits)
- [x] "Keep My Version" dismissal for update flags
- [x] Vendor dashboard with all tabs
- [x] Stripe Connect onboarding component
- [x] Product management (CRUD)
- [x] Order tracking submission
- [x] OrderHistory page for customers with vendor info display
- [x] Shopify integration for official merch
- [x] Product image lightbox in admin (VendorManagement) - click to view full size
- [x] ProductDetail image lightbox - starts with currently viewed image
- [x] Vendor business name display in order history and order details

### ⚠️ Needs Testing

- [ ] Full end-to-end purchase with Stripe
- [ ] Printify order submission to API
- [ ] Vendor payout on fulfillment

### ❌ Not Yet Working

- [ ] Shipping address collection for Printify orders
- [ ] Admin commission UI (no way to adjust in admin)
- [ ] Per-variant pricing (uses base variant price)

## To Make Store Operational

### Minimum Required Steps

1. **Test Stripe checkout** with imported Printify product
2. **Complete purchase** and verify order appears
3. **Implement shipping address** collection for Printify fulfillment
4. **Test Printify order** submission

### Optional Enhancements

- Admin UI for commission_settings management
- Vendor payout automation on delivery
- Inventory management alerts
- Order notification emails

## Security Considerations

### RLS Policies

- `vendors`: Users can view own, admins can manage all
- `products`: Public read, vendor-owner write
- `orders`: Users see own orders only; admins can delete orders in `pending | processing | completed | cancelled` (keeps shipped/delivered protected)
- `order_items`: Through order access; admins can delete items when parent order is `pending | processing | completed | cancelled`
- `shopping_cart`: User sees own cart only

### Stripe Security

- Uses separate test/live keys based on `app_settings.stripe_mode`
- Vendors cannot receive payments until `stripe_charges_enabled = true`
- Platform collects full payment, transfers on fulfillment (fraud protection)

## Fulfillment Options

### Option 1: AfterShip (Current)

Manual tracking entry by vendors with AfterShip API for status tracking.

See: `submit-tracking` edge function

### Option 2: ShipStation (Prepared, Not Active)

Full order sync to ShipStation for fulfillment management.

**Status:** Edge functions ready, awaiting API credentials.

**Edge Functions:**
- `sync-order-to-shipstation` - Push orders to ShipStation
- `poll-shipstation-status` - Poll for tracking updates

**Required Secrets (not yet configured):**
- `SHIPSTATION_API_KEY`
- `SHIPSTATION_API_SECRET`

**Documentation:** See `SHIPSTATION_INTEGRATION.md` for full details.

## Related Documentation

- `VENDOR_SYSTEM_CONCISE.md` - Vendor status vs role explanation
- `VENDOR_AUTH_SYSTEM.md` - Authentication flow
- `EDGE_FUNCTIONS_REFERENCE.md` - All edge function details
- `SHIPSTATION_INTEGRATION.md` - ShipStation fulfillment integration
- `PRINTIFY_INTEGRATION.md` - Print-on-demand products

## Secrets Required

| Secret | Purpose | Status |
|--------|---------|--------|
| `MARKETPLACE_STRIPE_SECRET_KEY_LIVE` | Live Stripe API (marketplace) | Configured |
| `MARKETPLACE_STRIPE_SECRET_KEY_TEST` | Test Stripe API (marketplace) | Configured |
| `AFTERSHIP_API_KEY` | Order tracking | Configured |
| `PRINTIFY_API_KEY` | Print-on-demand | Configured |
| `SHIPSTATION_API_KEY` | ShipStation sync | **Not configured** |
| `SHIPSTATION_API_SECRET` | ShipStation auth | **Not configured** |
