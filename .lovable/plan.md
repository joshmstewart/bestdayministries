
Context / what we now know (from the actual logged email HTML)
- The newest entry in `newsletter_emails_log` still contains the raw editor tables:
  - `table.newsletter-table[data-columns][data-mobile-stack]` is still present (and even has `data-columns="2"` while containing 3 `<td>`s).
  - The “Walk With Us” `data-columns="3"` table is also still present.
- Those tables include nested CTA tables (`<table data-cta-button>…</table>`) and nested `<tr>`/`<td>` inside them.
- The column-table transformer in `supabase/functions/_shared/emailStyles.ts` currently uses regex patterns that assume:
  1) it can match an entire `<table …>…</table>` with `([\s\S]*?)</table>` and
  2) it can find the “first row” with `/<tr …>([\s\S]*?)<\/tr>/`
- Both assumptions are false when nested CTA tables exist:
  - The table-level regex stops at the first nested `</table>` (the CTA), so the “tableContent” passed into the callback is incomplete.
  - The row-level regex stops at the first nested `</tr>` (also inside the CTA table), so the “row” passed to TD extraction is incomplete.
  - With an incomplete row, the depth-based `<td>` extractor often returns 0 segments (because it never sees the matching outer `</td>`), and the function returns `fullMatch` (no transformation), leaving the original `data-columns` table untouched.
- Separate but important: some column cells contain images with `width="600px"` attributes. Even if columns were transformed, Gmail can prioritize the width attribute, causing overflow/overlap. We need to override/remove width attributes inside multi-column cells.

Root cause (why the issues still look exactly the same)
- We fixed “nested <td> parsing” but the transformer is still failing earlier at “nested <table>/<tr> parsing.”
- Because the transformation bails out (no reliable top-level row extracted), the raw `data-columns` tables remain, which is why:
  - 3-column blocks can overlap (images inside cells still declare 600px width)
  - at least one magazine block can lose content (same nested-table matching problem exists in `styleMagazineLayouts()`)

What I will change (implementation approach)
A) Replace regex-based “whole table” and “first row” extraction with depth-based, nested-safe scanning
1) Add small, dependency-free parsing helpers inside `supabase/functions/_shared/emailStyles.ts`:
   - find the end of an opening tag (`>`) while respecting quoted attributes
   - find a matching closing tag for `<table>` using a depth counter for nested `<table>`/`</table>`
   - extract the first top-level `<tr>…</tr>` within a table while ignoring `<tr>` tags inside nested tables (tracked via table-depth)
   - keep the existing `extractTopLevelTdHtml()` for `<td>` segments (it’s the right idea), but feed it a correct “outer row” string

2) Rewrite `styleColumnLayoutTables()` to:
   - Iterate through the HTML and locate *complete* `table[data-columns]` blocks using the nested-safe `<table>` depth parser (not regex).
   - For each found table:
     - Determine if it has `data-mobile-stack="true"`
     - Extract the first top-level row safely (not regex)
     - Extract top-level TD segments from that row
     - Use the *actual* TD count (since your “data-columns=2 but has 3 cells” case is real)
     - Rebuild either:
       - Fixed desktop table layout (non-stacking) using `<table width="600" style="max-width:600px;table-layout:fixed">` and `<td width="200">`
       - Fluid-hybrid (stacking) layout using a nested-safe wrapper, but ensuring the outer wrapper is responsive (`width="100%"` + `max-width:600px`) while each column gets a pixel max width
   - Normalize images inside each cell more aggressively:
     - Remove or override `width="600px"` attributes in column images
     - Set `width` attribute to the column pixel width when possible (e.g., 200)
     - Add inline style: `width:100%;height:auto;display:block;max-width:100%;`
     - This is specifically to stop Gmail from letting a 600px image force overflow and cause “overlapping columns.”

B) Fix `styleMagazineLayouts()` with the same nested-safe table + row extraction
- `styleMagazineLayouts()` currently uses regex for both full table and first row, which is vulnerable to nested CTA tables as well.
- I’ll refactor it to:
  - Find complete `table[data-two-column]` segments via the same nested-safe table parser
  - Extract the correct first top-level `<tr>` (ignoring nested CTA `<tr>`)
  - Extract top-level `<td>` segments from that row and rebuild the wrapper
  - Preserve the table’s background/padding/border-radius from the original `style=""` on the source table (current behavior), but without losing any nested CTA/table content
  - Apply the same “image width attribute override” inside each magazine column

C) Keep existing safety rules
- Keep skipping `table[data-cta-button]` in `styleStandardTablesOnly()` (so CTA button padding stays consistent).
- Keep overall processing order in `applyEmailStyles()`:
  1) standard tables
  2) column layouts
  3) magazine layouts
  4) CTA touch-ups (font-family)
  5) typography normalization

Files that will change
- `supabase/functions/_shared/emailStyles.ts`
- Documentation update (to prevent regressions):
  - `docs/NEWSLETTER_SYSTEM.md` (add “Never regex-match table blocks; use depth-based parsing because nested CTA tables exist”)
  - (Optional) `docs/MASTER_SYSTEM_DOCS.md` (same note in the newsletter section)

How we will verify (objective checks, not “looks better”)
1) Database proof (before even opening Gmail)
- Send a new test email.
- Open the newest `newsletter_emails_log.html_content` and confirm:
  - The raw `table.newsletter-table[data-columns]` blocks are gone (or at least no longer contain `data-columns=` / `newsletter-table`).
  - The transformed output contains:
    - wrapper `<table role="presentation" … max-width:600px …>`
    - a single `<tr>` containing N sibling `<td width="…">` cells
  - Images inside multi-column cells do NOT have `width="600px"` anymore.

2) Real client proof (your target)
- Gmail on Safari/Mac:
  - The “What’s Growing” multi-column section (the one that currently overlaps) should show clean columns with no overlap.
  - The “Walk With Us” 3-CTA section should show 3 evenly spaced columns.
  - The magazine block that was missing text/CTA should show both text and CTA in the correct column.

3) Regression checks
- 2-column and 3-column blocks render correctly
- “Stack on Mobile” still stacks on narrow screens (and doesn’t break desktop)

Why this is the “new” fix compared to before
- Previously we only made `<td>` extraction nested-safe.
- The real blocker is upstream: extracting the correct *full table* and correct *top-level row* when nested CTA tables exist.
- This plan fixes table-level and row-level nesting so the transformer actually runs, and then additionally fixes the image width attribute issue that can cause overlap even when the table structure is correct.
