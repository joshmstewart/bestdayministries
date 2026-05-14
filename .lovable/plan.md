
# End-to-End App Review — Best Day Ministries

**Context Log:**
- Security scan: 0 critical findings, 437+ RLS policies in place.
- Supabase linter: **244 issues** (1 ERROR: SECURITY DEFINER view; ~25 "RLS Policy Always TRUE" on INSERT/UPDATE/DELETE; many `function_search_path` WARNs; public buckets allow listing).
- Scale: 75 pages, 228 edge functions, 363-line App.tsx, ~15 cron jobs.
- Memory rules respected: never delete financial data, MST timezone, polling-first reconciliation, security regressions revert-not-fix-forward, Gemini 3 only.

This is a **review**, not an implementation plan. Pick what you want me to actually execute.

---

## TIER 1 — Real risks, worth fixing soon

**1. RLS "Always TRUE" on writes (~25 warnings).** Linter flags policies using `USING(true)` / `WITH CHECK(true)` for INSERT/UPDATE/DELETE. Each is potential privilege escalation. Needs case-by-case audit — tighten or document why intentional.

**2. SECURITY DEFINER view (1 ERROR).** One view bypasses caller's RLS. Per your `SECURITY_CHANGE_PROTOCOL.md`, exactly the class of issue that broke bestie linking and sponsorship receipts before.

**3. Public buckets allow listing.** Anyone can enumerate every file in some public buckets. Fine for `app-assets`, risky for user-uploaded content (avatars, audio, vendor assets).

**4. 228 edge functions = unaudited surface.** Almost certain dead code + duplicates. Inventory by 30-day invocation count → delete zero-traffic ones. Cuts attack surface and Cloud cost.

**5. Cron sprawl.** `process-newsletter-queue` and `process-event-email-queue` both run every minute. If queue depth is usually 0, every-5-min saves ~80% of those invocations (same logic as yesterday's vendor-retry stretch).

---

## TIER 2 — Stability & maintainability

**6.** App.tsx is 363 lines — single point of failure for routing. Split into a `routes/` config + lazy boundaries.

**7.** Test pyramid conversion is mid-flight (Week 2 of 6 done). Either commit Weeks 3–6 or formally pause to avoid hybrid mess.

**8.** `docs/` has 90+ files with overlapping titles (three `RECENT_FIXES_SUMMARY*` files). Quarterly archive sweep → `docs/archive/` keeps AI context clean.

**9.** No IP rate-limit on public edge functions (donation-checkout, contact form, sponsorship checkout). Stripe/Resend absorb cost if abused. A `check_rate_limit` wrapper on high-cost endpoints caps downside.

---

## TIER 3 — UX / polish wins

**10.** Mobile audit — current viewport 440px, several pages still feel desktop-first.
**11.** Loading states inconsistent (skeleton vs spinner vs blank). Standardize on existing `HeaderSkeleton` pattern.
**12.** Notification center: add date grouping (Today / Yesterday / This week).
**13.** Admin has 14 top-level tabs — mobile admins locked out. A `Cmd+K` command palette solves it without rebuilding tabs.

---

## TIER 4 — "Wow factor" / new features (optional)

- **Annual giving wrapped** — Spotify-style year-end shareable image (sponsorship totals already exist).
- **Public donor wall** (opt-in) — social proof for new donors.
- **Bestie of the week** auto-rotation on homepage (carousel infra exists).
- **AI thank-you notes** to sponsors via Gemini 3, gated by guardian approval (fits existing pattern).
- **PWA install prompt** — `usePWAInstall` hook exists but isn't surfaced on Index.

---

## Recommendation

If I were you, **Tier 1 items 1–3** is the next session — only tier with actual risk. Tell me which to execute:

- **(A)** Tier 1 security audit (read every always-true policy + the DEFINER view + public buckets, propose targeted fixes per `SECURITY_CHANGE_PROTOCOL.md`).
- **(B)** Edge function inventory — flag dead/duplicated ones for deletion.
- **(C)** Cron cost cuts (newsletter + event queues).
- **(D)** Something from Tier 3 or 4.
