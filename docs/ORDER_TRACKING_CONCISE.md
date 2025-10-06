# ORDER TRACKING SYSTEM

## Overview
Vendors manually enter tracking info via AfterShip integration. Customers view tracking details and click through to AfterShip for live updates.

## Database Schema

**order_items** (Tracking Fields):
- `tracking_number`, `carrier`, `tracking_url`
- `fulfillment_status` (pending/shipped/delivered)
- `shipped_at`, `delivered_at`
- `vendor_id`, `platform_fee`, `vendor_payout`, `stripe_transfer_id`

**orders**:
- `id`, `customer_id`, `total_amount`, `status` (pending/completed/cancelled)
- `shipping_address` (JSONB), `billing_address` (JSONB)
- `stripe_payment_intent_id`, `notes`

## Edge Functions

**submit-tracking**
- **Auth:** Yes (vendor must own order item)
- **Request:** `{orderItemId, trackingNumber, carrier}`
- **Flow:**
  1. Verify vendor ownership
  2. Call AfterShip API to create tracking
  3. Update `order_items` with tracking data
  4. Set `fulfillment_status: 'shipped'`, `shipped_at: now()`
- **Response:** `{success, tracking: {trackingNumber, carrier, trackingUrl}}`

**aftership-webhook** ⚠️ NOT FUNCTIONAL
- **Status:** Blocked - requires upgraded AfterShip account
- **Future Flow:** Receive status updates → update `fulfillment_status` → set `delivered_at`

## Frontend Components

**VendorOrderDetails** (`src/components/vendor/VendorOrderDetails.tsx`)
- Vendor Dashboard → Orders → View Details
- **Pending items:** Input tracking number + carrier dropdown → "Mark as Shipped"
- **Shipped items:** Display tracking (read-only) + carrier badge + "Mark as Delivered" (fallback)

**OrderHistory** (`src/pages/OrderHistory.tsx`)
- Route: `/orders`
- **Display:** Order cards with ID, date, status, shipping address, items, fulfillment badges
- **Tracking:** Shows tracking number + carrier + "Track Package" button (opens `tracking_url`)

## Configuration

**AfterShip API:**
- Secret: `AFTERSHIP_API_KEY`
- Base URL: `https://api.aftership.com/v4`
- Endpoint: `POST /trackings`
- Supported carriers: UPS, USPS, FedEx, DHL (1000+ available)

**Edge Function Config:**
```toml
[functions.submit-tracking]
verify_jwt = true

[functions.aftership-webhook]
verify_jwt = false  # Uses AfterShip signature
```

## Status Badge Colors
- **Order:** pending (yellow), completed (green), cancelled (red)
- **Fulfillment:** pending (yellow), shipped (blue), delivered (green)

## Implemented Features ✅
- Manual tracking submission (vendor → database → AfterShip)
- Customer tracking view (`/orders` page with AfterShip links)
- Vendor fulfillment workflow (mark shipped/delivered)
- Full database structure with timestamps

## Not Implemented ❌
- AfterShip webhooks (automatic status updates)
- Email notifications (shipping/delivery confirmations)
- In-app tracking timeline, multi-tracking per item, returns
- Analytics (delivery times, success rates)

## Security (RLS)
- **order_items:** Vendors UPDATE/SELECT their items, Customers SELECT their orders
- **orders:** Customers SELECT their orders, Vendors SELECT orders with their products, Admins ALL
- No DELETE allowed (audit trail)

## Troubleshooting
| Issue | Fix |
|-------|-----|
| Tracking submission fails | Verify `AFTERSHIP_API_KEY`, carrier slug, tracking format |
| Customer can't see tracking | Check `fulfillment_status` = 'shipped', `tracking_url` saved |
| Webhook not working | Known issue - requires AfterShip account upgrade |

## Future Enhancements
When webhooks available: Automatic status sync, email triggers, exception handling, in-app timeline
