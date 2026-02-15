

## Fix Album Detail Dialog: Image Sizing and Arrow Visibility

### Problem 1: Vertical images not filling available space
The video elements are wrapped in `<div className="w-full h-full flex items-center justify-center">` containers, but images are rendered as a bare `<img>` tag. This means vertical/portrait images don't stretch to fill the available height the way videos do.

**Fix**: Wrap the image in the same container pattern used by videos.

### Problem 2: Navigation arrow icon disappearing
The buttons use `variant="ghost"` which applies `hover:text-accent-foreground` -- this overrides the custom `text-white` class on hover, changing the chevron icon color to the theme's accent foreground (a dark color that's invisible against the dark button background). This is why sometimes you see the white arrow and sometimes you don't -- it disappears on hover/tap.

**Fix**: Stop using `variant="ghost"` for these buttons. Use `variant={null}` or remove the variant entirely so no theme hover styles interfere with the custom styling.

---

### Technical Details

**File**: `src/components/AlbumDetailDialog.tsx`

**Change 1 -- Image wrapper** (lines 204-210):
```text
Before:
  <img src={...} className="max-w-full max-h-full object-contain" />

After:
  <div className="w-full h-full flex items-center justify-center">
    <img src={...} className="max-w-full max-h-full object-contain" />
  </div>
```

**Change 2 -- Navigation buttons** (lines 215-230):
Replace `variant="ghost"` with no variant, and ensure all colors are explicitly set so no theme styles can override them:
```text
Before:
  <Button variant="ghost" size="icon" className="... bg-black/70 hover:bg-black/90 text-white ...">

After:
  <Button size="icon" className="... bg-black/70 hover:bg-black/90 text-white hover:text-white ...">
```

Adding explicit `hover:text-white` ensures the icon stays white even on hover/tap, overriding any inherited styles.

