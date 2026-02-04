
Goal
- Fix the delivered-email HTML transform so 3-column “Insert Columns” layouts render as 3 columns on one desktop row in Gmail (Safari/Mac), and stop breaking nested CTA button tables and typography.

What’s actually broken (verified)
- The backend email transformer currently parses `table[data-columns]` using a naive regex:
  - `/<td\b[^>]*>([\s\S]*?)<\/td>/gi`
- This fails as soon as a column contains a nested table (CTA buttons are tables with their own `<td>`). The regex “closes” at the nested `</td>` and slices the outer cell incorrectly.
- Evidence from the most recent email log snippet (newsletter_emails_log) shows corrupted output where the rebuilt first column `<td style="width:33%...">` contains stray `</td><td colspan="1" ...>` from the original markup, which is exactly how you get:
  - first column on its own line (Gmail interprets broken table structure)
  - next two columns side-by-side on the next row and huge

Scope of fix
- Backend email HTML processing only (Lovable Cloud backend functions)
- Primary change: rewrite `styleColumnLayoutTables()` in `supabase/functions/_shared/emailStyles.ts` so it never regex-extracts `<td>...</td>` blindly.
- Secondary change: adjust percentage math to use precise widths (33.33%) instead of `Math.floor(100/3)=33%`.

Pre-change checklist (MANDATORY before edits in implementation mode)
- PRE-CHANGE CHECKLIST:
  □ Searched docs for: newsletter, data-columns, Stack on Mobile, CTA button, emailStyles
  □ Read files: supabase/functions/_shared/emailStyles.ts, src/components/admin/newsletter/RichTextEditor.tsx, src/components/admin/newsletter/NewsletterPreviewDialog.tsx, src/components/admin/newsletter/CTAButtonExtension.ts, src/components/admin/newsletter/ctaButtonStyles.ts
  □ Searched code for: data-columns, data-mobile-stack, styleColumnLayoutTables, data-cta-button
  □ Found patterns: yes — preview uses fixed table layout for data-columns and 33.33% for 3 columns; columns inserted as <table data-columns="3" ...><tr><td ...>...</td>...</tr></table>
  □ Ready: yes

Implementation design (what I will change)
1) Add a safe “top-level TD extractor” utility (depth-based, not regex)
- Create a helper inside `emailStyles.ts` that can extract only the top-level `<td>...</td>` segments for a given row’s inner HTML, similar to the approach already used for magazine layouts.
- Key property: nested CTA `<td>` tags increment depth and do not terminate the outer cell early.

2) Fix `styleColumnLayoutTables()` for BOTH modes
A) Non-stacking tables (no `data-mobile-stack="true"`)
- Current behavior rebuilds the whole table using broken `tdRegex`.
- New behavior:
  - Read `data-columns` to determine intended column count.
  - Find the first `<tr>...</tr>` (column layouts created by the editor are single-row).
  - Extract top-level `<td>` segments from that row safely.
  - Rebuild a clean wrapper table (max-width 600, centered, table-layout:fixed).
  - For each column cell:
    - Preserve the original cell’s inline styles (padding/border/background) as authored in the editor.
    - Only add/override:
      - `width: 33.33%` (or computed `toFixed(2)` for 2/3 columns)
      - `vertical-align: top`
    - Normalize images inside the cell to `width:100%; height:auto; display:block;` (already done).

B) “Stack on Mobile” tables (`data-mobile-stack="true"`)
- Current behavior also uses the same broken `tdRegex` extraction and is therefore just as vulnerable.
- New behavior:
  - Use the same safe top-level `<td>` extraction.
  - Build a “fluid-hybrid” structure WITHOUT relying on parsing that can be broken by nested tables.
  - Additionally, I’ll remove newline/whitespace between inline-block elements in the generated HTML (join without `\n`) and keep the container `font-size:0;letter-spacing:0;word-spacing:0;` to prevent accidental wrapping from whitespace.
  - If needed for Gmail reliability, switch the outer wrapper from `<div style="display:inline-block...">` to an inline-block `<table ... style="display:inline-block...">` (tables tend to be more consistently handled by Gmail than inline-block divs inside table cells).

3) Fix column width rounding everywhere it matters
- Replace `Math.floor(100 / numColumns)` with:
  - `const colWidth = (100 / numColumns).toFixed(2);`
- Apply to:
  - `styleColumnLayoutTables()` fixed-table mode
  - (Optional but recommended) `styleMagazineLayouts()` currently uses `Math.floor` too; I’ll update it for consistency, even though your current break is clearly in `data-columns`.

4) Keep CTA buttons consistent
- CTA button HTML already contains correct padding + `font-size:14px` from `CTAButtonExtension.ts` and the shared sizing constants.
- The main reason buttons “don’t look the same” in your current emails is the column transformer is breaking CTA tables by mis-parsing `<td>`.
- After the column parsing fix, CTA tables should remain intact and render the same as preview.
- I will keep `styleStandardTablesOnly()` excluding `table[data-cta-button]` (this is correct and matches the preview rules).

Verification plan (how we’ll prove it’s fixed)
1) Backend verification (no guessing)
- Send a test email again.
- In the backend logs table (`newsletter_emails_log`), inspect the processed HTML around the 3-column section and confirm:
  - The transformed output contains exactly 3 sibling column `<td>`s in the same `<tr>`
  - Each has `width:33.33%` (or 33.34/33.33 split depending on rounding strategy, but we’ll use consistent 2-decimal)
  - There are no stray `</td><td colspan=...` fragments inside a column cell

2) Real client verification (your environment)
- Open the test email in Gmail on Safari/Mac and confirm:
  - 3 columns appear on one row on desktop
  - columns are not enormous
  - buttons inside the columns match preview sizing and shape

3) Regression checks
- 2-column layout still works
- “Stack on Mobile” still stacks on narrow screens (mobile preview and an actual mobile Gmail if available)

Files that will be modified (implementation mode)
- Primary:
  - `supabase/functions/_shared/emailStyles.ts` (rewrite `styleColumnLayoutTables`; adjust rounding; possibly refactor shared TD-extraction helper)
- Optional consistency:
  - `docs/NEWSLETTER_SYSTEM.md` (document the new “top-level TD safe parsing” rule for `data-columns` tables so we don’t regress)

Rollout / risk
- Low risk to other systems: changes are isolated to newsletter email HTML processing.
- High confidence: we have direct proof in the stored email HTML that the current parsing is corrupting the table; the depth-based extraction addresses the exact failure mode (nested `<td>` inside CTA tables).

One quick clarification (not blocking, but helpful)
- In your 3-column block, is “Stack on Mobile” enabled (the 📱 toggle on that table), and do any of the columns contain CTA buttons?
  - This helps validate we hit both code paths (stacking + non-stacking), but the fix will cover both regardless.
