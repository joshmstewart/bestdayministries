# Edge Functions Quick Reference

Complete index of all edge functions with authentication, dependencies, and key capabilities.

## Standard Import Versions

**Use these standardized versions for all edge functions:**
```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import Stripe from "https://esm.sh/stripe@18.5.0";
```

---

## By Category

### Authentication & User Management
- **`record-terms-acceptance`** - [Auth Required] Records terms acceptance with IP, user agent, timestamp audit trail
- **`create-user`** - [Admin Only] Creates new user accounts for testing/development

### Payments & Donations
- **`create-donation-checkout`** - [Public] Creates Stripe checkout for one-time and recurring donations
- **`create-sponsorship-checkout`** - [Public] Creates Stripe checkout for bestie sponsorships
- **`stripe-webhook`** - [Webhook] Handles all Stripe events (dual mode: test/live)
- **`manage-sponsorship`** - [Auth Required] Customer portal for managing subscriptions
- **`update-sponsorship`** - [Auth Required] Updates sponsorship tier/amount
- **`generate-receipts`** - [Cron] Batch generates monthly sponsorship receipts
- **`send-sponsorship-receipt`** - [Internal] Sends individual tax-deductible receipts
- **`generate-year-end-summary`** - [Cron] Creates annual giving summaries for tax purposes
- **`verify-sponsorship-payment`** - [Webhook] Verifies Stripe checkout completion

### Email & Notifications
- **`send-notification-email`** - [Internal] Sends individual notification emails via Resend
- **`send-digest-email`** - [Cron] Sends batched digest emails (daily/weekly)
- **`send-approval-notification`** - [Internal] Notifies guardians of pending approvals
- **`send-message-notification`** - [Internal] Notifies about new sponsor messages
- **`send-contact-reply`** - [Auth Required] Sends admin replies to contact form submissions
- **`notify-admin-new-contact`** - [Internal] Notifies admins of new contact form submissions
- **`process-inbound-email`** - [Webhook] Processes CloudFlare email routing, auto-threads replies
- **`send-newsletter`** - [Admin Only] Sends newsletter campaigns to subscribers
- **`send-test-newsletter`** - [Admin Only] Sends test newsletter to admin before campaign
- **`send-automated-campaign`** - [Admin Only] Sends automated marketing campaigns via Resend

### Content Moderation
- **`moderate-content`** - [Auth Required] AI text moderation via Lovable AI (Gemini)
- **`moderate-image`** - [Auth Required] AI image moderation via Lovable AI (Gemini Vision)

### Order & Vendor Management
- **`submit-tracking`** - [Vendor Auth] Submits order tracking via AfterShip API
- **`aftership-webhook`** - [Webhook] Receives AfterShip tracking updates (⚠️ NOT FUNCTIONAL)
- **`broadcast-product-update`** - [Admin Only] Sends notifications to all users about product updates

### Testing & Development
- **`create-persistent-test-accounts`** - [Admin Only] Creates/verifies persistent test accounts (PROTECTED from cleanup)
- **`seed-email-test-data`** - [Test Only] Seeds test users and data for email testing
- **`cleanup-email-test-data`** - [Test Only] Removes test data by email prefix
- **`cleanup-test-data-unified`** - [Test Only] Unified cleanup for email and E2E tests (excludes persistent accounts)
- **`seed-halloween-stickers`** - [Admin Only] Seeds Halloween sticker collection for testing

### Webhooks & Integrations
- **`github-test-webhook`** - [Webhook] Receives GitHub Actions test results, logs to `test_runs`
- **`sentry-webhook`** - [Webhook] Receives Sentry error alerts, logs to `error_logs`
- **`resend-webhook`** - [Webhook] Receives Resend email events (delivered, bounced, etc.)

### Utility Functions
- **`get-sentry-dsn`** - [Public] Returns Sentry DSN for client-side error tracking
- **`get-google-places-key`** - [Public] Returns Google Places API key for location autocomplete

---

## Alphabetical Index

| Function | Auth | Dependencies | Purpose |
|----------|------|--------------|---------|
| aftership-webhook | Webhook | AfterShip | ⚠️ NOT FUNCTIONAL - Receives tracking updates |
| broadcast-product-update | Admin | Supabase | Sends product update notifications |
| cleanup-email-test-data | Test | Supabase | Removes email test data |
| cleanup-test-data-unified | Test | Supabase | Unified test data cleanup (excludes persistent accounts) |
| create-donation-checkout | Public | Stripe | Creates donation checkout session |
| create-persistent-test-accounts | Admin | Supabase | Creates/verifies persistent test accounts |
| create-sponsorship-checkout | Public | Stripe | Creates sponsorship checkout session |
| create-user | Admin | Supabase | Creates test user accounts |
| generate-receipts | Cron | Resend, Stripe | Batch generates monthly receipts |
| generate-year-end-summary | Cron | Supabase | Creates annual giving summaries |
| get-google-places-key | Public | None | Returns Google Places API key |
| get-sentry-dsn | Public | None | Returns Sentry DSN |
| github-test-webhook | Webhook | Supabase | Logs GitHub Actions test results |
| manage-sponsorship | Auth | Stripe | Customer portal access |
| moderate-content | Auth | Lovable AI | AI text moderation |
| moderate-image | Auth | Lovable AI | AI image moderation |
| notify-admin-new-contact | Internal | Resend | Notifies admins of contact submissions |
| process-inbound-email | Webhook | Supabase | Processes CloudFlare email routing |
| resend-webhook | Webhook | Supabase | Logs Resend email events |
| seed-email-test-data | Test | Supabase | Seeds email test data |
| seed-halloween-stickers | Admin | Supabase | Seeds Halloween sticker collection |
| send-approval-notification | Internal | Resend | Sends approval notifications |
| send-automated-campaign | Admin | Resend | Sends automated campaigns |
| send-contact-reply | Auth | Resend | Sends contact form replies |
| send-digest-email | Cron | Resend | Sends batched digest emails |
| send-message-notification | Internal | Resend | Sends message notifications |
| send-newsletter | Admin | Resend | Sends newsletter campaigns |
| send-notification-email | Internal | Resend | Sends individual notifications |
| send-sponsorship-receipt | Internal | Resend | Sends tax-deductible receipts |
| send-test-newsletter | Admin | Resend | Sends test newsletters |
| sentry-webhook | Webhook | Supabase | Logs Sentry error alerts |
| stripe-webhook | Webhook | Stripe | Handles all Stripe events |
| submit-tracking | Vendor | AfterShip | Submits order tracking |
| update-sponsorship | Auth | Stripe | Updates sponsorship tier |
| verify-sponsorship-payment | Webhook | Stripe | Verifies payment completion |

