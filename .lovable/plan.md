

## Newsletter Mobile Layout & Preview Plan

### Problem Analysis

Based on your screenshots and the codebase exploration, there are two issues:

1. **Mobile Layout Problem**: Multi-column layouts (both `data-columns` tables and `data-two-column` magazine layouts) display side-by-side on mobile, causing content to be cramped and hard to read
2. **Preview Gap**: No way to see how emails will render on mobile devices without actually sending a test email

---

### Part 1: Mobile Layout Solutions

#### The Challenge
Email clients have limited CSS support - most notably, many don't support `@media` queries for responsive layouts. This means we need to be strategic about how we handle mobile responsiveness.

#### Option A: CSS Media Queries (Limited Support)
- Add `@media (max-width: 480px)` rules to stack columns vertically
- **Pros**: Clean solution, no extra markup
- **Cons**: Gmail web/app, some Outlook versions, and older clients ignore media queries entirely
- **Email client support**: ~60-70% of recipients

#### Option B: Hybrid Approach with Table Structure (Recommended)
Use a technique called "spongy" or "fluid-hybrid" email design:
- Each column becomes its own `<table>` wrapped in a container
- Uses `display: inline-block` and `max-width` to flow naturally
- Falls back gracefully on clients without media query support

```html
<!-- Instead of one table with multiple columns -->
<table width="100%" style="max-width:600px;margin:0 auto;">
  <tr>
    <td>
      <!-- Column 1 wrapper -->
      <div style="display:inline-block;width:100%;max-width:200px;">
        <table width="100%">...</table>
      </div>
      <!-- Column 2 wrapper -->
      <div style="display:inline-block;width:100%;max-width:200px;">
        <table width="100%">...</table>
      </div>
    </td>
  </tr>
</table>
```

#### Option C: User-Controlled Mobile Behavior
Add a toggle in the editor for each column layout:
- **"Stack on Mobile"** checkbox/toggle
- Adds a `data-mobile-stack` attribute to the table
- Edge functions detect this and apply the hybrid wrapping technique only where requested
- This preserves data tables (like schedules or pricing grids) that should NOT stack

**Recommended: Combine Options B + C**
- Default multi-column layouts to "stack on mobile"
- Add a UI control to disable stacking for true data tables
- Implement the hybrid approach in edge functions

---

### Part 2: Mobile Preview Feature

#### Implementation Approach

Add a viewport toggle to the existing `NewsletterPreviewDialog`:

```text
+----------------------------------+
|  📧 Email Preview      [📱] [💻] |
+----------------------------------+
|  Subject: ...                    |
+----------------------------------+
|                                  |
|   [Simulated email content]      |
|   Width: 375px (mobile) or       |
|   600px (desktop)                |
|                                  |
+----------------------------------+
```

**Technical Details:**
1. Add state for viewport mode: `'desktop' | 'mobile'`
2. Add toggle buttons in the dialog header
3. Constrain the preview container width based on mode:
   - Desktop: 600px (standard email width)
   - Mobile: 375px (iPhone standard)
4. Apply mobile-specific CSS rules to the preview when in mobile mode

#### Preview CSS for Mobile Simulation
When mobile preview is active, inject additional styles that simulate what media queries would do:

```css
/* Mobile simulation styles */
.email-preview.mobile-mode table[data-columns] td,
.email-preview.mobile-mode table[data-two-column] td {
  display: block !important;
  width: 100% !important;
}
```

---

### Technical Implementation

#### Files to Modify

1. **`src/components/admin/newsletter/NewsletterPreviewDialog.tsx`**
   - Add viewport toggle state and buttons
   - Add mobile preview CSS rules
   - Constrain preview width based on mode

2. **`src/components/admin/newsletter/RichTextEditor.tsx`**
   - Add "Stack on Mobile" toggle when inserting columns
   - Add `data-mobile-stack="true"` attribute to column tables by default

3. **Edge Functions** (all 4 newsletter send functions)
   - Detect `data-mobile-stack` attribute
   - Apply hybrid email technique for responsive stacking
   - Add `<style>` block with media queries as fallback

4. **Documentation Updates**
   - `docs/NEWSLETTER_SYSTEM.md` - document mobile behavior
   - `docs/MASTER_SYSTEM_DOCS.md` - update newsletter section

---

### Summary

| Feature | What It Does | Complexity |
|---------|-------------|------------|
| Mobile Preview Toggle | See layout at 375px width in preview dialog | Low |
| Mobile CSS Simulation | Preview applies stacking rules | Low-Medium |
| Hybrid Email Technique | Columns stack on mobile in actual emails | Medium |
| User Control Toggle | Choose which layouts stack on mobile | Medium |

**Recommended First Phase:**
1. Add mobile preview toggle to dialog
2. Add mobile simulation CSS to preview
3. Add hybrid responsive technique to edge functions (default ON for `data-columns` tables)

**Phase 2:**
4. Add "Stack on Mobile" toggle in column insertion dialog
5. Handle magazine layouts similarly

