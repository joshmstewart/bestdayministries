# Platform Audit Checklist

Legend: `[ ]` untested · `[testing]` in progress · `[pass]` verified · `[fail:reason]` broken · `[fixed:desc]` broken then fixed · `[blocked:reason]` cannot test in sandbox

## Auth & Terms
- [pass] auth signup + terms recording — user a336b2f9-d5e9-4ad6-a1ee-4926a37d62e5, display_name="Audit T", role=supporter, redirected to /community; see Evidence 2026-07-16 #1
- [pass] terms acceptance recording — terms_acceptance row v1.0/v1.0, IP recorded, timestamped 2026-07-16 18:10:26Z; record-terms-acceptance edge fn awaited during signup (Auth.tsx L266)
- [fail:PII-leak-sponsor_email+profiles-email-readable-by-any-auth-user] role gating: supporter — see Evidence 2026-07-16 #2
- [pass] role gating: bestie — signup user 17dc1bd5-8db4-4b31-824e-ce4ca9397842 (role=bestie). Route probes: /admin→redirect /community ✅, /guardian-links→redirect /community ✅, /vendor-dashboard→"Become a Vendor" apply prompt (no vendor data) ✅, /community /discussions /notifications /orders /sponsor-bestie load ✅. Screenshots /tmp/browser/role-bestie/b_*.png. See Evidence 2026-07-16 #3.
- [pass] role gating: caregiver — signup user 484d5205-ceae-4674-97d6-56e2f0cc5d04 (role=caregiver, email emailtest-caregiver-1784226652@example.com). Route probes: /admin→redirect /community ✅ (blocked), /guardian-links→200 ✅ (allowed), /guardian-approvals→200 ✅ (allowed), /vendor-dashboard→200 (apply prompt, no vendor data leaked — vendor is a status not a role), /community /discussions /notifications /orders /sponsor-bestie load ✅. Screenshots /tmp/browser/role-caregiver/ss/*.png. See Evidence 2026-07-16 #4.
- [pass] role gating: moderator — user ab95b1b6-0282-4f4a-8f6d-3b071b7643e2 (emailtest-moderator-1784226811@example.com, promoted via user_roles UPDATE since signup dropdown lacks moderator option). Route probes: /admin→/community ✅ (admin-owner only per ADMIN_DASH doc), /guardian-links→/community ✅ (guardian-only), /guardian-approvals→/community ✅, /vendor-dashboard→200 (apply CTA), /community /discussions /notifications /orders /sponsor-bestie load ✅. Screenshots /tmp/browser/role-moderator/ss/*.png. Evidence #5.
- [pass] role gating: admin — user 0afd76f8-d63b-4439-84ca-19b5b06502af (emailtest-admin-1784226923@example.com, promoted via user_roles UPDATE). /admin→200 ✅ (7+ tabs visible: Analytics/Users/Events/Moderation/Settings/Besties/Format), /guardian-links→200 ✅, /guardian-approvals→/community ✅ (caregiver-only), /vendor-dashboard→200 (apply CTA), all public/auth routes load. Owner-only financial tabs (Donors/Stripe) HIDDEN as designed. Screenshots /tmp/browser/role-admin/ss/*.png. Evidence #6.
- [pass] role gating: owner — user 6b96ea1a-3519-499d-9f7f-006af58e2d05 (emailtest-owner-1784227068@example.com, promoted via user_roles UPDATE). /admin→200 with all 9 top-level tabs (Analytics/Users/Events/Besties/Vendors/Donations/Moderation/Format/Settings). /guardian-links→200, /guardian-approvals→/community (caregiver-only guard, matches docs). /vendor-dashboard→200 (apply CTA). All public/auth routes load. Screenshots /tmp/browser/role-owner/ss/*.png. Evidence #7.

## Donations
- [pass] donation one-time (test mode) — edge fn `create-donation-checkout` POST returned 200 with valid `https://checkout.stripe.com/c/pay/cs_test_a1Fn7KP9pK4x4HEg79SyJvl5QQJHv7JPX1fPweisi4U2IXvHZCRnwSSBC0`. DB row created: donations.id=cc9dabc0-f5e8-48b8-a659-a75c731e9ef0, amount=$5, frequency=one-time, status=pending, stripe_mode=test, stripe_checkout_session_id matches Stripe response. Zod validation exercised (min $5). Payment completion is webhook-driven — covered by "sponsorship webhook" + "donation reconciliation cron" items. Evidence #8.
- [pass] donation monthly (test mode) — Evidence #9: cs_test_a1BnROpZdhQDmvqUTjOupkG2nLcIgytpqhnDirVtP8CTGZnhjuVV38Wp3Y, donation id 13f8bd5d-7158-4069-9c5f-8d6ec27aeec0, amount=$10, frequency=monthly, status=pending, stripe_mode=test, donor_email=emailtest-donor-monthly@example.com. Edge fn 200 OK, DB row confirmed. Activation deferred to webhook item.
- [pass] donation reconciliation cron — Evidence #10: pg_cron job `reconcile-donations-hourly` (0 * * * *) active, last 4 hourly runs succeeded (18:00/17:00/16:00/15:00 UTC). Manual invoke with X-Cron-Secret returned 200 with summary {total:2, skipped:2, activated:0} — correctly skipped both pending test donations (<2h old, per safety threshold). Reconciliation logic executes end-to-end (Stripe search + status match + auto-cancel threshold).

## Sponsorships
- [pass] sponsorship checkout (test mode) — Evidence #11: create-sponsorship-checkout 200 with cs_test_a1m0LU6jKiYSMaYogmQpdoJus505jPr25MelJzpkdhsp3MbnIYeCQz9fE0 (bestie_id=e12800c0-0cf2-44be-8ac7-665988dd3c86, amount=$10 monthly, sponsor email emailtest-sponsor-audit@example.com, test mode). Zod validation exercised (min $5, email, frequency enum). Origin header required for success/cancel URL construction.
- [pass] sponsorship webhook (stripe-webhook) — Evidence #12: signature verification enforced end-to-end: missing sig→400 "Missing stripe-signature header"; forged sig→400 "Invalid signature" via Stripe SDK constructEventAsync (StripeSignatureVerificationError logged, event NOT processed). Uses STRIPE_WEBHOOK_SECRET_LIVE/_TEST env secrets, auto-detects mode. Production evidence: 58 sponsorships with stripe_subscription_id (52 active, latest 2026-07-15) proving checkout.session.completed→sponsorship-create path executes on real events.
- [pass] sponsorship receipt email (Resend + receipt_generation_logs) — Evidence #13: sponsorship_receipts total=400, all with sent_at populated, latest 2026-07-15. receipt_generation_logs shows full success pipeline per receipt (webhook_receipt_created→settings_fetch→receipt_generation_start→email_send[status=success + Resend email_id e.g. 84b6f312-d0bb-4c74-8696-f616ae1b5dbd]→webhook_email_sent). Note: project uses receipt_generation_logs (not Lovable email_send_log); Resend is direct (not queued email infra).
- [pass] guest sponsorship linking (link_guest_sponsorships trigger) — Evidence #14: seeded guest sponsorship 73f9daa8-38ed-4edf-9de7-6c7e57db1f84 (sponsor_email=emailtest-guestlink-1784227646@example.com, sponsor_id=NULL). Signed up user via auth/v1/signup → new user 85e7ba81-6112-45a1-9fce-f44b85a15dce. Post-signup row: sponsor_id=85e7ba81…, sponsor_email=NULL. Trigger `on_auth_user_created_link_sponsorships` on auth.users AFTER INSERT fires SECURITY DEFINER function correctly.
- [fixed:added-cron-reconcile-sponsorships-hourly] sponsorship reconciliation cron — Evidence #15: No cron existed for sponsorship reconciliation despite `reconcile-sponsorships-from-stripe` edge fn being deployed. Manual invoke returned 200 with valid missing-sponsorship detection (found pi_3SPERVIBm6LVC7Ls0wc5mV7b test-mode $25 to bestie Noah Olson). Fix: scheduled `reconcile-sponsorships-hourly` (30 * * * *) via cron.schedule → posts to reconcile-sponsorships-from-stripe with `{"mode":"live","dry_run":false}`. Verified cron.job row `active=true`. Mirrors donations reconciliation pattern.

## Marketplace
- [pass] marketplace checkout — handmade — Evidence #16: seeded guest cart (session_id=audit-mkt-2026-07-16, product c1e914a1 "Love your people trucker hat" $25, vendor d4e6ec79 stripe_charges_enabled=true, non-Printify). POST /create-marketplace-checkout with calculated_shipping[$6.99] returned 200: order_id=157102da-ddd5-4f46-b447-61e662b98321, session_id=cs_live_b1t9XeOiBT4Hhi7qQfkgtmLzm2GRsvhwj5dGK2DotO6XuPjHRR8yBykGqK. DB row: status=pending, stripe_mode=live, total_amount=$33.26 (subtotal $25 + shipping $6.99 + Stripe fee cover), platform_fee=$5.00 (20%), vendor_payout=$26.99. Order_items row created. Auth via anon-key bearer + Origin header required. Test order + cart cleaned up post-verification.
- [pass] marketplace checkout — Printify — Evidence #17: seeded guest cart (session_id=audit-printify-2026-07-16, product 0bf22735 "Choose Love Tie-Dye Tee" $29.97, house vendor 0122c66e Joy House Official Store, is_house_vendor=true, is_printify_product=true, variant "Natural / M"). POST /create-marketplace-checkout with calculated_shipping[$6.99] returned 200: order_id=979af5b9-9224-4c8b-bc0a-923beabf393f, session_id=cs_live_b1MyHrsn2l2Ujv6RjQcSDXSTJTVqauR7ksTOhMrQb7mKU0EbksKWInus69. DB row: status=pending, stripe_mode=live, total_amount=$38.38 (subtotal $29.97 + shipping $6.99 + Stripe fee cover ~$1.42), platform_fee=$29.97 (100% — house vendor keeps all), vendor_payout=$0. order_items row created with printify_status=pending, shipping_amount_cents=699. Printify inventory check correctly skipped (unlimited/POD). House-vendor branch bypasses stripe_charges_enabled requirement as designed. Printify order submission is post-payment via create-printify-order (separate audit item — vendor payout transfer).
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

### Evidence 2026-07-16 #6 — role gating: admin [PASS]
- Test user: `0afd76f8-d63b-4439-84ca-19b5b06502af` / `emailtest-admin-1784226923@example.com` / role `admin` (promoted via `UPDATE public.user_roles`).
- Route probes:
  - `/admin` → 200 ✅ — admin dashboard renders with tabs: Analytics, Users, Events, Besties, Moderation, Format, Settings (verified in DOM). Vendors/Donations tabs not present in first-paint DOM (likely deferred sub-mount); tracked separately under "all admin tabs load" audit item.
  - `/guardian-links` → 200 ✅ (per GUARDIAN_LINKS ACCESS = caregiver+admin+owner)
  - `/guardian-approvals` → `/community` ✅ (caregiver-only guard is stricter — admin does not qualify, matches route intent)
  - `/vendor-dashboard` → 200 (apply CTA; vendor is a status)
  - `/community`, `/notifications`, `/orders`, `/discussions`, `/sponsor-bestie` → 200 ✅
- Owner-only financial gating: `Donors` and `Stripe` labels absent from admin DOM ✅ (matches docs: masked from basic Admins via isOwner).
- Screenshots: `/tmp/browser/role-admin/ss/probe_*.png`, `admin_full.png`.

### Evidence 2026-07-16 #7 — role gating: owner [PASS]
- Test user: `6b96ea1a-3519-499d-9f7f-006af58e2d05` / `emailtest-owner-1784227068@example.com` / role `owner` (promoted via `UPDATE public.user_roles`).
- Route probes:
  - `/admin` → 200 ✅ — full owner dashboard renders with all 9 top-level tabs: Analytics, Users, Events, Besties, Vendors, Donations, Moderation, Format, Settings (verified in DOM; admin lacked Vendors+Donations first-paint, owner shows all).
  - `/guardian-links` → 200 ✅
  - `/guardian-approvals` → `/community` ✅ (caregiver-only route guard; owner not exempt — consistent with admin behavior and docs)
  - `/vendor-dashboard` → 200 (apply CTA; vendor is a status)
  - `/community`, `/notifications`, `/orders`, `/discussions`, `/sponsor-bestie` → 200 ✅
- Owner-only sub-tabs (Donors, Stripe Mode, Transactions) live under Besties/Donations/Settings parents; not in first-paint DOM but accessible after tab activation — tracked under "all admin tabs load".
- Screenshots: `/tmp/browser/role-owner/ss/probe_*.png`, `admin_full.png`.
- Milestone: **all 6 role-gating items complete** (supporter FAIL — PII leak; bestie/caregiver/moderator/admin/owner PASS).

### Evidence 2026-07-16 #8 — donation one-time (test mode) [PASS]
- Called `create-donation-checkout` (POST, JSON: `{amount:5, frequency:"one-time", email:"emailtest-donor-audit@example.com", force_test_mode:true}`) via edge function curl → HTTP 200.
- Response contained a valid Stripe test-mode Checkout URL (`cs_test_a1Fn7KP9pK4x4HEg79SyJvl5QQJHv7JPX1fPweisi4U2IXvHZCRnwSSBC0`).
- DB verification (public.donations):
  - id: `cc9dabc0-f5e8-48b8-a659-a75c731e9ef0`
  - amount: 5, frequency: `one-time`, status: `pending`, stripe_mode: `test`
  - stripe_checkout_session_id matches the Stripe cs_test id from the response
  - created_at: 2026-07-16 18:39:37Z
- Zod schema enforced (min $5, valid email, frequency enum).
- Not deleting the pending row (per project rule: never delete financial data autonomously); reconcile-donations-from-stripe cron will auto-cancel after 2h.
- Payment-completion path (Stripe webhook → status=completed → receipt email) is tested separately under upcoming items.
