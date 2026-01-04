# ShipStation Integration

## Overview

ShipStation integration for order fulfillment and shipping management. This integration uses **API polling** rather than webhooks to update order statuses.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Order Fulfillment Flow                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Customer Order                                                 │
│       ↓                                                         │
│  sync-order-to-shipstation (push order)                        │
│       ↓                                                         │
│  ShipStation Dashboard (vendor ships)                          │
│       ↓                                                         │
│  poll-shipstation-status (scheduled/manual)                    │
│       ↓                                                         │
│  Update order_items tracking info                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### order_items Columns (ShipStation-specific)

| Column | Type | Purpose |
|--------|------|---------|
| `shipstation_order_id` | integer | ShipStation's internal order ID |
| `shipstation_order_key` | text | Unique key for ShipStation order |
| `shipstation_shipment_id` | integer | ShipStation's shipment ID once shipped |
| `shipstation_synced_at` | timestamptz | When order was pushed to ShipStation |
| `shipstation_last_checked_at` | timestamptz | Last poll time for status updates |

### Indexes

- `idx_order_items_shipstation_order_id` - For order lookups
- `idx_order_items_shipstation_order_key` - For key-based lookups
- `idx_order_items_shipstation_shipment_id` - For shipment queries

## Edge Functions

### sync-order-to-shipstation

**Purpose:** Push order items to ShipStation for fulfillment

**Endpoint:** `POST /functions/v1/sync-order-to-shipstation`

**Authentication:** Required (JWT verified)

**Request Body:**
```json
{
  "orderId": "uuid-of-order"
}
```

**Flow:**
1. Fetch order with items, products, and vendor info
2. Verify order exists and is in valid status
3. Group items by vendor
4. For each vendor group, create ShipStation order:
   - Map product details to ShipStation format
   - Include shipping address from order
   - Set order status to `awaiting_shipment`
5. Store `shipstation_order_id` and `shipstation_order_key` on each order_item
6. Update `shipstation_synced_at` timestamp

**ShipStation Order Mapping:**
```javascript
{
  orderNumber: `JH-${orderId.slice(0, 8)}-${vendorId.slice(0, 4)}`,
  orderKey: `${orderId}-${vendorId}`,
  orderDate: order.created_at,
  orderStatus: "awaiting_shipment",
  customerEmail: customer.email,
  billTo: { ... },
  shipTo: { ... },
  items: [
    {
      sku: product.sku || product.id,
      name: product.name,
      quantity: item.quantity,
      unitPrice: item.price_at_purchase,
      imageUrl: product.images[0]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "vendorId": "uuid",
      "shipstationOrderId": 123456,
      "shipstationOrderKey": "order-uuid-vendor-uuid"
    }
  ]
}
```

### poll-shipstation-status

**Purpose:** Poll ShipStation API for shipment status updates

**Endpoint:** `POST /functions/v1/poll-shipstation-status`

**Authentication:** Required (JWT verified)

**Request Body (optional):**
```json
{
  "orderId": "uuid-of-specific-order"
}
```

If `orderId` is omitted, polls ALL unshipped items synced to ShipStation.

**Flow:**
1. Query order_items that:
   - Have `shipstation_order_id` set
   - Have `fulfillment_status` = 'pending' or 'shipped' (not delivered)
2. For each item, query ShipStation shipments:
   - GET `/shipments?orderNumber={orderNumber}`
3. If shipment found:
   - Update `tracking_number`, `carrier`, `tracking_url`
   - Update `shipstation_shipment_id`
   - Set `fulfillment_status` to 'shipped' or 'delivered' based on status
4. Update `shipstation_last_checked_at` for all checked items

**Scheduling Options:**
- Manual: Admin triggers from dashboard
- Scheduled: Add to `supabase/config.toml`:
  ```toml
  [functions.poll-shipstation-status]
  verify_jwt = false
  schedule = "*/30 * * * *"  # Every 30 minutes
  ```

