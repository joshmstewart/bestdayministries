# Migration Inventory

This document inventories the Lovable Cloud backend assets that must be recreated or reconfigured in a standalone Supabase project.

**Do not commit secret values to this file.** Use it as a checklist only.

---

## Secrets (28 total)

| Secret Name | Type | Notes |
|-------------|------|-------|
| AFTERSHIP_API_KEY | Manual | AfterShip tracking API |
| CLOUDFLARE_EMAIL_WEBHOOK_SECRET | Manual | Cloudflare inbound email worker |
| EASYPOST_API_KEY_LIVE | Manual | Live Easypost shipping |
| EASYPOST_API_KEY_TEST | Manual | Test Easypost shipping |
| ELEVEN_LABS_API_KEY | Manual | ElevenLabs audio/TTS |
| FIRECRAWL_API_KEY | Connector | Re-link via connectors |
| GOOGLE_PLACES_API_KEY | Manual | Google Places API |
| LOVABLE_API_KEY | Managed | Rotate if still needed |
| MAILTRAP_ACCOUNT_ID | Connector | Re-link via connectors |
| MAILTRAP_API_TOKEN | Connector | Re-link via connectors |
| MAILTRAP_INBOX_ID | Connector | Re-link via connectors |
| MARKETPLACE_STRIPE_SECRET_KEY_LIVE | Manual | Marketplace Stripe live |
| MARKETPLACE_STRIPE_SECRET_KEY_TEST | Manual | Marketplace Stripe test |
| PRINTIFY_API_KEY | Manual | Printify POD |
| RESEND_API_KEY | Manual | Email sending |
| SENTRY_DSN | Manual | Error tracking |
| SHIPSTATION_API_KEY | Manual | ShipStation fulfillment |
| SHIPSTATION_API_SECRET | Manual | ShipStation fulfillment |
| SHOPIFY_ACCESS_TOKEN | Connector | Re-link via connectors |
| SHOPIFY_STOREFRONT_ACCESS_TOKEN | Connector | Re-link via connectors |
| STRIPE_PUBLISHABLE_KEY_LIVE | Manual | Stripe live publishable |
| STRIPE_PUBLISHABLE_KEY_TEST | Manual | Stripe test publishable |
| STRIPE_SECRET_KEY | Manual | Main Stripe secret |
| STRIPE_SECRET_KEY_LIVE | Manual | Main Stripe live secret |
| STRIPE_SECRET_KEY_TEST | Manual | Main Stripe test secret |
| STRIPE_WEBHOOK_SECRET_LIVE | Manual | Stripe live webhook verification |
| STRIPE_WEBHOOK_SECRET_TEST | Manual | Stripe test webhook verification |

**Action:** For each manual secret, copy the value from Lovable Cloud and set it in the new Supabase project with `supabase secrets set NAME=VALUE`.

---

## Edge Functions

There are 228 edge functions in `supabase/functions/`. They deploy as a group with:

```bash
supabase functions deploy
```

Key function categories:

- **Payments:** `stripe-webhook`, `create-donation-checkout`, `create-sponsorship-checkout`, `create-marketplace-checkout`, `verify-marketplace-payment`, `verify-sponsorship-payment`, `process-platform-payout`, `create-vendor-transfer`, `retry-vendor-transfers`
- **Email:** `send-newsletter`, `send-digest-email`, `send-sponsorship-receipt`, `handle-resend-webhook`, `process-inbound-email`, `notify-admin-new-contact`
- **AI:** `lovable-ai`, `generate-*` (images, recipes, workouts, fortunes, etc.)
- **Cron targets:** `reconcile-donations-from-stripe`, `reconcile-marketplace-orders`, `reconcile-bike-pledges`, `sync-donation-history`, `sync-newsletter-analytics`, `process-newsletter-queue`, `process-event-email-queue`, `process-event-update-email-queue`, `check-printify-status`, `retry-vendor-transfers`, `generate-fortune-posts`, `generate-wordle-word-scheduled`, `update-sticker-collections`
- **Webhooks:** `stripe-webhook`, `printify-webhook`, `aftership-webhook`, `sentry-webhook`, `github-test-webhook`, `resend-webhook`

---

## Cron Jobs (16 total)

After migrating, recreate these in the new Supabase SQL Editor. Replace `<NEW_SUPABASE_URL>` and `<NEW_ANON_KEY>` with the new project's values.

