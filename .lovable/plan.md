You want Claude Code to own the project and no longer depend on Lovable for day-to-day management. There are two realistic paths. The plan below describes both so you can choose.

## Path A: Hybrid (stay on Lovable Cloud, use Claude Code for code)

Use this if you want to keep the existing backend running but do your editing in Claude Code.

1. Connect the project to GitHub via Lovable (Plus menu → GitHub → Connect project).
2. Clone the repo locally and open it in Claude Code.
3. Make frontend/backend code changes in Claude Code, commit, and push.
4. Lovable auto-syncs the repo and handles deployment of edge functions and migrations.
5. You still use Lovable for: publishing the frontend, running migrations, deploying edge functions, and managing secrets.

Trade-offs:
- Pros: No data migration, no downtime, no new hosting setup.
- Cons: Lovable still owns the backend runtime; you cannot deploy functions or run migrations from Claude Code directly.

## Path B: Full migration to standalone Supabase + self-hosting (recommended for control)

Use this if you want Claude Code to manage everything, including backend operations.

### Phase 1: Export and prepare

1. Export database data from Lovable Cloud: Cloud → Advanced settings → Export data.
2. Create a new Supabase project (direct Supabase account, not Lovable Cloud).
3. Set up a new GitHub repo and push the current codebase.
4. Document all secrets currently in Lovable Cloud: Stripe keys, Resend key, Printify key, ShipStation, AfterShip, Google Places, Sentry DSN, ElevenLabs, etc.

### Phase 2: Backend setup

1. Import the database dump into the new Supabase project.
2. Verify all RLS policies, GRANTs, triggers, and cron jobs are present.
3. Recreate storage buckets and bucket policies.
4. Reconfigure auth providers (Google, email, etc.) in Supabase Auth.
5. Set all secrets in Supabase Edge Function secrets.
6. Deploy all edge functions using `supabase functions deploy`.
7. Recreate cron jobs that invoke edge functions.

### Phase 3: Frontend and hosting

1. Update `.env` with the new Supabase URL and publishable key.
2. Choose hosting: Vercel/Netlify/Cloudflare Pages.
3. Set environment variables in the hosting platform.
4. Configure build command (`npm run build`) and output directory (`dist`).
5. Set up custom domains and DNS.
6. Configure CI/CD (GitHub Actions) for tests and deploys.

### Phase 4: Third-party integrations

1. Update Stripe webhook endpoints to the new Supabase functions URL.
2. Update Cloudflare email routing/webhook to the new edge function URL.
3. Reconfigure Printify, ShipStation, AfterShip, and any other webhooks.
4. Update Sentry DSN and any monitoring alerts.

### Phase 5: Cutover

1. Run parallel: old site live, new site on a staging domain.
2. Test critical flows: auth, donations, marketplace checkout, sponsorships, vendor payouts, email routing, contact forms.
3. Switch DNS/custom domain to the new host.
4. Monitor error logs and Stripe/webhook health for 48 hours.

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Data loss during export/import | Request Lovable export, validate row counts, test restore on new project first |
| Secrets not transferred | Audit `fetch_secrets` output and edge function env usage before cutover |
| Webhooks break | Recreate every webhook endpoint; test with Stripe test mode and Cloudflare worker |
| Cron jobs missed | Document all cron schedules and recreate them in new project |
| Downtime | Stage on temporary domain, verify, then switch DNS |
| Cost surprise | Compare Supabase + hosting costs vs current Lovable plan before committing |

## Recommendation

Given your goal is control and you already work in Claude Code, **Path B is the right long-term answer**. The codebase itself needs no changes, but the surrounding infrastructure (Supabase project, hosting, webhooks, secrets, cron jobs) must be rebuilt around it. Expect roughly half a day to a day of focused setup plus testing.

If you want to de-risk first, start with Path A for a week or two while you prepare the Supabase migration in parallel.

Next step: confirm which path you want, and I can produce a detailed runbook with exact commands and a checklist.