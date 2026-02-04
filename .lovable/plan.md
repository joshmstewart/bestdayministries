
# Fix Magazine CTA Centering on Mobile

## Problem
CTA buttons inside magazine (two-column) layouts appear left-aligned when columns stack on mobile. The issue is that:
- CTA tables have `margin: 16px 0;` (no horizontal auto margins)
- Adding `text-align: center` to the parent div doesn't center table elements
- Tables require explicit `margin: auto` to center horizontally

## Solution
Update the email transformation in `styleMagazineLayouts()` to:
1. **Revert** the `text-align: center` on column divs (this was breaking text alignment)
2. **Add** a post-processing step to center CTA tables specifically within magazine columns by applying `margin-left: auto; margin-right: auto;` to any `table[data-cta-button]` found inside the column content

This approach:
- Keeps paragraph text left-aligned for readability on both desktop and mobile
- Centers only CTA buttons when columns stack on mobile
- Works correctly in Gmail (Safari/Mac) which is the primary target client

## Technical Changes

**File: `supabase/functions/_shared/emailStyles.ts`**

In `styleMagazineLayouts()`:
1. Remove `text-align:center;` from the inline-block div styles (line ~782)
2. Add a helper function to center CTA tables within column content:
   ```typescript
   const centerCTATablesInColumn = (html: string): string => {
     return html.replace(
       /<table\b([^>]*data-cta-button[^>]*)style="([^"]*)"/gi,
       (match, beforeStyle, existingStyle) => {
         // Add margin auto if not already present
         if (/margin[^:]*:\s*[^;]*auto/i.test(existingStyle)) {
           return match;
         }
         return `<table${beforeStyle}style="${existingStyle};margin-left:auto;margin-right:auto;"`;
       }
     );
   };
   ```
3. Apply this helper to the `styledContent` in both MSO and non-MSO column rendering paths

## Expected Outcome
- **Desktop**: Columns remain side-by-side, text left-aligned, CTAs left-aligned (consistent with current desktop behavior)
- **Mobile**: Columns stack vertically, text left-aligned for readability, CTAs centered within their column

## Deployment
After code changes, redeploy the newsletter edge functions:
- `send-newsletter`
- `send-test-newsletter`
- `send-automated-campaign`
- `send-test-automated-template`

## Verification
Send a test email with a magazine layout containing a CTA button. Check:
1. Desktop Gmail: columns side-by-side, CTA positioned normally
2. Mobile Gmail: columns stacked, CTA centered within column width
