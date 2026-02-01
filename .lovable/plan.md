
# Coffee Products → ShipStation Integration Plan

## ✅ IMPLEMENTATION COMPLETE

All phases have been implemented:

### Phase 1: Database Schema ✅
- Created Coffee vendor record (ID: `f8c7d9e6-5a4b-3c2d-1e0f-9a8b7c6d5e4f`)
- Added `coffee_product_id` column to `order_items` with FK constraint
- Added check constraint ensuring either product_id OR coffee_product_id is set

### Phase 2: Checkout Flow ✅
- Updated `create-marketplace-checkout` to query coffee items from cart
- Added coffee line items to Stripe checkout
- Creating `order_items` with `coffee_product_id` for coffee purchases

### Phase 3: ShipStation Sync ✅
- Updated `sync-order-to-shipstation` to join coffee_products table
- Uses `shipstation_sku` from coffee_products for ShipStation orders
- Default weight of 16oz per coffee item

### Phase 4: Auto-Trigger ✅
- Added ShipStation sync call in `verify-marketplace-payment` 
- Placed INSIDE the `payment_status === "paid"` block (safe)
- Runs after Printify trigger, doesn't block payment verification

### Phase 5: Frontend Constants ✅
- Updated COFFEE_VENDOR_ID in:
  - `UnifiedCartSheet.tsx`
  - `CoffeeVendorManager.tsx`  
  - `calculate-shipping-rates/index.ts`

## Order Flow (Now Complete)

```
Cart → Checkout → Stripe Payment → verify-marketplace-payment
                                          ↓
                              (if payment_status === "paid")
                                          ↓
                              ├── Update order to "processing"
                              ├── Decrement inventory
                              ├── Clear cart
                              ├── Trigger Printify (POD items)
                              ├── Trigger ShipStation (coffee + handmade) ← NEW
                              └── Send confirmation emails
```

## Safety Guarantees
- Orders only pushed to ShipStation after payment is confirmed
- No abandoned checkouts reach fulfillment
- Coffee uses proper ShipStation SKUs (e.g., `BDE-GROUND-BB-12`)
