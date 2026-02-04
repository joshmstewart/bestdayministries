

# Newsletter Reliability & Safeguards Implementation Plan

## Root Cause Analysis

### Why Your Newsletter Isn't Sending

**The cron job for `process-newsletter-queue` was never registered in the database.** 

While `supabase/config.toml` has the schedule defined (`schedule = "* * * * *"`), this only instructs Supabase CLI to deploy with that schedule—it doesn't automatically create the `pg_cron` job in the database. Currently, only these cron jobs exist:
- `process-event-email-queue` (registered)
- `process-event-update-email-queue` (registered)

The newsletter queue processor is missing, which is why emails sit in `pending` status indefinitely until manually triggered.

---

## Implementation Plan

### 1. Register the Missing Cron Job (Critical Fix)

Add the `pg_cron` job for `process-newsletter-queue` to run every minute:

```sql
SELECT cron.schedule(
  'process-newsletter-queue-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://nbvijawmjkycyweioglk.supabase.co/functions/v1/process-newsletter-queue',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idmlqYXdtamt5Y3l3ZWlvZ2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNDQzMzQsImV4cCI6MjA3NDgyMDMzNH0.EObXDkA1xo4bTzYwgHAQ1m1M6IWpHwFmeSvB4RE2NO8"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

---

### 2. Add "Retry Failed" Button to Admin UI

**Location:** `NewsletterCampaigns.tsx` — displayed for campaigns with `failed_count > 0`

**Functionality:**
- Resets failed queue items back to `pending` status
- Resets their `attempts` counter
- Updates campaign status back to `sending`
- The cron job will automatically pick them up

**UI Element:**
```text
[↻ Retry 3 Failed] — Orange/warning button shown next to "View Stats"
```

---

### 3. Add "Resume Sending" Button for Stuck Campaigns

**Location:** `NewsletterCampaigns.tsx` — displayed for `status = 'sending'` campaigns that have pending queue items but haven't progressed in 5+ minutes

**Functionality:**
- Manually triggers `process-newsletter-queue` edge function
- Useful if cron job has issues or for immediate processing

**UI Element:**
```text
[▶ Resume Sending] — Shown when campaign is stuck in "sending" state
```

---

### 4. Add Maximum Retry Attempts with Automatic Failure

**Location:** `process-newsletter-queue/index.ts`

**Change:** Before processing each email, check if `attempts >= 3` and automatically mark as permanently failed:

```typescript
// Skip if max retries exceeded
if (queueItem.attempts >= 3) {
  await supabaseClient
    .from("newsletter_email_queue")
    .update({
      status: "permanently_failed",
      error_message: "Max retry attempts exceeded",
      processed_at: new Date().toISOString(),
    })
    .eq("id", queueItem.id);
  continue;
}
```

---

### 5. Database Schema Enhancement

Add a `max_attempts` column with default value for future configurability:

```sql
ALTER TABLE newsletter_email_queue 
ADD COLUMN IF NOT EXISTS max_attempts integer DEFAULT 3;
```

---

### 6. UI Improvements for Campaign Progress

**Enhanced Progress Display:**
- Show "Pending | Sent | Failed" breakdown
- Add estimated completion time based on queue size
- Show last activity timestamp
- Add pulsing indicator when actively processing

**Example:**
```text
Sending: 45 / 100 (2 failed)
├─ Last activity: 30 seconds ago
└─ Est. completion: ~1 min
```

---

## File Changes Summary

| File | Change |
|------|--------|
| `pg_cron` (database) | Register `process-newsletter-queue` cron job |
| `NewsletterCampaigns.tsx` | Add Retry Failed and Resume Sending buttons |
| `CampaignActions.tsx` | Add retry and resume action handlers |
| `process-newsletter-queue/index.ts` | Add max retry check, improve logging |
| Database migration | Add `max_attempts` column |

---

## Technical Details

### Retry Failed Email Handler
```typescript
const handleRetryFailed = async (campaignId: string) => {
  // Reset failed queue items to pending
  await supabase
    .from("newsletter_email_queue")
    .update({ 
      status: "pending", 
      attempts: 0,
      error_message: null 
    })
    .eq("campaign_id", campaignId)
    .eq("status", "failed");

  // Update campaign status and reset failed count
  await supabase
    .from("newsletter_campaigns")
    .update({ 
      status: "sending",
      failed_count: 0 
    })
    .eq("id", campaignId);
};
```

### Resume Sending Handler
```typescript
const handleResumeSending = async (campaignId: string) => {
  // Manually trigger the queue processor
  await supabase.functions.invoke("process-newsletter-queue", {
    body: { campaignId } // Optional filter
  });
};
```

---

## Immediate Action

After approval, I will:
1. Register the cron job in the database (fixes root cause)
2. Manually process the 2 pending emails for your current campaign
3. Implement all UI safeguards

This ensures your newsletter sends immediately AND prevents future stuck campaigns.