**Response:**
```json
{
  "success": true,
  "checked": 5,
  "updated": 2,
  "results": [
    {
      "orderItemId": "uuid",
      "trackingNumber": "1Z999AA10123456784",
      "carrier": "ups",
      "status": "shipped"
    }
  ]
}
```

## Secrets Required

| Secret | Purpose | How to Get |
|--------|---------|------------|
| `SHIPSTATION_API_KEY` | API authentication | ShipStation → Settings → API Settings |
| `SHIPSTATION_API_SECRET` | API authentication | ShipStation → Settings → API Settings |

**Note:** These secrets are NOT yet configured. Contact ShipStation account holder to obtain.

## ShipStation API Reference

### Authentication

Uses HTTP Basic Auth with API Key as username and API Secret as password:

```javascript
const authHeader = btoa(`${apiKey}:${apiSecret}`);
headers: {
  'Authorization': `Basic ${authHeader}`,
  'Content-Type': 'application/json'
}
```

### Base URL

```
https://ssapi.shipstation.com
```

### Key Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/orders/createorder` | POST | Create new order |
| `/shipments` | GET | List shipments (with filters) |
| `/orders/{orderId}` | GET | Get order details |

### Rate Limits

- 40 requests per minute (partner accounts)
- Check response headers for limits:
  - `X-Rate-Limit-Limit`
  - `X-Rate-Limit-Remaining`
  - `X-Rate-Limit-Reset`

## Status Mapping

### ShipStation → order_items.fulfillment_status

| ShipStation Status | App Status |
|-------------------|------------|
| `awaiting_shipment` | pending |
| `shipped` | shipped |
| `delivered` | delivered |
| `cancelled` | (no change - handle manually) |

### ShipStation Order Statuses

- `awaiting_payment`
- `awaiting_shipment`
- `shipped`
- `on_hold`
- `cancelled`

## Carrier Mapping

Common carriers returned by ShipStation:

| Carrier Code | Display Name |
|--------------|--------------|
| `stamps_com` | USPS |
| `ups` | UPS |
| `ups_walleted` | UPS |
| `fedex` | FedEx |
| `dhl_express` | DHL |
| `dhl_ecommerce` | DHL eCommerce |

## Implementation Decisions

### Why API Polling Over Webhooks

1. **Simpler Setup:** No webhook endpoint configuration needed
2. **More Control:** Poll when needed, not on ShipStation's schedule
3. **Easier Debugging:** Can manually trigger and see results
4. **Reliability:** No missed webhooks, can always re-poll
5. **User Preference:** Explicitly requested by project owner

### Vendor Grouping

Orders are split by vendor because:
- Each vendor may use different ShipStation stores
- Tracking is per-vendor, not per-order
- Allows partial fulfillment

## Future Enhancements

### Not Yet Implemented

- [ ] Admin UI for manual sync trigger
- [ ] Admin UI for status polling trigger
- [ ] Scheduled polling (cron configuration)
- [ ] Email notifications on shipment
- [ ] Rate limit handling with backoff
- [ ] Multiple ShipStation stores per vendor

### Considerations

- **Multiple Stores:** If vendors have separate ShipStation stores, will need store ID mapping
- **Automation:** Could add trigger on order creation to auto-sync
- **Notifications:** Could integrate with notification system for shipping emails

## Troubleshooting

### Order Not Appearing in ShipStation

1. Check `shipstation_synced_at` is set
2. Verify API credentials are correct
3. Check edge function logs for errors
4. Ensure order has valid shipping address

### Tracking Not Updating

1. Check `shipstation_last_checked_at`
2. Verify shipment exists in ShipStation dashboard
3. Run manual poll with specific orderId
4. Check for rate limiting in logs

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid API credentials | Check/update secrets |
| 429 Too Many Requests | Rate limited | Wait and retry, or batch requests |
| 400 Bad Request | Invalid order data | Check shipping address format |

## Related Documentation

- `MARKETPLACE_CHECKOUT_SYSTEM.md` - Full store documentation
- `EDGE_FUNCTIONS_REFERENCE.md` - All edge functions
- `ORDER_TRACKING.md` - AfterShip integration (alternative)
