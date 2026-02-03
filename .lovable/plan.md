
# Fix Stuck CTA Button in Newsletter Editor

## Problem Summary

The "Click Here" CTA button in "My Awesome Template" is completely stuck - it cannot be deleted via the X button, cannot be edited, and keyboard commands don't work. This makes the editor unusable for this template.

## Root Cause Analysis

1. **Missing `selectable` property**: Atom nodes need `selectable: true` to be properly selected with a click
2. **`getPos()` returning invalid values**: The delete handler fails silently because the node position isn't reliable when clicking the X button
3. **Event swallowing**: ProseMirror is capturing/blocking mouse events before React can handle them
4. **No NodeSelection support**: Keyboard shortcuts (Backspace/Delete) don't work because the node can't be selected

## Solution Overview

### Phase 1: Immediate Database Fix (Get You Unstuck Now)
Remove the rogue CTA button directly from the template's HTML content in the database.

### Phase 2: Code Fixes (Prevent Future Issues)
1. Add `selectable: true` to CTAButtonExtension
2. Implement proper NodeSelection-based deletion
3. Add a more aggressive event handling strategy for the delete button
4. Add a global "select and delete node" keyboard handler

---

## Technical Implementation

### 1. Database Fix - Remove Stuck CTA

Update the template's `html_content` to remove the standalone CTA table at the end:

```sql
-- The stuck CTA is at the very end of the HTML content
-- We'll update the template to remove it
UPDATE newsletter_templates 
SET html_content = REPLACE(
  html_content, 
  '<table data-cta-button="" cellpadding="0" cellspacing="0" border="0" style="margin: 16px auto;"><tbody><tr><td align="center" style="background-color: rgb(249, 115, 22); border-radius: 6px;"><a href="#" target="_blank" style="display: inline-block; padding: 12px 24px; color: white; text-decoration: none; font-weight: bold; font-size: 16px;">Click Here</a></td></tr></tbody></table>',
  ''
)
WHERE name = 'My Awesome Template';
```

### 2. CTAButtonExtension.ts Changes

```typescript
// Add selectable property for proper node selection
selectable: true,  // NEW - allows clicking to select the node

// Add to addKeyboardShortcuts:
// Handle Delete/Backspace when CTA is selected (via NodeSelection)
Backspace: () => {
  const { selection } = this.editor.state;
  
  // Check if a CTA node is selected via NodeSelection
  if (selection.node?.type.name === this.name) {
    return this.editor.commands.deleteSelection();
  }
  
  // Existing logic for cursor-adjacent deletion...
},
```

### 3. CTAButtonNodeView.tsx Changes

```typescript
// Import NodeSelection for proper node selection handling
import { NodeSelection } from '@tiptap/pm/state';

// Updated delete handler with multiple fallback strategies
const handleDelete = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  
  // Strategy 1: Direct ProseMirror transaction (most reliable)
  if (editor && typeof getPos === 'function') {
    const pos = getPos();
    if (typeof pos === 'number' && pos >= 0) {
      try {
        const tr = editor.state.tr.delete(pos, pos + node.nodeSize);
        editor.view.dispatch(tr);
        return;
      } catch (err) {
        console.warn('Transaction delete failed:', err);
      }
    }
  }
  
  // Strategy 2: Select the node and delete selection
  if (editor && typeof getPos === 'function') {
    const pos = getPos();
    if (typeof pos === 'number' && pos >= 0) {
      try {
        const nodeSelection = NodeSelection.create(editor.state.doc, pos);
        const tr = editor.state.tr.setSelection(nodeSelection);
        editor.view.dispatch(tr);
        editor.commands.deleteSelection();
        return;
      } catch (err) {
        console.warn('NodeSelection delete failed:', err);
      }
    }
  }
  
  // Strategy 3: TipTap's deleteNode helper
  if (typeof deleteNode === 'function') {
    deleteNode();
    return;
  }
  
  // Strategy 4: Force focus and use command
  editor?.chain().focus().deleteNode('ctaButton').run();
};

// Add click handler on the wrapper to select the node
const handleWrapperClick = (e: React.MouseEvent) => {
  // Only if clicking the wrapper (not the delete button)
  if (editor && typeof getPos === 'function') {
    const pos = getPos();
    if (typeof pos === 'number' && pos >= 0) {
      try {
        const nodeSelection = NodeSelection.create(editor.state.doc, pos);
        const tr = editor.state.tr.setSelection(nodeSelection);
        editor.view.dispatch(tr);
      } catch (err) {
        // Ignore selection errors
      }
    }
  }
};
```

### 4. Add Visual Selection Indicator (editor-styles.css)

```css
/* Show selection ring when CTA button is selected */
.ProseMirror .cta-button-wrapper[data-selected="true"] > div,
.ProseMirror table[data-cta-button].ProseMirror-selectednode {
  outline: 3px solid hsl(var(--primary));
  outline-offset: 2px;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| Database | Remove stuck CTA from "My Awesome Template" |
| `src/components/admin/newsletter/CTAButtonExtension.ts` | Add `selectable: true`, improve keyboard shortcuts |
| `src/components/admin/newsletter/CTAButtonNodeView.tsx` | Multi-strategy delete handler, click-to-select |
| `src/components/admin/newsletter/editor-styles.css` | Selection indicator styling |

---

## Testing Checklist

After implementation:
1. Open "My Awesome Template" - verify stuck "Click Here" is gone
2. Add a new CTA button to any template
3. Click on CTA - verify it shows selection ring
4. Click X button - verify it deletes
5. Select CTA and press Backspace - verify it deletes
6. Try CTAs inside two-column layouts - verify they still work
7. Save and reopen template - verify CTA persists correctly

---

## Expected Outcome

- Immediate fix: The stuck "Click Here" CTA will be removed from the database
- Future prevention: CTA buttons will be properly selectable and deletable via:
  - X button (hover and click)
  - Keyboard (Backspace/Delete when selected)
  - Click to select, then delete
