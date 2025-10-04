# IMAGE LIGHTBOX COMPONENT - COMPLETE DOCUMENTATION

## Overview
The `ImageLightbox` component (`src/components/ImageLightbox.tsx`) displays images in a full-screen overlay with navigation controls. It uses **different UI components for mobile and desktop** to ensure optimal user experience on each platform.

---

## MOBILE VS DESKTOP RENDERING

### Mobile Detection
- Uses `useIsMobile()` hook from `src/hooks/use-mobile.tsx`
- Breakpoint: **768px** (anything below is considered mobile)
- Returns `true` for mobile, `false` for desktop

### Mobile Implementation
**Component Used:** `Drawer` from `vaul` library
- **Why Drawer?** Designed specifically for mobile full-screen experiences
- **Dismissible:** Set to `false` to prevent swipe-to-close gesture from interfering with navigation buttons
- **Container:** `DrawerContent` with `h-screen border-0 rounded-none`

```tsx
<Drawer open={isOpen} onOpenChange={onClose} dismissible={false}>
  <DrawerContent className="h-screen border-0 rounded-none">
    {imageContent}
  </DrawerContent>
</Drawer>
```

**Key Classes:**
- `h-screen` - Full viewport height (100vh)
- `border-0` - Removes default border
- `rounded-none` - Removes rounded corners for true full-screen

### Desktop Implementation
**Component Used:** `Dialog` from `@radix-ui/react-dialog`
- **Why Dialog?** Standard modal pattern for desktop
- **Container:** `DialogContent` with size constraints

```tsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto p-0 overflow-hidden">
    {imageContent}
  </DialogContent>
</Dialog>
```

**Key Classes:**
- `max-w-[95vw]` - Maximum 95% of viewport width
- `max-h-[95vh]` - Maximum 95% of viewport height
- `w-auto` - Width adjusts to content
- `p-0` - No padding (image fills container)
- `overflow-hidden` - Prevents scrollbars

---

## CONTAINER STRUCTURE & SIZING

### Outer Container
```tsx
<div className={`relative w-full ${isMobile ? 'h-screen' : 'h-full'} flex items-center justify-center bg-black/95`}>
```

**Mobile:**
- `h-screen` - Full viewport height (critical for mobile)
- Ensures container fills entire screen

**Desktop:**
- `h-full` - Fills parent (DialogContent)
- Parent already has `max-h-[95vh]` constraint

**Common:**
- `relative` - Positions child elements absolutely
- `w-full` - Full width of parent
- `flex items-center justify-center` - Centers content
- `bg-black/95` - Nearly opaque black background

### Image Container
```tsx
<div className={`flex items-center justify-center ${isMobile ? 'h-full pt-14 pb-14' : 'w-full h-[95vh] p-16'}`}>
```

**Mobile:**
- `h-full` - Fills parent container height
- `pt-14 pb-14` - Top/bottom padding (56px each) for UI controls

**Desktop:**
- `w-full h-[95vh]` - Fills width and height
- `p-16` - 64px padding all around for UI controls

**Common:**
- `flex items-center justify-center` - Centers image

### Image Element
```tsx
<img
  src={currentImage.image_url}
  alt={currentImage.caption || `Image ${currentIndex + 1}`}
  className={isMobile ? "max-h-full w-auto object-contain" : "max-w-full max-h-full w-auto h-auto object-contain"}
/>
```

**Mobile:**
- `max-h-full` - Never exceeds container height
- `w-auto` - Width adjusts to maintain aspect ratio
- `object-contain` - Image fits within bounds without cropping

**Desktop:**
- `max-w-full max-h-full` - Constrained by container dimensions
- `w-auto h-auto` - Dimensions adjust to maintain aspect ratio
- `object-contain` - Image fits within bounds without cropping

---

## NAVIGATION CONTROLS

### Close Button
**Position:** Top-right corner

**Mobile:**
```tsx
className="absolute top-2 right-2 z-50 bg-black/50 hover:bg-black/70 text-white"
<X className="w-5 h-5" />
```

**Desktop:**
```tsx
className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white"
<X className="w-6 h-6" />
```

### Previous/Next Buttons
**Position:** Left and right sides, vertically centered

**Mobile:**
```tsx
className="absolute left-2 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white w-12 h-12"
onClick={(e) => {
  e.stopPropagation();
  onPrevious();
}}
<ChevronLeft className="w-6 h-6" />
```

**Desktop:**
```tsx
className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white"
onClick={(e) => {
  e.stopPropagation();
  onNext();
}}
<ChevronLeft className="w-8 h-8" />
```

**Critical Implementation Details:**

1. **Size on Mobile:** `w-12 h-12` (48px × 48px)
   - Larger touch targets for better mobile usability
   - Meets accessibility guidelines (min 44px)

2. **Event Propagation:** `e.stopPropagation()`
   - **WHY:** Prevents clicks from bubbling to parent containers
   - **CRITICAL:** Without this, Drawer/Dialog close handlers may interfere
   - **Result:** Ensures buttons work reliably without triggering unintended actions

3. **Z-Index:** `z-50`
   - Ensures buttons appear above image and other elements

4. **Background:** `bg-black/50 hover:bg-black/70`
   - Semi-transparent background improves visibility
   - Hover state provides feedback