```sql
-- check-printify-status-job (every 15 minutes)
SELECT cron.schedule(
  'check-printify-status-job',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := '<NEW_SUPABASE_URL>/functions/v1/check-printify-status',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <NEW_ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- generate-fortune-posts-daily (daily at 07:00)
SELECT cron.schedule(
  'generate-fortune-posts-daily',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := '<NEW_SUPABASE_URL>/functions/v1/generate-fortune-posts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <NEW_ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- generate-wordle-word-daily (daily at 07:05)
SELECT cron.schedule(
  'generate-wordle-word-daily',
  '5 7 * * *',
  $$
  SELECT net.http_post(
    url := '<NEW_SUPABASE_URL>/functions/v1/generate-wordle-word-scheduled',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <NEW_ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- process-event-email-queue-job (every 5 minutes)
SELECT cron.schedule(
  'process-event-email-queue-job',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := '<NEW_SUPABASE_URL>/functions/v1/process-event-email-queue',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <NEW_ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- process-event-update-email-queue-job (every 5 minutes)
SELECT cron.schedule(
  'process-event-update-email-queue-job',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := '<NEW_SUPABASE_URL>/functions/v1/process-event-update-email-queue',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <NEW_ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- process-newsletter-queue-every-minute (every 5 minutes)
SELECT cron.schedule(
  'process-newsletter-queue-every-minute',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := '<NEW_SUPABASE_URL>/functions/v1/process-newsletter-queue',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <NEW_ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- reconcile-bike-pledges-hourly (hourly at :15)
SELECT cron.schedule(
  'reconcile-bike-pledges-hourly',
  '15 * * * *',
  $$
  SELECT net.http_post(
    url := '<NEW_SUPABASE_URL>/functions/v1/reconcile-bike-pledges',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <NEW_ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- reconcile-donations-hourly (hourly at :00)
SELECT cron.schedule(
  'reconcile-donations-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := '<NEW_SUPABASE_URL>/functions/v1/reconcile-donations-from-stripe',
    headers := '{"Content-Type": "application/json", "X-Cron-Secret": "<CRON_SECRET>"}'::jsonb,
    body := '{"mode": "live", "limit": 500}'::jsonb
  ) AS request_id;
  $$
);

-- reconcile-marketplace-orders-job (every 15 minutes)
SELECT cron.schedule(
  'reconcile-marketplace-orders-job',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := '<NEW_SUPABASE_URL>/functions/v1/reconcile-marketplace-orders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <NEW_ANON_KEY>"}'::jsonb,
    body := '{"limit": 100}'::jsonb
  ) AS request_id;
  $$
);

-- retry-vendor-transfers-6hourly (every 6 hours)
SELECT cron.schedule(
  'retry-vendor-transfers-6hourly',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := '<NEW_SUPABASE_URL>/functions/v1/retry-vendor-transfers',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <NEW_ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- send-daily-digest-emails (daily at 08:00)
SELECT cron.schedule(
  'send-daily-digest-emails',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := '<NEW_SUPABASE_URL>/functions/v1/send-digest-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <NEW_ANON_KEY>"}'::jsonb,
    body := '{"frequency": "daily"}'::jsonb
  ) AS request_id;
  $$
);

-- send-weekly-digest-emails (Mondays at 08:00)
SELECT cron.schedule(
  'send-weekly-digest-emails',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url := '<NEW_SUPABASE_URL>/functions/v1/send-digest-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <NEW_ANON_KEY>"}'::jsonb,
    body := '{"frequency": "weekly"}'::jsonb
  ) AS request_id;
  $$
);

-- send-year-end-summaries-daily (daily at 12:00)
SELECT cron.schedule(
  'send-year-end-summaries-daily',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := '<NEW_SUPABASE_URL>/functions/v1/send-batch-year-end-summaries',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <NEW_ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- sync-donation-history-hourly (hourly at :00)
SELECT cron.schedule(
  'sync-donation-history-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := '<NEW_SUPABASE_URL>/functions/v1/sync-donation-history',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <NEW_ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- sync-newsletter-analytics-hourly (hourly at :00)
SELECT cron.schedule(
  'sync-newsletter-analytics-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := '<NEW_SUPABASE_URL>/functions/v1/sync-newsletter-analytics',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <NEW_ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- update-sticker-collections-daily (daily at 07:00)
SELECT cron.schedule(
  'update-sticker-collections-daily',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := '<NEW_SUPABASE_URL>/functions/v1/update-sticker-collections',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <NEW_ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

**Note:** The `reconcile-donations-hourly` job uses `X-Cron-Secret` instead of the anon key. Verify the secret value expected by `reconcile-donations-from-stripe` and set it in the new project.

---

## Storage Buckets (24 total)

| Bucket Name | Public | Notes |
|-------------|--------|-------|
| album-images | true | Community album images |
| app-assets | true | General app assets |
| audio-clips | true | User audio clips |
| avatar-celebration-images | true | Fitness avatar celebration |
| avatars | true | User avatars |
| badge-images | true | Achievement badges |
| beat-pad-audio | true | Beat pad sounds |
| currency-images | true | Coin/currency images |
| daily-bar-icons | true | Daily feature icons |
| discussion-images | true | Discussion post images |
| drink-images | true | Drink creator images |
| event-audio | true | Event audio files |
| event-images | true | Event images |
| featured-bestie-audio | false | Guardian-uploaded audio |
| featured-bestie-images | true | Featured bestie images |
| game-assets | true | Game assets |
| guardian-resources | true | Guardian resource files |
| joy-house-stores | true | Store images |
| newsletter-images | true | Newsletter content images |
| prayer-images | true | Prayer request images |
| profile-avatars | true | Profile avatars |
| recipe-images | true | Recipe images |
| sticker-images | true | Sticker collection images |
| videos | true | Uploaded videos |
| workout-images | true | Workout images |

**Action:** Recreate each bucket in Supabase Storage with the same public/private setting. Re-apply bucket policies after creation.

---

## Database Migrations

There are 739 migration files in `supabase/migrations/`. The current Lovable Cloud database should be exported as a single dump and imported into the new Supabase project. After import, new migrations can be managed with:

```bash
supabase migration new <name>
supabase db push
```

---

## Checklist

- [ ] Request Lovable Cloud database export
- [ ] Create new Supabase project
- [ ] Create new GitHub repo / clone existing
- [ ] Install Supabase CLI and link project
- [ ] Import database dump
- [ ] Verify tables, RLS, policies, triggers
- [ ] Recreate 24 storage buckets with correct public flags
- [ ] Reconfigure auth providers (Email, Google, etc.)
- [ ] Set all manual secrets in new Supabase project
- [ ] Deploy all edge functions
- [ ] Recreate 16 cron jobs
- [ ] Update `.env` with new Supabase credentials
- [ ] Configure frontend hosting (Vercel/Netlify/Cloudflare Pages)
- [ ] Update Stripe webhook endpoints
- [ ] Update Cloudflare email worker URL
- [ ] Update Printify/ShipStation/AfterShip webhooks
- [ ] Stage and test all critical flows
- [ ] Switch DNS to new host
- [ ] Monitor for 48 hours
