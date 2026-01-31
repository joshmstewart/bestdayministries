
Goal
- Make the custom uploaded coin image show for regular users (e.g., “Test Supporter”) in the navbar and everywhere `CoinIcon` is used.

What’s actually happening (root cause, verified)
- `CoinIcon.tsx` fetches `app_settings.setting_key = 'custom_coin_image'`.
- The database table `app_settings` has RLS enabled.
- Current RLS policies allow public (non-admin) SELECT only for a limited allowlist of keys:
  - `logo_url`, `mobile_app_name`, `mobile_app_icon_url`, `sponsor_page_content`, `stickers_enabled`, `bonus_packs_enabled`
- `custom_coin_image` is NOT in that allowlist, so non-admin users can’t read it and they fall back to `src/assets/joycoin.png` (the default coin).
- The setting exists and is populated (confirmed):
  - `custom_coin_image.setting_value.url = https://…/storage/v1/object/public/app-assets/coin-icons/custom-coin-....png`

Implementation plan (ordered, minimal-risk)
1) Backend (Lovable Cloud DB) — fix access to the custom coin setting
   - Update the existing RLS policy on `public.app_settings` to include `custom_coin_image` in the allowlist used by:
     - policy: “Allow public read access to public settings”
   - SQL approach (via migration tool):
     - Use `ALTER POLICY` (preferred) to avoid dropping/recreating if possible:
       - Extend the `USING (...)` expression to add `'custom_coin_image'`
     - If `ALTER POLICY` is not supported in the migration runner, fallback:
       - `DROP POLICY` then `CREATE POLICY` with the same name + expanded allowlist

   Expected outcome:
   - Any user (including anon, supporter, bestie, caregiver, etc.) can read that single safe setting key without granting broader admin access.

2) Backend (optional but recommended for consistency) — update the public settings RPC
   - Update DB function `public.get_public_app_settings()` to also return `custom_coin_image`.
   - Reason:
     - `UnifiedHeader.tsx` already uses `get_public_app_settings` for logo loading.
     - Including `custom_coin_image` makes it easier to fetch all public settings in one call later and keeps “public settings” centralized.
   - This step is not strictly required for the coin to work (once RLS is fixed), but it aligns the system and reduces future regressions.

3) Frontend — no functional changes required for the fix to work
   - Once RLS is corrected, the existing `CoinIcon` fetch will start returning the custom URL for non-admins.
   - Keep the current cache invalidation pattern:
     - `CoinRewardsManager.tsx` calls `invalidateCoinCache()` after upload/remove.
     - `CoinIcon` already force-fetches on mount and on cache invalidation.
   - Optional improvement (only if you want truly immediate cross-user updates without refresh):
     - Add a realtime subscription for `app_settings` updates for `custom_coin_image` and call `invalidateCoinCache()` when it changes.
     - This is extra scope and requires ensuring realtime publication includes `app_settings` and that RLS supports it safely.

4) Documentation updates (required by your workflow)
   - Update `docs/MASTER_SYSTEM_DOCS.md` with a short note:
     - “Custom coin image is stored in `app_settings.custom_coin_image` and must be publicly readable via allowlisted RLS policy.”
   - Update or add a short section in an existing relevant doc (likely `docs/COFFEE_SHOP_SYSTEM.md` is unrelated; better place is `MASTER_SYSTEM_DOCS.md` under UI/Coins or Admin Settings):
     - Where it is configured (Admin → Coin Rewards / Custom Coin Image)
     - Storage path/bucket expectation (`app-assets/coin-icons/...`)
     - RLS allowlist requirement

Testing plan (end-to-end)
- As a non-admin test account (e.g., Test Supporter):
  1) Sign in.
  2) Confirm the navbar coin icon changes to the uploaded custom coin (not the default `joycoin.png`).
  3) Navigate to a few other places that render `CoinIcon` (Store page, Coin Ledger dialog) and confirm it’s consistent.
- As admin:
  1) Upload a new custom coin image in the admin “Custom Coin Image” section.
  2) Confirm the admin sees the new coin immediately (cache invalidation).
  3) Confirm a non-admin user sees it after a refresh (or immediately if we also implement the realtime optional step).

Notes / Why the previous “cache fix” didn’t solve it
- The caching changes in `CoinIcon.tsx` don’t matter if the underlying SELECT is blocked by RLS for non-admin users. The fetch will keep returning nothing (or error), and the component will keep falling back to the default coin.

Files/components involved (for implementation)
- Backend (migration):
  - `public.app_settings` RLS policy: “Allow public read access to public settings”
  - (Optional) DB function: `public.get_public_app_settings()`
- Frontend (no required code change):
  - `src/components/CoinIcon.tsx`
  - `src/components/UnifiedHeader.tsx` (only for optional consolidation)
  - `src/components/admin/CoinRewardsManager.tsx` (already invalidates cache)

Approval gate
- Once you approve this plan, I’ll implement the database policy change first (that’s the actual fix), then do the optional `get_public_app_settings` update + doc updates.
