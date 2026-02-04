

# Replace Newsletter Webhooks with Direct API Polling

## The Approach You Want
Just like the Stripe reconciliation system, we'll poll the Resend API directly:
- **On-demand button**: "Refresh Stats" in the campaign stats dialog
- **Automatic cron job**: Hourly sync for recent campaigns
- **Visual indicator**: "Last synced: 5 minutes ago"

---

## How It Will Work

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Admin Opens Campaign Stats                     │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  UI shows cached stats + "Last synced: 3 min ago" + [Refresh]   │
└─────────────────────────────────────────────────────────────────┘
                                   │
                      (user clicks Refresh OR cron runs)
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│               sync-newsletter-analytics Edge Function            │
│                                                                   │
│  1. Get emails from newsletter_emails_log (has resend_email_id)  │
│  2. Batch call Resend API: GET /emails/{id}                      │
│  3. Get last_event (delivered, opened, bounced, etc)             │
│  4. Update newsletter_emails_log.status                          │
│  5. Insert/update newsletter_analytics for aggregation           │
│  6. Update campaign.analytics_synced_at timestamp                │
└─────────────────────────────────────────────────────────────────┘
```

---

## What We Already Have (No Changes Needed)

- `newsletter_emails_log.resend_email_id` stores the Resend email ID for every sent email
- `newsletter_campaigns` table can store a `analytics_synced_at` timestamp
- Existing analytics UI in `CampaignStatsDialog` already reads from the data

---

## Technical Implementation

### 1. Database Changes

Add tracking field to know when we last synced:

```sql
ALTER TABLE newsletter_campaigns 
ADD COLUMN analytics_synced_at TIMESTAMP WITH TIME ZONE;
```

### 2. New Edge Function: `sync-newsletter-analytics`

```typescript
// Input: { campaignId: string }
// Process:
// 1. Fetch all newsletter_emails_log records with resend_email_id
// 2. For each email (batched, with 600ms delay to respect rate limit):
//    - Call Resend API: GET /emails/{resend_email_id}
//    - Extract last_event from response
//    - Update newsletter_emails_log.status
//    - Insert into newsletter_analytics if event changed
// 3. Update newsletter_campaigns.analytics_synced_at
```

**Rate Limiting**: Resend allows ~2 requests/second, so we'll use 600ms delay between calls (same pattern as sending).

**For 1,400 emails**: ~14 minutes to sync all stats (acceptable for a manual refresh; cron can do this incrementally).

### 3. Optimization: Sync Only Changed Emails

To speed up syncing, we can:
- Track `last_known_event` in `newsletter_emails_log`
- Skip emails already at terminal state (`delivered`, `bounced`, `complained`)
- Only poll emails with status `sent` or `pending`

For the campaign you just sent:
- 1,405 emails at status `sent`
- All need to be checked (will take ~14 min for full sync)
- Subsequent syncs will be much faster (only pending ones)

### 4. UI Changes (CampaignStatsDialog)

Add to dialog header:

```tsx
<div className="flex items-center gap-2 text-sm text-muted-foreground">
  <span>Last synced: {formatDistanceToNow(analytics_synced_at)} ago</span>
  <Button size="sm" variant="outline" onClick={handleRefresh}>
    <RefreshCw className="h-4 w-4 mr-1" />
    Refresh Stats
  </Button>
</div>
```

Progress indicator while syncing:
- "Syncing... 142/1405 emails checked"
- Toast when complete

### 5. Cron Job

Hourly job to sync recent campaigns (last 7 days):

```sql
SELECT cron.schedule(
  'sync-newsletter-analytics-hourly',
  '0 * * * *', -- Every hour
  $$
  SELECT net.http_post(
    url:='https://nbvijawmjkycyweioglk.supabase.co/functions/v1/sync-newsletter-analytics',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY", "Content-Type": "application/json"}'::jsonb,
    body:='{"mode": "recent"}'::jsonb
  ) as request_id;
  $$
);
```

---

## What Happens to Webhooks?

Keep them as **optional backup** (same philosophy as Stripe):
- They can still update data if they fire
- But we don't rely on them
- Polling is the source of truth

The webhook code stays but the header parsing bug becomes irrelevant because we're not depending on it.

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `supabase/functions/sync-newsletter-analytics/index.ts` | **NEW** - Edge function to poll Resend API |
| `src/components/admin/newsletter/CampaignStatsDialog.tsx` | Add refresh button + last synced indicator |
| Migration | Add `analytics_synced_at` column to `newsletter_campaigns` |
| Database | Create cron job for hourly sync |

---

## Expected Outcome

- **Campaign Stats Dialog**: Shows "Last synced: X ago" with Refresh button
- **Manual Refresh**: Click button → starts sync → shows progress → updates stats
- **Automatic Sync**: Cron job runs hourly for recent campaigns
- **Reliability**: No more missed webhooks, direct API polling as source of truth

