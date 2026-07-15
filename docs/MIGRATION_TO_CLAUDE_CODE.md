# Migration Runbook: Lovable Cloud → Claude Code + Standalone Supabase

**Goal:** Move this project to full Claude Code management by migrating off Lovable Cloud to a standalone Supabase project and self-hosted frontend.

**Why this is required:** Lovable Cloud does not expose the `SUPABASE_SERVICE_ROLE_KEY` or database password, so Claude Code cannot deploy edge functions, run migrations, or manage secrets against the current backend. Full control requires a direct Supabase project.

**Estimated effort:** Half a day to one day of focused work, plus testing.

---

## Phase 1: Export and prepare

### 1.1 Request database export from Lovable Cloud

1. Open the Lovable project.
2. Go to **Cloud → Advanced settings → Export data**.
3. Request the export and wait for the download link.
4. Download the `.sql` dump and keep it somewhere safe.

### 1.2 Create a new Supabase project

1. Sign up or log in at [supabase.com](https://supabase.com).
2. Create a new project. Choose a region close to your users (likely US Central or US West for Mountain Time).
3. Note the project **ref**, **URL**, **publishable (anon) key**, **service_role key**, and **database password**. You will need all of them.

### 1.3 Create a new GitHub repository

1. In Lovable, connect the project to GitHub if it is not already connected (Plus menu → GitHub → Connect project).
2. Clone the repository locally.
3. Open the cloned repository in Claude Code.

### 1.4 Audit current secrets

See `docs/MIGRATION_INVENTORY.md` for the full list of secrets currently configured in Lovable Cloud. You will need to re-enter every non-connector secret into the new Supabase project.

**Connector-managed secrets** (FIRECRAWL_API_KEY, SHOPIFY_ACCESS_TOKEN, SHOPIFY_STOREFRONT_ACCESS_TOKEN, MAILTRAP_ACCOUNT_ID, MAILTRAP_API_TOKEN, MAILTRAP_INBOX_ID) must be re-linked or re-entered through Supabase/connector dashboards.

---

## Phase 2: Backend setup

### 2.1 Install the Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux / npm
npm install supabase --save-dev
```

### 2.2 Link the project

```bash
supabase login
supabase link --project-ref <new-project-ref>
```

### 2.3 Import the database dump

```bash
# Use the connection string from your new Supabase project settings
psql "postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres" -f /path/to/export.sql
```

After import, verify:

```bash
supabase db pull
```

### 2.4 Verify schema and policies

Run these checks in the Supabase SQL Editor:

```sql
-- Count tables in public schema
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';

-- Verify RLS is enabled on tables
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- List policies
SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
```

### 2.5 Recreate storage buckets

The database dump may include bucket metadata, but you must recreate the actual buckets in Supabase Storage and set their public/private flags.

See `docs/MIGRATION_INVENTORY.md` for the list of 24 buckets and their public flags.

After creating buckets, re-apply storage policies if they were not included in the dump:

```sql
-- Example: allow authenticated uploads to app-assets
CREATE POLICY "Authenticated users can upload to app-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'app-assets');
```

### 2.6 Reconfigure auth providers

1. In Supabase Auth → Providers, enable **Email** and **Google** (matching current Lovable Cloud setup).
2. Configure Google OAuth credentials and set the redirect URI to `https://<your-domain>/auth/callback`.
3. If you use Apple or other providers, re-enable them.

### 2.7 Set secrets in the new Supabase project

For each secret in `docs/MIGRATION_INVENTORY.md`, run:

```bash
supabase secrets set <NAME>=<VALUE>
```

Required secrets include:

- `STRIPE_SECRET_KEY`
- `STRIPE_SECRET_KEY_LIVE`
- `STRIPE_SECRET_KEY_TEST`
- `STRIPE_WEBHOOK_SECRET_LIVE`
- `STRIPE_WEBHOOK_SECRET_TEST`
- `STRIPE_PUBLISHABLE_KEY_LIVE`
- `STRIPE_PUBLISHABLE_KEY_TEST`
- `MARKETPLACE_STRIPE_SECRET_KEY_LIVE`
- `MARKETPLACE_STRIPE_SECRET_KEY_TEST`
- `RESEND_API_KEY`
- `SENTRY_DSN`
- `GOOGLE_PLACES_API_KEY`
- `PRINTIFY_API_KEY`
- `SHIPSTATION_API_KEY`
- `SHIPSTATION_API_SECRET`
- `EASYPOST_API_KEY_LIVE`
- `EASYPOST_API_KEY_TEST`
- `AFTERSHIP_API_KEY`
- `ELEVEN_LABS_API_KEY`
- `CLOUDFLARE_EMAIL_WEBHOOK_SECRET`
- `LOVABLE_API_KEY` (if still using Lovable AI Gateway or connectors)

### 2.8 Deploy edge functions

```bash
supabase functions deploy
```

This deploys all functions in `supabase/functions/`.

### 2.9 Recreate cron jobs

Enable `pg_cron` and `pg_net` extensions in the new Supabase project, then run the SQL from `docs/MIGRATION_INVENTORY.md` for each cron job, replacing:

- `https://nbvijawmjkycyweioglk.supabase.co` with your new Supabase URL.
- The bearer token with your new project's anon key.
- The `X-Cron-Secret` value with the same secret used in the edge function.

---

## Phase 3: Frontend and hosting

### 3.1 Update environment variables

Edit `.env` in the project root:

```env
VITE_SUPABASE_URL=https://<new-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<new-anon-key>
VITE_SUPABASE_PROJECT_ID=<new-project-ref>
```

### 3.2 Choose a host

Recommended options:

- **Vercel** (easiest for Vite/React, custom domains, preview deployments).
- **Netlify**.
- **Cloudflare Pages**.

### 3.3 Configure the host

1. Connect the GitHub repo to the host.
2. Set build command: `npm run build`.
3. Set output directory: `dist`.
4. Add environment variables from `.env`.
5. Configure custom domains and DNS.

### 3.4 Update `index.html` if needed

The `index.html` file already has SEO meta tags. Verify the canonical and OpenGraph tags reflect the new domain after cutover.

### 3.5 Set up CI/CD

Use the existing GitHub Actions workflows in `.github/workflows/` as a starting point. Update secrets in GitHub repository settings:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- Any other build-time variables.

---

## Phase 4: Third-party integrations

### 4.1 Stripe

Update webhook endpoints in both Stripe dashboards (live and test) to:

```
https://<new-project-ref>.supabase.co/functions/v1/stripe-webhook
```

Update the webhook secrets in the new Supabase project.

### 4.2 Cloudflare email routing

Update the Cloudflare worker/webhook target to:

```
https://<new-project-ref>.supabase.co/functions/v1/process-inbound-email
```

### 4.3 Printify, ShipStation, AfterShip

Update any webhook URLs or API integrations to use the new Supabase functions URL.

### 4.4 Sentry

Update the Sentry DSN if you create a new Sentry project, or keep the existing one.

### 4.5 Google Places

The existing `GOOGLE_PLACES_API_KEY` secret transfers directly.

---

## Phase 5: Cutover

### 5.1 Stage and test

1. Deploy the frontend to a staging domain (e.g., `staging.bestdayevercoffeeandcrepes.com`).
2. Test all critical flows:
   - Sign up / log in
   - Donation checkout
   - Sponsorship checkout
   - Marketplace purchase
   - Vendor dashboard
   - Contact form submission
   - Newsletter send
   - Album upload and cropping
   - Admin panels

### 5.2 Switch DNS

Once staging tests pass:

1. Point the custom domain DNS records to the new host.
2. Wait for DNS propagation.
3. Verify SSL certificates.

### 5.3 Monitor

For 48 hours after cutover, monitor:

- Supabase Edge Function logs
- Stripe webhook deliveries
- Sentry errors
- Contact form / email routing
- Cron job execution

---

## Post-migration Claude Code workflow

After migration, Claude Code can manage the entire project:

- Edit frontend and backend code.
- Run `supabase functions deploy`.
- Run `supabase db push` for migrations.
- Manage secrets with `supabase secrets set`.
- Run tests with `npm test`.
- Deploy via GitHub Actions or host CLI.

---

## Rollback plan

If something goes wrong during cutover:

1. Keep the Lovable Cloud project paused but not deleted for at least two weeks.
2. Switch DNS back to the Lovable-hosted domain.
3. Re-enable any webhooks pointing at Lovable.
4. Investigate and fix the issue in the new environment.

---

## Next step

Confirm you want to proceed with Path B (full migration). Once confirmed, the first concrete action is requesting the database export from Lovable Cloud and creating the new Supabase project.