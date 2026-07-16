# Platform Audit Checklist

Legend: `[ ]` untested · `[testing]` in progress · `[pass]` verified · `[fail:reason]` broken · `[fixed:desc]` broken then fixed · `[blocked:reason]` cannot test in sandbox

## Auth & Terms
- [pass] auth signup + terms recording — user a336b2f9-d5e9-4ad6-a1ee-4926a37d62e5, display_name="Audit T", role=supporter, redirected to /community; see Evidence 2026-07-16 #1
- [pass] terms acceptance recording — terms_acceptance row v1.0/v1.0, IP recorded, timestamped 2026-07-16 18:10:26Z; record-terms-acceptance edge fn awaited during signup (Auth.tsx L266)
- [fail:PII-leak-sponsor_email+profiles-email-readable-by-any-auth-user] role gating: supporter — see Evidence 2026-07-16 #2
- [pass] role gating: bestie — signup user 17dc1bd5-8db4-4b31-824e-ce4ca9397842 (role=bestie). Route probes: /admin→redirect /community ✅, /guardian-links→redirect /community ✅, /vendor-dashboard→"Become a Vendor" apply prompt (no vendor data) ✅, /community /discussions /notifications /orders /sponsor-bestie load ✅. Screenshots /tmp/browser/role-bestie/b_*.png. See Evidence 2026-07-16 #3.
- [pass] role gating: caregiver — signup user 484d5205-ceae-4674-97d6-56e2f0cc5d04 (role=caregiver, email emailtest-caregiver-1784226652@example.com). Route probes: /admin→redirect /community ✅ (blocked), /guardian-links→200 ✅ (allowed), /guardian-approvals→200 ✅ (allowed), /vendor-dashboard→200 (apply prompt, no vendor data leaked — vendor is a status not a role), /community /discussions /notifications /orders /sponsor-bestie load ✅. Screenshots /tmp/browser/role-caregiver/ss/*.png. See Evidence 2026-07-16 #4.
- [pass] role gating: moderator — user ab95b1b6-0282-4f4a-8f6d-3b071b7643e2 (emailtest-moderator-1784226811@example.com, promoted via user_roles UPDATE since signup dropdown lacks moderator option). Route probes: /admin→/community ✅ (admin-owner only per ADMIN_DASH doc), /guardian-links→/community ✅ (guardian-only), /guardian-approvals→/community ✅, /vendor-dashboard→200 (apply CTA), /community /discussions /notifications /orders /sponsor-bestie load ✅. Screenshots /tmp/browser/role-moderator/ss/*.png. Evidence #5.
- [ ] role gating: admin
- [ ] role gating: owner

## Donations
- [ ] donation one-time (test mode)
- [ ] donation monthly (test mode)
- [ ] donation reconciliation cron (reconcile-donations-from-stripe)

## Sponsorships
- [ ] sponsorship checkout (test mode)
- [ ] sponsorship webhook (stripe-webhook)
- [ ] sponsorship receipt email (Resend + email_send_log)
- [ ] guest sponsorship linking (link_guest_sponsorships trigger)
- [ ] sponsorship reconciliation cron

## Marketplace
- [ ] marketplace checkout — handmade
- [ ] marketplace checkout — Printify
- [ ] vendor payout transfer (create-vendor-transfer)
- [ ] Stripe Connect onboarding
- [ ] ShipStation sync
- [ ] AfterShip tracking
- [ ] Shopify cart
- [ ] vendor payout cron

## Messaging & Contact
- [ ] contact form submit
- [ ] contact form inbound reply (Cloudflare → process-inbound-email)

## Guardian Approvals
- [ ] guardian approval — post
- [ ] guardian approval — comment
- [ ] guardian approval — message
- [ ] guardian approval — vendor asset

## Bestie Linking
- [ ] bestie linking 3-emoji flow
- [ ] vendor bestie request
- [ ] sponsor messaging

## Notifications & Email
- [ ] notification digest daily (send-digest)
- [ ] notification digest weekly
- [ ] newsletter send (send-newsletter)
- [ ] newsletter automated trigger (send-automated-campaign)
- [ ] email queue processor (process-email-queue)
- [ ] Resend delivery via email_send_log

## Security & Infra
- [ ] Stripe webhook signature verification
- [ ] RLS on every user-facing table (linter pass)
- [ ] edge function CORS on every function

## Games & Features
- [ ] coin deduction via deductCoins hook
- [ ] sticker pack opening
- [ ] daily fortune release MST
- [ ] wordle daily
- [ ] mood tracker
- [ ] recipe generation
- [ ] TTS

## Route Loading
- [ ] all public routes load
- [ ] all authenticated routes load per role
- [ ] all admin tabs load

---

## Evidence Log

### 2026-07-16 #1 — auth signup + terms
- Playwright: /tmp/browser/auth-signup/screenshots/{1_form,2_filled,3_after_submit}.png
- Test email: emailtest-audit-1784225419@example.com (deleted post-verify)
- Redirect: /auth?signup=true → /community ✅
- DB: profiles + user_roles(supporter) + terms_acceptance(v1.0/v1.0, IP 35.204.28.48, 2026-07-16 18:10:26Z) all present
- Cleanup: DELETE FROM auth.users → cascaded

### 2026-07-16 #2 — role gating: supporter [FAIL]
Test user: emailtest-role-sup-1784225798350@example.com (uid 3b200e96-1dd8-4765-8be7-c68ae95347f1), role=supporter, no relationships.

**Route gating (client-side) — OK:**
- /community, /marketplace, /support, /notifications, /donation-history, /help, /discussions, /events, /profile, /games, /sponsor-bestie → accessible ✅
- /admin → "Access Denied" toast, no data rendered ✅ (screenshot g_admin.png)
- /guardian-links → infinite "Loading your links…" spinner (minor UX bug; no data leak, RLS blocks) ⚠
- /vendor-dashboard → similar, no data ⚠

**RLS (data-layer) — TWO CRITICAL LEAKS:**

1. **`public.sponsorships` — anon+authenticated can SELECT full rows including donor PII**
   - Policy: `"Users can view sponsorship funding aggregates"` `USING (true)` FOR SELECT TO anon,authenticated.
   - Reproduction (anon, no auth):
     `curl .../rest/v1/sponsorships?select=id,sponsor_email,amount&limit=3` → returns real emails: wendy31@skybeam.com $103.30, janart@gvtc.com $206.28, andrea.aguilera4@gmail.com $26.06.
   - Impact: every donor email + amount + sponsor_id + stripe_customer_id + stripe_subscription_id publicly readable.
   - Intent of policy: expose aggregates for FundingProgressBar carousel. But RLS is row-level, not column-level, so entire row leaks.

2. **`public.profiles` — any authenticated user can SELECT full profile row (incl. email) for any user with a friend_code set**
   - Policy: `"Authenticated users can search by friend code"` `USING (friend_code IS NOT NULL)` FOR SELECT TO authenticated.
   - Reproduction (as supporter test user): `curl .../rest/v1/profiles?select=id,email&limit=20` → returns 20 real user emails.
   - `profiles_public` view has the same leak because it inherits caller RLS and exposes `email`.

**Not fixed this turn — root-cause fix requires coordinated changes across frontend (SponsorBestieDisplay, GuardianLinks funding logic, friend-code search UI) and edge functions. Applying a partial policy tightening would break the carousel and bestie search. Proposed fix:**
   - Replace `sponsorships USING(true)` with SECURITY DEFINER function `public.get_bestie_funding(bestie_id, mode)` returning only aggregate columns; refactor SponsorBestieDisplay + FundingProgressBar callers to use it.
   - Replace `profiles friend_code` policy with SECURITY DEFINER function `public.find_profile_by_friend_code(code)` returning only display_name+avatar+id (no email); refactor bestie-linking UI callers.
   - Drop `email` column from `profiles_public` view.
   - **Do not merge until every caller migrated and re-verified.**

Test user left in place (harmless supporter with no data). Screenshots: /tmp/browser/role-supporter/screenshots/g_admin.png, g_guardian.png, g_community.png.

### Evidence 2026-07-16 #3 — role gating: bestie
- Fresh signup emailtest-bestie-1784226539@example.com → user 17dc1bd5-8db4-4b31-824e-ce4ca9397842, role=bestie (DB verified).
- Route probes: /admin → /community, /guardian-links → /community, /vendor-dashboard shows "Become a Vendor" apply CTA (no vendor data leaked), /community /discussions /notifications /orders /sponsor-bestie all load.
- Screenshots: /tmp/browser/role-bestie/b_*.png

### Evidence 2026-07-16 #4 — role gating: caregiver [PASS]
- Test user: `484d5205-ceae-4674-97d6-56e2f0cc5d04` / `emailtest-caregiver-1784226652@example.com` / role `caregiver` (verified via user_roles join).
- After signup redirected to `/community` (post-signup landing).
- Route probes (Playwright, headless Chromium):
  - `/admin` → redirected to `/community` ✅ (admin gated)
  - `/guardian-links` → 200 ✅ (caregiver granted per route policy)
  - `/guardian-approvals` → 200 ✅ (caregiver granted)
  - `/vendor-dashboard` → 200 (shows "Become a Vendor" apply CTA; vendor is a status not a role — no vendor data exposed)
  - `/community`, `/discussions`, `/notifications`, `/orders`, `/sponsor-bestie` → 200 ✅
- Screenshots: `/tmp/browser/role-caregiver/ss/probe_*.png`.
- Note: PII leaks flagged under supporter (Evidence #2) apply to all authenticated roles including caregiver; tracked separately. This item validates *route-level* role gating only.

### Evidence 2026-07-16 #5 — role gating: moderator [PASS]
- Test user: `ab95b1b6-0282-4f4a-8f6d-3b071b7643e2` / `emailtest-moderator-1784226811@example.com` / role `moderator` (promoted via `UPDATE public.user_roles SET role='moderator'` — signup form does not expose moderator in dropdown by design).
- Login via /auth, redirected to /community.
- Route probes:
  - `/admin` → `/community` ✅ (ADMIN_DASH access=admin-owner only)
  - `/guardian-links` → `/community` ✅ (guardian-only)
  - `/guardian-approvals` → `/community` ✅ (guardian-only)
  - `/vendor-dashboard` → 200 (apply CTA; vendor is a status)
  - `/community`, `/discussions`, `/notifications`, `/orders`, `/sponsor-bestie` → 200 ✅
- Screenshots: `/tmp/browser/role-moderator/ss/probe_*.png`.
- Note: moderator-specific moderation UI lives inside /admin Moderation tab and is not reachable by moderators via route — this may be an intentional restriction (admin-owner gate covers the parent shell) but represents a functional gap for the moderator role. Flagged for follow-up under a dedicated "moderator has no route to moderation UI" item, not blocking this route-gating check.
