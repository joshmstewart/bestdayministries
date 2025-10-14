# DIALOG BUTTON STANDARD

## Overview
Consistent delete and close button positioning across all dialog components for better UX and visual consistency.

## Standard Pattern

### Button Layout
All dialogs with delete/close actions must use this standardized layout:

```tsx
<DialogHeader>
  <div className="flex items-start gap-3">
    {/* Content area - takes up remaining space */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <DialogTitle className="text-2xl flex-shrink-0">{title}</DialogTitle>
        {/* Other title-level buttons (TTS, Edit, etc.) */}
      </div>
      
      {/* Metadata (author, date, etc.) */}
    </div>
    
    {/* Action buttons container - aligned to right */}
    <div className="flex items-center gap-2 flex-shrink-0">
      {/* Delete button (conditional) */}
      {canDelete && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
      )}
      
      {/* Close button (always present) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onOpenChange(false)}
        className="hover:bg-accent"
      >
        <X className="w-5 h-5" />
      </Button>
    </div>
  </div>
</DialogHeader>
```

### Key Properties

#### Container Structure
- **Outer flex:** `flex items-start gap-3`
  - `items-start`: Aligns buttons to top when content wraps
  - `gap-3`: Consistent spacing between content and buttons

#### Content Area
- **Class:** `flex-1 min-w-0`
  - `flex-1`: Takes remaining space
  - `min-w-0`: Prevents overflow, allows text truncation

#### Button Container
- **Class:** `flex items-center gap-2 flex-shrink-0`
  - `items-center`: Vertically aligns buttons
  - `gap-2`: Consistent spacing between delete and close
  - `flex-shrink-0`: Prevents buttons from shrinking

#### Delete Button (Conditional)
- **Variant:** `ghost`
- **Size:** `icon`
- **Icon:** `Trash2` at `w-5 h-5`
- **Class:** `text-destructive hover:text-destructive hover:bg-destructive/10`
- **Purpose:** Destructive action with red color scheme

#### Close Button (Always Present)
- **Variant:** `ghost`
- **Size:** `icon`
- **Icon:** `X` at `w-5 h-5`
- **Class:** `hover:bg-accent`
- **Purpose:** Non-destructive dialog dismissal

### DialogContent Changes
When using this pattern, remove the default close button from DialogContent:

**OLD (ui/dialog.tsx):**
```tsx
<DialogPrimitive.Content>
  {children}
  <DialogPrimitive.Close className="absolute right-4 top-4 ...">
    <X className="h-4 w-4" />
  </DialogPrimitive.Close>
</DialogPrimitive.Content>
```

**NEW (ui/dialog.tsx):**
```tsx
<DialogPrimitive.Content>
  {children}
  {/* No default close button - handled manually in header */}
</DialogPrimitive.Content>
```

### Accessibility
- **aria-describedby:** Set to `undefined` on DialogContent to avoid accessibility warnings when no description is present
  ```tsx
  <DialogContent aria-describedby={undefined}>
  ```

## Implementation Checklist

When updating a dialog:
- [ ] Remove default close button from ui/dialog.tsx
- [ ] Add button container in DialogHeader
- [ ] Use flex layout with `flex-1` content and `flex-shrink-0` buttons
- [ ] Position delete button (if applicable) before close button
- [ ] Use consistent icon sizing (`w-5 h-5`)
- [ ] Apply proper color classes (destructive for delete, accent for close)
- [ ] Add `aria-describedby={undefined}` if no DialogDescription
- [ ] Test button alignment on mobile and desktop
- [ ] Update Percy snapshots if visual changes

## Components Using This Standard
- ✅ `DiscussionDetailDialog.tsx` - Delete post + close (header buttons)
- ✅ `EventDetailDialog.tsx` - Close only (header button)
- ✅ `GuideViewer.tsx` - Close only (header button)
- ✅ `SponsorshipBreakdownDialog.tsx` - Close only (header button)
- ➖ `ImageCropDialog.tsx` - Uses footer buttons (Apply/Cancel) - not applicable
- ➖ `PasswordChangeDialog.tsx` - Uses footer buttons (Update/Cancel) - not applicable
- ➖ `ReportIssueDialog.tsx` - Uses footer buttons (Submit/Cancel) - not applicable
- ➖ `ImageLightbox.tsx` - Custom fullscreen viewer with absolute positioned close - special case

**Note:** Dialogs with primary actions in footer (e.g., forms with Submit/Cancel) don't need header close buttons as the footer provides clear dismissal options. Special UI patterns like fullscreen image viewers may use custom positioning as appropriate for their use case.

## Benefits
1. **Visual Consistency:** All dialogs have same button alignment
2. **Predictability:** Users know where to find close/delete
3. **Accessibility:** Clear action hierarchy with consistent sizing
4. **Responsive:** Layout adapts to content wrapping
5. **Maintainability:** Single source of truth for button patterns

## Common Mistakes to Avoid
❌ Using `justify-between` - causes misalignment when content wraps
❌ Different icon sizes across dialogs
❌ Mixing absolute and flex positioning
❌ Forgetting `flex-shrink-0` on button container
❌ Using `pr-10` padding instead of proper flex layout
