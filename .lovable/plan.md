
# Coffee Products → ShipStation Integration Plan

## Current State Summary

- **Payment confirmation is already the trigger** - Printify orders are only created AFTER payment is verified (`verify-marketplace-payment` checks `session.payment_status === "paid"` before any fulfillment actions)
- **Coffee products are NOT in the checkout flow** - they're in the cart but never become order items
- **ShipStation sync is NOT automatic** - it's only called manually, not triggered after payment
- **Coffee has SKUs ready** - `coffee_products.shipstation_sku` exists with values like `BDE-GROUND-BB-12`

## Implementation Overview

The integration requires 4 main changes across database and edge functions:

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    UPDATED ORDER FLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│  1. Cart (coffee + regular items)                                   │
│           ↓                                                         │
│  2. create-marketplace-checkout (ADD coffee items to order)         │
│           ↓                                                         │
│  3. Stripe Payment Completed                                        │
│           ↓                                                         │
│  4. verify-marketplace-payment (triggers fulfillment)               │
│           ↓                                                         │
│  5. sync-order-to-shipstation (ADD coffee support) ← NEW TRIGGER    │
│           ↓                                                         │
│  6. ShipStation Dashboard → Vendor Ships                            │
│           ↓                                                         │
│  7. poll-shipstation-status (already works)                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema Updates

### 1.1 Create Coffee Vendor Record
Create a real vendor record for "Best Day Ever Coffee" as a house vendor:

- `business_name`: "Best Day Ever Coffee"
- `is_house_vendor`: true (100% goes to platform, like Joy House Official Store)
- `status`: approved

### 1.2 Add `coffee_product_id` Column to `order_items`

Add a nullable column to support coffee products in order history:

| Column | Type | Purpose |
|--------|------|---------|
| `coffee_product_id` | uuid (FK to coffee_products) | Links to coffee product |

Add a check constraint: either `product_id` or `coffee_product_id` is set, not both.

---

## Phase 2: Checkout Flow Updates

### 2.1 Update `create-marketplace-checkout`

Modify the edge function to:

1. Query coffee items from cart (where `coffee_product_id IS NOT NULL`)
2. Include coffee in inventory checks (if applicable)
3. Group coffee items under the Coffee vendor
4. Create Stripe line items for coffee products
5. Create `order_items` records with `coffee_product_id` instead of `product_id`

**Key changes:**
- Add second cart query for coffee items
- Map coffee vendor to the new Coffee vendor ID
- Calculate shipping using existing coffee shipping logic
- Create order_items with `coffee_product_id` field

---

## Phase 3: ShipStation Sync Updates

### 3.1 Update `sync-order-to-shipstation`

Modify to handle coffee products:

1. Query order items that have EITHER `product_id` OR `coffee_product_id`
2. For coffee items: join to `coffee_products` table to get `shipstation_sku`, `name`
3. Use default weight of 16oz per coffee item
4. Group coffee items under the Coffee vendor ID

**SQL query change:**
```sql
SELECT 
  oi.*,
  p.name as product_name, p.sku as product_sku, p.weight as product_weight,
  cp.name as coffee_name, cp.shipstation_sku as coffee_sku
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
LEFT JOIN coffee_products cp ON oi.coffee_product_id = cp.id
WHERE oi.order_id = $orderId
  AND oi.shipstation_order_id IS NULL
```

### 3.2 Trigger ShipStation Sync After Payment

Add ShipStation sync call to `verify-marketplace-payment` (similar to existing Printify trigger):

```typescript
// After payment verified, trigger ShipStation sync for non-Printify items
try {
  const shipstationResponse = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-order-to-shipstation`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ orderId: order_id }),
    }
  );
  // Log result but don't fail payment verification
} catch (err) {
  logStep("Warning: ShipStation sync failed", { error: err.message });
}
```

---

## Phase 4: Frontend Updates (Minor)

### 4.1 Update Cart Constants

Replace placeholder `COFFEE_VENDOR_ID = "coffee-vendor"` with the actual UUID of the new Coffee vendor record in:
- `src/components/marketplace/UnifiedCartSheet.tsx`
- `src/components/admin/CoffeeVendorManager.tsx`
- `supabase/functions/calculate-shipping-rates/index.ts`

---

## Safety Guarantees

### Orders Only Pushed to ShipStation After Payment

**Existing safeguard (already in place):**
- `verify-marketplace-payment` checks `session.payment_status === "paid"` before any fulfillment actions
- If payment is unpaid, it returns early with `status: "pending"`
- If payment fails, order is marked `cancelled`

**New ShipStation trigger will be placed INSIDE the `if (session.payment_status === "paid")` block**, alongside the existing Printify trigger, ensuring:
- No orders pushed for abandoned checkouts
- No orders pushed for failed payments
- Only paid orders trigger ShipStation sync

### Printify Follows Same Pattern

The existing Printify integration already demonstrates this pattern:
```typescript
if (session.payment_status === "paid") {
  // Update order to processing
  // Decrement inventory
  // Clear cart
  // Trigger Printify order creation  ← ONLY HERE
  // Send confirmation emails
}
```

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| Database migration | Add coffee_product_id to order_items, create Coffee vendor |
| `create-marketplace-checkout/index.ts` | Add coffee items to checkout flow |
| `sync-order-to-shipstation/index.ts` | Add coffee product support |
| `verify-marketplace-payment/index.ts` | Add ShipStation sync trigger |
| `UnifiedCartSheet.tsx` | Update COFFEE_VENDOR_ID constant |
| `CoffeeVendorManager.tsx` | Update COFFEE_VENDOR_ID constant |
| `calculate-shipping-rates/index.ts` | Update COFFEE_VENDOR_ID constant |

### Secrets Required

The following secrets are already configured for ShipStation:
- `SHIPSTATION_API_KEY`
- `SHIPSTATION_API_SECRET`

---

## Rollout Steps

1. Create database migration for schema changes
2. Update `create-marketplace-checkout` to include coffee
3. Update `sync-order-to-shipstation` to handle coffee products
4. Update `verify-marketplace-payment` to trigger ShipStation sync
5. Update frontend constants with real Coffee vendor UUID
6. Deploy and test end-to-end with a test purchase