### Image Counter
**Position:** Top-center

**Mobile:**
```tsx
className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 text-xs rounded-full"
```

**Desktop:**
```tsx
className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 text-sm rounded-full"
```

**Display:** `{currentIndex + 1} / {images.length}`

---

## CAPTION DISPLAY

```tsx
{currentImage.caption && (
  <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent ${isMobile ? 'p-4' : 'p-8'} text-center`}>
    <p className={`text-white ${isMobile ? 'text-sm' : 'text-lg'}`}>{currentImage.caption}</p>
  </div>
)}
```

**Mobile:**
- `p-4` - 16px padding
- `text-sm` - 14px font size

**Desktop:**
- `p-8` - 32px padding
- `text-lg` - 18px font size

**Gradient:** `from-black/90 via-black/70 to-transparent`
- Ensures text readability over any image
- Fades out towards top

---

## CRITICAL IMPLEMENTATION RULES

### 1. Mobile Must Use Full Height
**DON'T:**
```tsx
<Drawer>
  <DrawerContent className="max-h-[90vh]"> {/* ❌ */}
```

**DO:**
```tsx
<Drawer>
  <DrawerContent className="h-screen"> {/* ✅ */}
```

**Why:** `max-h` allows container to shrink, leaving black bars. `h-screen` forces full height.

### 2. Mobile Container Must Match
**DON'T:**
```tsx
<div className="h-full"> {/* ❌ Inside Drawer */}
```

**DO:**
```tsx
<div className="h-screen"> {/* ✅ Inside Drawer */}
```

**Why:** Container must explicitly request full screen height to fill DrawerContent.

### 3. Desktop Uses Different Logic
**Desktop Pattern:**
```tsx
<Dialog>
  <DialogContent className="max-w-[95vw] max-h-[95vh]"> {/* Parent constraint */}
    <div className="h-full"> {/* Child fills parent */}
```

**Why:** Dialog centers content, so we use max constraints on parent and fill on children.

### 4. Navigation Must Stop Propagation
**CRITICAL:**
```tsx
onClick={(e) => {
  e.stopPropagation(); // ✅ REQUIRED
  onNext();
}}
```

**Why:**
- Prevents Drawer/Dialog close handlers from triggering
- Prevents click events from reaching image or container
- Ensures reliable button behavior on mobile

### 5. Drawer Must Not Be Dismissible
```tsx
<Drawer dismissible={false}> {/* ✅ REQUIRED */}
```

**Why:**
- Mobile users naturally swipe on images
- Dismissible drawer interprets swipe as "close" gesture
- Conflicts with navigation and causes accidental closes

---

## USAGE PATTERN

```tsx
const [lightboxOpen, setLightboxOpen] = useState(false);
const [lightboxIndex, setLightboxIndex] = useState(0);

<ImageLightbox
  images={albumImages}
  currentIndex={lightboxIndex}
  isOpen={lightboxOpen}
  onClose={() => setLightboxOpen(false)}
  onPrevious={() => setLightboxIndex((prev) => 
    prev === 0 ? albumImages.length - 1 : prev - 1
  )}
  onNext={() => setLightboxIndex((prev) => 
    prev === albumImages.length - 1 ? 0 : prev + 1
  )}
/>
```

---

## PROPS INTERFACE

```typescript
interface ImageLightboxProps {
  images: { image_url: string; caption?: string | null }[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}
```

---

## COMMON ISSUES & SOLUTIONS

### Issue: Black bars on mobile
**Cause:** Container doesn't fill screen
**Solution:** Use `h-screen` on both DrawerContent and outer container

### Issue: Buttons don't respond on mobile
**Cause:** Drawer dismissible gesture or event propagation
**Solution:** Set `dismissible={false}` and add `e.stopPropagation()`

### Issue: Image too small on desktop
**Cause:** Missing max-width/max-height on image
**Solution:** Use `max-w-full max-h-full` classes

### Issue: Image cropped or distorted
**Cause:** Using `object-cover` instead of `object-contain`
**Solution:** Always use `object-contain` for lightbox images

### Issue: Navigation buttons too small on mobile
**Cause:** Using desktop size on mobile
**Solution:** Use `w-12 h-12` (48px) for mobile touch targets

---

## DEPENDENCIES

- `@radix-ui/react-dialog` - Desktop modal
- `vaul` - Mobile drawer
- `lucide-react` - Icons (X, ChevronLeft, ChevronRight)
- `src/hooks/use-mobile.tsx` - Mobile detection
- `src/components/ui/button.tsx` - Button component

---

## FUTURE MODIFICATIONS

When modifying this component:

1. **Test both mobile and desktop** - Behavior differs significantly
2. **Never remove `e.stopPropagation()`** - Critical for button functionality
3. **Keep mobile dismissible={false}** - Prevents gesture conflicts
4. **Maintain h-screen on mobile** - Required for full-height display
5. **Use appropriate button sizes** - Mobile needs larger touch targets
6. **Test with various aspect ratios** - Portrait, landscape, square images

---

**Last Updated:** Created from current implementation
**Component Location:** `src/components/ImageLightbox.tsx`
**Hook Location:** `src/hooks/use-mobile.tsx`
