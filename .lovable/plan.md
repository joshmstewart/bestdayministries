
PRE-CHANGE CHECKLIST:
□ Searched docs for: resend-webhook, newsletter_analytics, opened event not showing, sync-newsletter-analytics
□ Read files: supabase/functions/resend-webhook/index.ts; supabase/functions/process-newsletter-queue/index.ts; supabase/functions/track-newsletter-click/index.ts; supabase/functions/sync-newsletter-analytics/index.ts; src/components/admin/newsletter/CampaignStatsDialog.tsx; src/components/admin/newsletter/NewsletterAnalytics.tsx; docs/NEWSLETTER_SYSTEM.md (issues section)
□ Searched code for: data.headers, X-Campaign-ID, skipping newsletter analytics, newsletter_analytics insert, Refresh Stats, email_audit_log
□ Found patterns: yes — “sent” is logged by process-newsletter-queue; “clicked” is logged by track-newsletter-click; delivered/opened are intended to come from resend-webhook
□ Ready: yes

## What actually explains “WHERE IS THE DATA??” (no assumptions about you changing anything)

You are right to be furious about the “you must have changed the webhook” assumption. The evidence in *our own logs and code* points to a different root cause:

### Root cause: our webhook handler is failing to read the campaign header format Resend sends
In `supabase/functions/resend-webhook/index.ts` we do:

- `const campaignId = data.headers?.["X-Campaign-ID"];`  (line ~27)
- If it’s missing, we **return early** and do not write to `newsletter_analytics`:
  - `if (!campaignId) { console.log("...skipping newsletter analytics"); return ... }` (line ~85)

But the webhook payload shown in your logs has headers as an **array** like:

```json
"headers": [
  { "name": "X-Campaign-ID", "value": "..." },
  { "name": "X-Subscriber-ID", "value": "..." }
]
```

An array does **not** support `data.headers["X-Campaign-ID"]`, so `campaignId` becomes `undefined`, and the function exits with “skipping newsletter analytics”.

That is why, even with webhooks correctly configured and firing, the app is dropping delivered/opened/bounced/complained events on the floor.

### Why you still see “Sent” and “Clicked” numbers
Those are coming from different pipelines that do not rely on Resend’s webhook:

1) **Sent** events are inserted by our queue processor:
- `supabase/functions/process-newsletter-queue/index.ts` inserts into `newsletter_analytics` with `event_type: "sent"` (lines ~180–186)

2) **Clicked** events are inserted by our tracking redirect:
- `supabase/functions/track-newsletter-click/index.ts` inserts `event_type: "clicked"` (lines ~40–54)

So the database ends up with exactly what we’re seeing right now:
- `newsletter_analytics`: only `sent` + `clicked` (confirmed by DB query)
- `delivered/opened`: missing because `resend-webhook` is skipping campaign analytics due to header parsing mismatch

### Confirmation from current database state (right now)
- `newsletter_analytics` event types present: `sent=1418`, `clicked=133` (no delivered/opened at all)
- For the campaign `3e915415-e0a0-4ce0-8b2b-a5cf1470e5d9` (“Newsletter Feb 26 FINAL”): `sent=1405`, `clicked=105`, and **0 delivered/opened**

This matches the behavior of “sent + click tracking works, webhook campaign analytics skipped”.

---

## What we should change (implementation)

### A) Fix `resend-webhook` to correctly extract headers (array OR object)
Update the webhook function to support BOTH shapes:

- If `data.headers` is an array: find the entry whose `.name` equals `X-Campaign-ID` / `X-Subscriber-ID` (case-insensitive), read `.value`.
- If `data.headers` is an object: keep supporting `data.headers["X-Campaign-ID"]`.

This alone should stop the “skipping newsletter analytics” early-return.

### B) Add a second, more reliable fallback: derive campaignId by looking up `newsletter_emails_log` via `data.email_id`
Even with correct header parsing, a fallback makes the system robust:

- When webhook arrives and `data.email_id` exists:
  - Query `newsletter_emails_log` where `resend_email_id = data.email_id`
  - If found, use `campaign_id` from that row even if headers are missing
  - Optionally pull subscriber_id from `newsletter_emails_log.metadata.subscriber_id` if present

This avoids losing analytics if headers change again or if some sends don’t include custom headers.

### C) Ensure the webhook actually writes delivered/opened events into `newsletter_analytics`
Once campaignId is resolved, insert rows into `newsletter_analytics` for:
- delivered
- opened
- bounced
- complained
- failed
- (and clicked if we want redundancy)

Note: Open tracking may still be lower than reality due to privacy protections (Apple Mail Privacy Protection, Gmail image proxying), but it should no longer be “zero because we dropped the events”.

---

## Backfilling the first newsletter (what is and isn’t possible)

### Important reality check
Because we currently did **not** store those webhook events anywhere (and `email_audit_log` does not contain newsletter rows in this database), we likely cannot reconstruct delivered/opened for past sends from our own database alone.

So backfill options are:

1) **If your Resend plan upgrade unlocks the needed API endpoints**:
   - Implement a real backfill in `sync-newsletter-analytics`:
     - For each `newsletter_emails_log.resend_email_id` in a campaign:
       - Call Resend “retrieve email / events” API
       - Insert corresponding delivered/opened/bounced/complained rows into `newsletter_analytics`
     - Update `newsletter_campaigns.analytics_synced_at`
   - This would let you learn from the first newsletter without relying on webhooks for history.

2) **If the API is not available / not worth it**:
   - We can only track going forward (after fixing the webhook handler).

### Also: small bug in our “Refresh Stats” UI
`CampaignStatsDialog.tsx` toasts `data.totalUpdated`, but `sync-newsletter-analytics` currently returns `{ success, eventCounts, ... }` and does not include `totalUpdated`. We should align response shape so the UI isn’t misleading while you’re troubleshooting.

---

## Step-by-step implementation sequence (safe + testable)

1) Patch `supabase/functions/resend-webhook/index.ts`
   - Implement header extraction that supports array/object formats
   - Add fallback lookup by `newsletter_emails_log` using `data.email_id`
   - Add logs like:
     - resolvedCampaignId source: header-array | header-object | email-log-lookup
     - when inserting analytics event, log event_type + campaign_id (no PII)

2) Patch `supabase/functions/sync-newsletter-analytics/index.ts` (optional, depending on backfill decision)
   - If you’re upgrading: implement Resend API backfill per resend_email_id
   - If not upgrading: update it to clearly explain “no backfill possible without API”, and fix return shape (`totalUpdated`)

3) Patch UI messaging (optional)
   - In CampaignStatsDialog, if delivered/opened are 0 but sent is large, show a small note:
     - “Delivered/Opened require webhook processing; open tracking may be impacted by privacy features.”

---

## How we’ll verify (end-to-end)

1) Send a small test campaign to 2–3 addresses
2) Wait for webhook events:
   - delivered should start appearing in `newsletter_analytics` for that campaign
3) Open the Campaign Stats dialog:
   - Delivered count should be > 0
   - Click a tracked link:
     - Click count should still increase (and now optionally also via webhook “clicked” if enabled)
4) Confirm no more “skipping newsletter analytics” logs in the webhook function

---

## Decision points (so we build the right thing)

1) Do you want backfill for the first newsletter to be:
   - (a) totals only (delivered/opened/clicked per campaign), or
   - (b) per-recipient detail (who bounced, who opened), if the API supports it?

2) Are you planning to upgrade specifically to run a one-time backfill, then downgrade?
   - If yes, we’ll prioritize implementing the API-based `sync-newsletter-analytics` backfill immediately after the webhook fix so you can do the historical analysis while the plan is active.
