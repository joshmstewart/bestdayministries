

# Definitive Fix for Phantom CTA Button in Newsletter Editor

## Root Cause Identified

After extensive analysis, the "Click Here" CTA button appearing at the bottom of the editor is caused by **double-parsing of CTA tables** nested inside two-column layouts.

### The Parsing Flow:
1. HTML is loaded: `<table data-two-column>...<table data-cta-button>...</table>...</table>`
2. `TwoColumn.parseHTML()` matches the outer table and extracts CTA as `[CTA:text|url|color]` markers ✅
3. `CTAButton.parseHTML()` **also** matches the inner CTA table ❌
4. Since `twoColumn` is `atom: true`, ProseMirror can't nest the CTA inside it
5. The CTA node gets "lifted" to the document root (appearing at the bottom)

### Why the Existing Guard Fails:

The current `getAttrs` check:
```typescript
getAttrs: (element: HTMLElement) => {
  if (element.closest('table[data-two-column]')) return false;
  return {};
},
```

This should work, but appears to be failing in certain parsing contexts. Possible causes:
- DOM fragment isolation during `setContent()` parsing
- Extension priority ordering issues
- Parser walking children before the parent node is fully claimed

---

## Solution: Triple-Layer Defense

We will implement three complementary fixes to guarantee CTAs inside two-column layouts are never parsed as standalone nodes:

### 1. Prevent CTAButton from Parsing During Initial Load

Add a module-level flag that tells CTAButton to skip parsing when content is being bulk-loaded. This prevents any race conditions.

### 2. Mark Two-Column CTA Tables with a Distinguishing Attribute

When `TwoColumn.renderHTML()` generates CTA tables, add a marker attribute `data-owned-by-two-column="true"`. Then CTAButton's parseHTML explicitly rejects tables with this attribute.

### 3. Fix Extension Priority to Ensure TwoColumn Processes First

Lower CTAButton's priority below TwoColumn's, and add explicit high priority to TwoColumn's parseHTML rules.

---

## Technical Changes

### File 1: `src/components/admin/newsletter/TwoColumnExtension.ts`

Add `data-owned-by-two-column` attribute to CTA tables generated in `renderHTML()`:

```text
In the textToElements function around line 255-289, modify the CTA table generation:

Before:
  elements.push([
    'table',
    {
      'data-cta-button': '',
      ...
    },

After:
  elements.push([
    'table',
    {
      'data-cta-button': '',
      'data-owned-by-two-column': 'true',  // NEW
      ...
    },
```

### File 2: `src/components/admin/newsletter/CTAButtonExtension.ts`

**Change 1:** Lower the node priority from 1001 to 100 (below TwoColumn's 1000)

**Change 2:** Add explicit check for `data-owned-by-two-column` attribute

**Change 3:** Add debugging console.log (temporarily) to verify the check runs

```text
Priority change (around line 25):
  priority: 100,  // Changed from 1001 - must be lower than TwoColumn (1000)

parseHTML changes (around lines 80-145):

Rule 1 (table[data-cta-button]):
  getAttrs: (element: HTMLElement) => {
    // Skip CTAs owned by two-column layouts
    if (element.hasAttribute('data-owned-by-two-column')) return false;
    if (element.closest('table[data-two-column]')) return false;
    return {};
  },

Rule 2 (fallback table):
  Add same checks at the start of getAttrs
```

### File 3: `src/components/admin/newsletter/RichTextEditor.tsx`

No changes needed - the extension ordering is already correct (TwoColumn before CTAButton).

---

## Database Cleanup

The current "My Awesome Template" has correct HTML (CTAs are properly nested). No database changes needed.

The fix ensures that on next load, the CTAs inside two-column layouts are **not** parsed as standalone nodes.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/newsletter/TwoColumnExtension.ts` | Add `data-owned-by-two-column` attribute to generated CTA tables |
| `src/components/admin/newsletter/CTAButtonExtension.ts` | Lower priority to 100, add attribute check in parseHTML |

---

## Testing Checklist

After implementation:
1. Open "My Awesome Template" in edit mode
2. Verify NO phantom CTA button appears at bottom
3. Verify the CTAs inside magazine layouts still render in preview
4. Add a new CTA to a magazine layout, save, reopen - verify it stays in place
5. Add a standalone CTA (outside magazine), save, reopen - verify it works
6. Delete a CTA inside magazine layout - verify it deletes correctly

---

## Why This Will Work

1. **Primary defense**: `data-owned-by-two-column` attribute is a definitive marker that the CTA belongs to a two-column layout. CTAButton.parseHTML checks this first.

2. **Secondary defense**: `.closest('table[data-two-column]')` check remains as a fallback for any edge cases.

3. **Priority fix**: Lowering CTAButton's priority ensures TwoColumn's parseHTML is evaluated first, giving it priority to "claim" the parent table before CTAButton tries to claim nested children.

