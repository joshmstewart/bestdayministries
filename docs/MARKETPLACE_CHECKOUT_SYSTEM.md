# JoyHouse Store / Marketplace Checkout System

## Overview

The JoyHouse Store is a unified marketplace combining:
1. **Handmade Products** - Community vendor items with Stripe Connect
2. **Official Merch** - Shopify-integrated official merchandise

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     /marketplace                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ UnifiedCartSheet (combines both cart types)                 ││
│  │  ├── Handmade items → create-marketplace-checkout           ││
│  │  └── Shopify items → Shopify Storefront API checkout        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `vendors` | Vendor accounts with Stripe Connect integration |
| `products` | Handmade product listings |
| `shopping_cart` | User cart items |
| `orders` | Order records with status tracking |
| `order_items` | Individual items per order with fee breakdown |
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
- `is_active`, `is_printify`, `printify_product_id`

**orders:**
- `id`, `user_id`, `customer_id`, `total_amount`
- `status`: pending | paid | processing | completed | cancelled
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
2. Authenticate user, verify order ownership
3. Check if already paid → return success
4. Query Stripe for session status
5. If paid: Update order to "paid", clear cart
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
| `/checkout-success` | CheckoutSuccess.tsx | Payment verification + polling |
| `/orders` | OrderHistory.tsx | Customer order history |
| `/vendor-dashboard` | VendorDashboard.tsx | Vendor management portal |
| `/vendor-auth` | VendorAuth.tsx | Vendor application |
| `/vendors/:id` | VendorStorefront.tsx | Public vendor store page |

### Marketplace Components (`src/components/marketplace/`)

| Component | Purpose |
|-----------|---------|
| `ProductCard.tsx` | Handmade product display |
| `ProductGrid.tsx` | Grid of handmade products |
| `ShopifyProductCard.tsx` | Official merch display |
| `ShopifyProductGrid.tsx` | Grid of Shopify products |
| `UnifiedCartSheet.tsx` | Combined cart drawer |
| `ShopifyCartSheet.tsx` | Shopify-only cart |
| `ShoppingCartSheet.tsx` | Handmade-only cart |

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

### Store Components (`src/components/store/`)
(Coin-based virtual store, separate from marketplace)

| Component | Purpose |
|-----------|---------|
| `StoreItemCard.tsx` | Virtual item display |
| `StoreItemGrid.tsx` | Grid of virtual items |
| `PurchaseDialog.tsx` | Coin purchase confirmation |
| `UserInventory.tsx` | User's purchased items |

## Workflows

### Customer Purchase Flow

```
1. Browse /marketplace
2. Add items to cart (handmade or Shopify)
3. Open UnifiedCartSheet
4. Click checkout for cart type
   ├── Handmade → create-marketplace-checkout → Stripe
   └── Shopify → Shopify Storefront API checkout
5. Complete payment on Stripe
6. Redirect to /checkout-success
7. verify-marketplace-payment polls
8. Order confirmed → View in /orders
```

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

## Current Status

### ✅ Implemented

- [x] Marketplace page with tabs (Handmade/Official Merch)
- [x] Unified cart supporting both product types
- [x] Commission settings table (20% default)
- [x] create-marketplace-checkout edge function
- [x] verify-marketplace-payment edge function
- [x] CheckoutSuccess page with polling
- [x] Vendor dashboard with all tabs
- [x] Stripe Connect onboarding component
- [x] Product management (CRUD)
- [x] Order tracking submission
- [x] OrderHistory page for customers
- [x] Shopify integration for official merch

### ❌ Not Yet Working

- [ ] **No approved vendors** - All vendors are rejected
- [ ] **No active products** - No products in database
- [ ] **Vendor Stripe Connect not set up** - No `stripe_account_id` populated
- [ ] **Admin commission UI** - No way to adjust commission in admin
- [ ] **Vendor payout on fulfillment** - create-vendor-transfer exists but untested

## To Make Store Operational

### Minimum Required Steps

1. **Approve a vendor** in Admin → Vendors tab
2. **Vendor completes Stripe Connect** via dashboard
3. **Vendor adds products** with inventory
4. **Test purchase** end-to-end

### Optional Enhancements

- Admin UI for commission_settings management
- Vendor payout automation on delivery
- Inventory management alerts
- Order notification emails

## Security Considerations

### RLS Policies

- `vendors`: Users can view own, admins can manage all
- `products`: Public read, vendor-owner write
- `orders`: Users see own orders only
- `order_items`: Through order access
- `shopping_cart`: User sees own cart only

### Stripe Security

- Uses separate test/live keys based on `app_settings.stripe_mode`
- Vendors cannot receive payments until `stripe_charges_enabled = true`
- Platform collects full payment, transfers on fulfillment (fraud protection)

## Related Documentation

- `VENDOR_SYSTEM_CONCISE.md` - Vendor status vs role explanation
- `VENDOR_AUTH_SYSTEM.md` - Authentication flow
- `EDGE_FUNCTIONS_REFERENCE.md` - All edge function details

## Secrets Required

| Secret | Purpose |
|--------|---------|
| `STRIPE_SECRET_KEY_LIVE` | Live Stripe API |
| `STRIPE_SECRET_KEY_TEST` | Test Stripe API |
| `AFTERSHIP_API_KEY` | Order tracking |
