
## Problem

The live page at `/bike-ride-pledge` is showing test pledge data (the "JJ / Bulbasaur" entry). This happens because the `get-bike-ride-status` edge function fetches ALL confirmed pledges without filtering by `stripe_mode`. The "JJ" pledge has `stripe_mode: test` but `charge_status: confirmed`, so it shows up alongside real live pledges.

## Root Cause

In `get-bike-ride-status/index.ts` (line 46-48), the pledge query only filters by `event_id` -- it does NOT filter by `stripe_mode`:

```typescript
const { data: pledges } = await supabaseAdmin
  .from('bike_ride_pledges')
  .select('...')
  .eq('event_id', event.id);
// Missing: .eq('stripe_mode', currentMode)
```

## Solution

**1. Update `get-bike-ride-status` edge function** to accept a `force_test_mode` parameter (consistent with the other bike ride functions) and filter pledges by the appropriate `stripe_mode`:

- Accept `force_test_mode` from the request body (same pattern as `get-stripe-publishable-key`)
- Determine the current mode (`test` or `live`) from `app_settings` or the override
- Add `.eq('stripe_mode', mode)` to the pledges query

**2. Update `BikeRidePledge.tsx`** to pass `force_test_mode` when calling `get-bike-ride-status`, so the test page sees test pledges and the live page sees only live pledges.

## Technical Details

### Edge function change (`get-bike-ride-status/index.ts`)
- Read request body for `force_test_mode` flag (with try/catch for empty body, same pattern as `get-stripe-publishable-key`)
- Query `app_settings` for `stripe_mode` if not forced
- Add `.eq('stripe_mode', mode)` to the pledges query on line 48

### Frontend change (`BikeRidePledge.tsx`)
- In `fetchEventStatus`, pass `{ body: forceTestMode ? { force_test_mode: true } : undefined }` to the function invocation (matching the existing pattern used for `get-stripe-publishable-key`)

## Impact
- Live page: only shows pledges made with live Stripe keys
- Test page (`?test=true`): only shows pledges made with test Stripe keys
- No data loss -- existing pledges are unchanged, just filtered by mode
