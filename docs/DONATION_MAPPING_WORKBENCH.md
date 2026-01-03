# Donation Mapping Workbench

A backend-assisted admin tool to **show literally everything** (Stripe + database) for a single **email + date window** so you can manually map which objects belong together.

## Where it lives
- Admin → Data Maintenance → Debug → **Mapping**

## What it does
Given:
- `email`
- `date` (YYYY-MM-DD)
- `timezone` (local timezone selection)
- `stripe_mode` (live/test)

It returns:
- All relevant Stripe objects for that day window (charges, invoices, checkout sessions, payment intents, subscriptions)
- All relevant database rows for that same window (profiles, donations, sponsorships, receipts, orders, order_items, caches)
- A lightweight auto-link map for manual inspection (by `payment_intent_id` and `order_id`)
- A UI workflow to manually group related items and export a JSON payload

## Key edge function
- `donation-mapping-snapshot` (Admin only)
  - Input: `{ email, date, timezone, stripe_mode }`
  - Output: `{ window, customerIds, stripe.items[], database.*, links.* }`

## Notes
- Email is normalized to lowercase for matching (Stripe/DB can be case-sensitive).
- If Stripe customers are missing for an email, the snapshot attempts email-based Stripe searches to still surface guest checkouts.
