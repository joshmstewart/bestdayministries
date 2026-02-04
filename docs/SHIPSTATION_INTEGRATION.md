# ShipStation Integration

## Overview

ShipStation integration for order fulfillment and shipping management. This integration uses **API polling** for status updates and **real-time rate calculation** for coffee shipping estimates.

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

┌─────────────────────────────────────────────────────────────────┐
│               Coffee Shipping Rate Calculation                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Cart: Customer enters ZIP                                      │
│       ↓                                                         │
│  calculate-shipping-rates (edge function)                       │
│       ↓                                                         │
│  ShipStation getrates API                                       │
│       ↓                                                         │
│  Return rate (USPS for 1 bag, UPS for 2+)                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Coffee Shipping Logic

### Carrier Selection
- **1 bag**: USPS (single 12oz bag - small, light package)
- **2+ bags**: UPS (better rates for heavier packages)

### Box Configurations

| Bags | Box Size (LxWxH) | Box Weight | Use Case |
|------|------------------|------------|----------|
| 1-3  | 6x6x7"          | 3.5 oz     | Small orders |
| 4-6  | 10x8x6"         | 7.0 oz     | Medium orders |
| 7-9  | 12x10x6"        | 10.0 oz    | Large orders |
| 10+  | 16x12x10"       | 14.0 oz    | Bulk orders |

### Weight Calculation
- Each 12oz coffee bag: 12 oz
- Total weight = (bag count × 12 oz) + box weight

### Origin
- Ships from ZIP: 28036 (Davidson, NC)
- Processing: Same day or next business day

## Database Schema

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

### calculate-shipping-rates (Coffee)

**Purpose:** Get real-time shipping rates for coffee orders using ShipStation's rate calculator

**Endpoint:** `POST /functions/v1/calculate-shipping-rates`

**Coffee-Specific Logic:**
1. Count total bags in cart
2. Determine box size based on quantity
3. Calculate total weight (bags × 12oz + box weight)
4. Select carrier: USPS (1 bag) or UPS (2+ bags)
5. Call ShipStation `/shipments/getrates` API
6. Return cheapest rate

**Example Response (coffee portion):**
```json
{
  "vendor_id": "f8c7d9e6-5a4b-3c2d-1e0f-9a8b7c6d5e4f",
  "vendor_name": "Best Day Ever Coffee",
  "subtotal_cents": 3900,
  "shipping_cents": 899,
  "shipping_method": "calculated",
  "service_name": "UPS Ground",
  "carrier": "UPS",
  "estimated_days": 3
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