---

## By Authentication Type

### Public (verify_jwt = false)
**Functions callable without authentication, usually for public forms or utility endpoints**

- `create-donation-checkout` - Public donation form
- `create-sponsorship-checkout` - Public sponsorship form
- `get-sentry-dsn` - Client-side error tracking setup
- `get-google-places-key` - Location autocomplete

### JWT Required (default)
**Requires valid authentication token, uses auth.uid() for user context**

- `manage-sponsorship` - User manages own sponsorships
- `update-sponsorship` - User updates own sponsorships
- `moderate-content` - Authenticated users can moderate
- `moderate-image` - Authenticated users can moderate
- `send-contact-reply` - Admins reply to contact forms
- `record-terms-acceptance` - Users accept terms

### Admin Only
**Requires admin or owner role via `has_admin_access()`**

- `broadcast-product-update` - Sends notifications to all users
- `send-newsletter` - Sends newsletter campaigns
- `send-test-newsletter` - Tests newsletter before sending
- `send-automated-campaign` - Sends marketing campaigns
- `seed-halloween-stickers` - Seeds sticker collections
- `create-user` - Creates test users

### Vendor Authentication
**Requires vendor status check via `vendors` table**

- `submit-tracking` - Vendors submit order tracking

### Internal Only
**Called only by database triggers, cron jobs, or other edge functions**

- `send-notification-email` - Triggered by notification system
- `send-digest-email` - Triggered by cron job
- `send-approval-notification` - Triggered by approval system
- `send-message-notification` - Triggered by message system
- `send-sponsorship-receipt` - Triggered by payment webhook
- `generate-receipts` - Triggered by cron job
- `generate-year-end-summary` - Triggered by cron job
- `notify-admin-new-contact` - Triggered by contact form

### Webhook Signature Required
**Verifies external service signatures for security**

- `stripe-webhook` - Verifies Stripe signature
- `github-test-webhook` - Verifies GitHub signature
- `sentry-webhook` - Verifies Sentry signature
- `resend-webhook` - Verifies Resend signature
- `process-inbound-email` - Verifies CloudFlare signature
- `aftership-webhook` - ⚠️ NOT FUNCTIONAL
- `verify-sponsorship-payment` - Verifies Stripe checkout

### Test Only
**Used exclusively in automated testing, should never be called in production**

- `seed-email-test-data` - Creates test users/data
- `cleanup-email-test-data` - Removes test data
- `cleanup-test-data-unified` - Unified test cleanup

---

## Common Patterns

### CORS Headers (Required for All)
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle CORS preflight
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}
```

### Supabase Client Initialization
```typescript
// Admin client (service role)
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

// User-scoped client (JWT auth)
const authHeader = req.headers.get("Authorization")!;
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  { global: { headers: { Authorization: authHeader } } }
);
```

### Zod Validation Pattern
```typescript
const requestSchema = z.object({
  email: z.string().email(),
  amount: z.number().positive(),
  // ... more fields
});

const validationResult = requestSchema.safeParse(await req.json());
if (!validationResult.success) {
  return new Response(
    JSON.stringify({ 
      error: 'Validation failed',
      details: validationResult.error.errors
    }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### Error Handling Pattern
```typescript
try {
  // Main logic
} catch (error: any) {
  console.error('Error in function-name:', error);
  return new Response(
    JSON.stringify({ error: error.message }),
    { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
```

---

## Secrets Required by Function

### Stripe Functions
- `STRIPE_SECRET_KEY` or `STRIPE_SECRET_KEY_TEST` (dual mode)
- `STRIPE_WEBHOOK_SECRET` or `STRIPE_WEBHOOK_SECRET_TEST` (dual mode)

### Email Functions (Resend)
- `RESEND_API_KEY`

### AI Functions (Lovable AI)
- `LOVABLE_API_KEY` (auto-provisioned)

### Tracking Functions
- `AFTERSHIP_API_KEY`

### Webhook Functions
- `CLOUDFLARE_EMAIL_WEBHOOK_SECRET`
- Various webhook secrets per service

### Utility Functions
- `SENTRY_DSN`
- `GOOGLE_PLACES_API_KEY`

---

## Notes

- **Version Consistency**: All functions use `@supabase/supabase-js@2.57.2` for stability
- **Logging**: All functions log errors with context for debugging
- **Rate Limiting**: Notification emails implement rate limiting (1/hour per user/type)
- **Dual Mode Stripe**: Payment functions support test/live mode via `app_settings.stripe_mode`
- **Security**: All webhook functions verify signatures before processing
- **Testing**: Test functions prefixed with `test-` or contain "test" in name
