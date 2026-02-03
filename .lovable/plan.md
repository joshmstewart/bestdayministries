
# Plan: Fix Magazine Layout Persistence and Re-editing

## Problem Summary

When you save a template with a Magazine Layout block and reopen it:
1. The block becomes a "normal table" instead of the Magazine Layout
2. This loses the Crop/Replace image buttons and background color picker
3. Saving again after editing text breaks the formatting in Preview

## Root Cause Analysis

The issue is a **parsing priority conflict** between two TipTap extensions:

```text
┌─────────────────────────────────────────────────────────────┐
│  Saved HTML:  <table data-two-column data-layout="...">    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │   Which extension claims it?     │
        └──────────────────────────────────┘
               │                    │
               ▼                    ▼
     ┌──────────────┐      ┌───────────────┐
     │ TwoColumn    │      │ Table         │
     │ (no priority)│      │ (no priority) │
     └──────────────┘      └───────────────┘
               │                    │
               │    ← RACE CONDITION →
               │                    │
               └────────────────────┘
                         │
                         ▼
            ┌─────────────────────────────┐
            │  Table extension wins       │
            │  (appears earlier in list)  │
            └─────────────────────────────┘
```

**Key Problems:**

1. **Priority Conflict**: The `Table` extension (line 213-218) is registered BEFORE `TwoColumn` (line 228). When TipTap parses `<table data-two-column>`, the generic Table extension matches first because it matches any `<table>`.

2. **Text Content Loss**: The `parseHTML` functions for `leftContent` and `rightContent` use crude regex stripping that loses formatting structure.

3. **Re-serialization Damage**: Once parsed as a generic table, any edit causes TipTap to serialize it without the `data-two-column` attributes.

---

## Solution Overview

### Step 1: Give TwoColumn Higher Priority

Set `priority: 1000` on the TwoColumn extension so it matches `<table data-two-column>` BEFORE the generic Table extension can claim it.

### Step 2: Improve parseHTML Attribute Extraction

Make the `parseHTML` functions more robust for `leftContent`, `rightContent`, `imageUrl`, and `backgroundColor` so they correctly extract saved values.

### Step 3: Add Defensive Check in Editor

Reset the `isInitialLoad` ref when content changes externally (template reopen) to prevent premature re-serialization.

---

## Technical Details

### File 1: `src/components/admin/newsletter/TwoColumnExtension.ts`

**Changes:**

1. Add `priority: 1000` to ensure TwoColumn is matched before Table
2. Improve `parseHTML` for `backgroundColor` to handle both table-level and nested parsing
3. Make `leftContent`/`rightContent` parsing more resilient

```typescript
// Add priority to the extension definition
export const TwoColumn = Node.create<TwoColumnOptions>({
  name: 'twoColumn',
  group: 'block',
  atom: true,
  priority: 1000,  // ← NEW: Higher than Table's default (100)
  // ... rest unchanged
```

### File 2: `src/components/admin/newsletter/RichTextEditor.tsx`

**Changes:**

1. Move `TwoColumn` BEFORE `Table` in the extensions array (belt-and-suspenders approach)
2. Reset `isInitialLoad` when content prop changes to prevent stale state

```typescript
// Reorder extensions - TwoColumn before Table
extensions: [
  StarterKit.configure({ ... }),
  ResizableImage,
  TwoColumn,        // ← MOVE BEFORE Table
  Table.configure({ ... }),
  // ... rest
]
```

---

## Expected Outcome

After these changes:

| Step | Before Fix | After Fix |
|------|------------|-----------|
| Save template | Works | Works |
| Reopen template | Becomes normal table | Stays Magazine Layout |
| Crop/Replace buttons | Disappear | Always visible |
| Background color picker | Disappears | Always visible |
| Edit text + save again | Breaks preview | Preserves formatting |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/newsletter/TwoColumnExtension.ts` | Add `priority: 1000`, improve parseHTML robustness |
| `src/components/admin/newsletter/RichTextEditor.tsx` | Reorder extensions, fix isInitialLoad reset |
