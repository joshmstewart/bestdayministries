

# Bike Ride Pledge Fundraiser

## Overview
A fundraiser where supporters pledge cents-per-mile OR make a flat donation for a specific bike ride event. The ride has a known maximum distance (e.g., 118 miles), so pledgers always see their maximum possible total upfront. After the ride, an admin enters actual miles ridden and the system charges all per-mile pledgers.

## How It Works

```text
BEFORE THE RIDE              AFTER THE RIDE              CHARGE PHASE
-----------------            ----------------            ---------------
- Admin creates event        - Admin enters actual       - System calculates:
  (title, date, max miles)     miles ridden (e.g., 98)     cents_per_mile x
- Supporters pledge                                        actual_miles
  e.g., $0.25/mile                                       - Charges saved cards
- UI shows "up to $29.50"                                - Sends receipts
  (based on 118 mile max)
- Card saved via Stripe
  Setup Intent (no charge)
```

## The Natural Cap

The event's `mile_goal` (e.g., 118 miles) serves as the maximum possible charge. No separate cap field needed.

- Pledger sets: 25 cents/mile
- UI displays: "Up to $29.50" (0.25 x 118)
- Actual charge after ride: 0.25 x actual_miles (which is always less than or equal to mile_goal)
- The `process-bike-ride-charges` edge function enforces: `actual_miles` cannot exceed `mile_goal`

## Pledge Types

1. **Per-mile pledge**: Card saved now, charged after the ride based on actual miles
2. **Flat donation**: Charged immediately via existing donation checkout flow

## Database

### `bike_ride_events` table
- id, title, description, rider_name, ride_date
- mile_goal (numeric) -- the max possible miles (e.g., 118)
- actual_miles (numeric, nullable) -- filled after ride
- status: draft / active / completed / charges_processed
- cover_image_url, is_active, created_by, timestamps

### `bike_ride_pledges` table
- id, event_id (FK), pledger_email, pledger_name, pledger_user_id (nullable)
- pledge_type: "per_mile" or "flat"
- cents_per_mile (numeric, nullable) -- e.g., 25 means $0.25/mile
- flat_amount (numeric, nullable) -- for flat donations
- calculated_total (numeric, nullable) -- filled when charges processed
- stripe_customer_id, stripe_setup_intent_id, stripe_payment_method_id
- stripe_payment_intent_id (filled after charge)
- charge_status: pending / charged / failed
- stripe_mode: test / live
- message (optional encouragement text)
- created_at

## Edge Functions

### 1. `create-bike-pledge`
- Creates Stripe Setup Intent (saves card, no charge)
- Stores pledge details in database
- For flat donations: redirects to existing donation checkout with event metadata

### 2. `process-bike-ride-charges` (admin-only)
- Takes event_id and actual_miles
- Validates actual_miles does not exceed mile_goal
- For each per-mile pledge: calculates total, creates PaymentIntent with saved payment method
- Updates pledge records with charge results
- Returns summary of successes/failures

### 3. `get-bike-ride-status` (public)
- Returns event details and aggregate stats
- Total pledgers, estimated total at mile goal, supporter messages

## Frontend

### Public Page: `/bike-ride-pledge`
- Hero with ride details (who, when, how far)
- Live stats: X pledgers, estimated $Y at goal
- Pledge form:
  - Per-mile: slider/input for cents per mile (range: 5 cents to $5.00)
  - Shows calculated "up to $XX.XX" based on mile_goal in real-time
  - Flat: dollar amount input
- Stripe card form (Setup Intent for per-mile)
- Wall of supporter messages
- Progress indicator

### Admin UI (under Admin panel)
- Create/edit bike ride events
- View all pledges
- Enter actual miles after ride completion
- "Process Charges" button with confirmation showing:
  - Number of pledgers to charge
  - Total amount to be collected
  - Breakdown of each pledge
- Results dashboard (successful/failed charges)

## Security
- RLS: events visible to all authenticated users; pledges visible to own + admins; admin-only for create/update/delete events and processing charges
- `payment_method_id` only stored server-side, protected by RLS
- Charges executed only by admin edge function
- `actual_miles` validated to never exceed `mile_goal`
- Amount calculated server-side from database values, never from client input

## Implementation Order
1. Database tables + RLS policies
2. `create-bike-pledge` edge function (Setup Intent flow)
3. Public pledge page UI with real-time "up to" calculation
4. `get-bike-ride-status` edge function
5. `process-bike-ride-charges` edge function
6. Admin management UI
7. Post-charge email notifications (reuses existing Resend setup)
