
Goal: Fix newsletter “magazine” (table[data-two-column]) layouts that are still stacking/wrapping on desktop. Ensure they only stack when the viewport is truly narrow (mobile).

What’s happening (confirmed in code)
- The TwoColumn editor node renders the magazine table with inline padding:
  - In `src/components/admin/newsletter/TwoColumnExtension.ts`, the table is rendered with `style: "... padding: 24px; margin: 16px 0;"` (plus column gutters inside the original TDs).
- Our email rendering transform for magazine layouts in `supabase/functions/_shared/emailStyles.ts` currently:
  - Extracts `padding:` from the original table and applies it to the wrapper TD (`wrapperPadding`).
  - BUT still calculates each column width from a hardcoded 600px (`colMaxWidth = Math.floor(600 / numColumns)`).
- Result: on desktop, the available “row” width is not 600px anymore. It’s effectively:
  - innerWidth = 600 - (leftPadding + rightPadding)
  - With the current editor output (`padding:24px`), innerWidth becomes 552px.
  - Two columns computed as 300px each (plus min-width), so total exceeds innerWidth → inline-block columns wrap even on desktop.

Why prior attempts didn’t fix it
- Switching to table-layout:fixed for desktop alone doesn’t solve wrapping if the computed column widths don’t match the padded inner container width.
- The current hybrid MSO/!MSO approach is fine in principle; the bug is the width math ignoring wrapper padding (and not accounting for per-column padding when sizing images).

Scope of fix
- Only newsletter email rendering (server-side email HTML transformation):
  - `supabase/functions/_shared/emailStyles.ts` → `styleMagazineLayouts()`
- No database changes required.

Implementation approach
1) Compute “effective available width” for magazine columns
   - Parse `wrapperPadding` (CSS padding shorthand) to determine left/right padding in pixels.
   - Compute:
     - containerWidth = 600
     - innerWidth = max(0, containerWidth - paddingLeft - paddingRight)
   - Use `innerWidth` (not 600) to size columns:
     - colOuterWidth = floor(innerWidth / numColumns)

2) Preserve / account for per-column padding when sizing images
   - The current magazine transform adds `padding:0 8px` on each generated column div and `padding:0 8px` on MSO TDs.
   - That means the true content width is smaller than `colOuterWidth`.
   - Update the normalize step to use:
     - colContentWidth = max(1, colOuterWidth - (colPaddingLeft + colPaddingRight))
   - Use `colContentWidth` when calling `normalizeColumnImages(...)` so we don’t set width attributes that can cause overflow in picky email clients.

3) Keep mobile stacking behavior reliable
   - Continue using inline-block divs for non-MSO clients (Gmail/Apple Mail), because this is the system’s intended “no media queries” stacking mechanism.
   - Keep the existing `min-width` behavior but base it on the corrected `colOuterWidth` so it won’t force wraps on desktop due to padding math.
   - Outcome:
     - Desktop: columns remain side-by-side because (sum of min-widths) <= innerWidth
     - Mobile: viewport becomes narrower than sum of min-widths → columns naturally stack

Concrete code changes (planned)
File: `supabase/functions/_shared/emailStyles.ts`
- In `styleMagazineLayouts()`:
  1. Add a small helper to parse padding shorthand:
     - Supports: `"24px"`, `"24px 16px"`, `"24px 16px 12px"`, `"24px 16px 12px 8px"`
     - Extract only px values; if non-px, fall back to 0 for safety.
  2. Compute:
     - `const innerWidth = 600 - paddingLeft - paddingRight;`
     - `const colOuterWidth = Math.floor(innerWidth / numColumns);`
  3. Update both rendering branches:
     - MSO table cells (`msoTableCells`) width and image normalization should use `colOuterWidth` and `colContentWidth`.
     - Non-MSO inline-block divs should use `width:${colOuterWidth}px` (and existing `max-width:100%`) and a `min-width` derived from `colOuterWidth` (not from 600).
  4. Update `normalizeColumnImages(...)` calls to use `colContentWidth` instead of `colOuterWidth`.

Optional cleanup (non-blocking but recommended)
- There are now duplicated, unused “styleMagazineLayouts / styleColumnLayoutTables” helper functions inside some send functions (e.g., `send-newsletter`, `send-test-newsletter`) that aren’t used because they call `applyEmailStyles(...)`.
- After the bug is fixed, we can remove those unused helpers to reduce confusion (not required to solve the wrapping issue).

How we’ll verify (end-to-end)
1) From Admin → Newsletter → Campaigns, use “Send Test” on a campaign that contains a magazine layout with background/padding.
2) Check desktop email rendering in your primary target client (Gmail on Safari/Mac per project standards):
   - Confirm magazine section stays side-by-side.
3) Check mobile (actual phone Gmail app or iOS Mail):
   - Confirm the same section stacks vertically.
4) If needed for quick debugging, inspect the stored HTML in Newsletter → Email Log:
   - Confirm the transformed markup shows column widths based on innerWidth (e.g., 276px per column when padding is 24px).

Risk/edge cases considered
- Background scope “text-only”: table padding still exists; the fix still applies because it uses the parsed padding from the table style.
- 3-column magazine layouts: innerWidth math generalizes; columns will compute to ~184px with 24px padding, and stack only when viewport is narrow.
- Non-px padding values: we’ll treat them as 0px to avoid NaN/negative widths (safe fallback).

PRE-CHANGE CHECKLIST (for when we switch to implementation)
□ Searched docs for: newsletter, two-column, magazine, data-two-column, padding, wrapping
□ Read files: docs/NEWSLETTER_SYSTEM.md, src/components/admin/newsletter/TwoColumnExtension.ts, supabase/functions/_shared/emailStyles.ts, src/components/admin/newsletter/NewsletterPreviewDialog.tsx
□ Searched code for: data-two-column, styleMagazineLayouts, data-bg-scope, padding:
□ Found patterns: yes — magazine table has padding:24px; email transform assumes 600px columns
□ Ready: yes
