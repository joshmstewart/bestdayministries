# IMAGE LIGHTBOX - CONCISE DOCS

## Current Implementation
`ImageLightbox` (`src/components/ImageLightbox.tsx`) displays images in full-screen overlay with navigation. Currently uses Dialog (desktop pattern) for all devices.

## Core Structure
```tsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="max-w-[90vw] max-h-[90vh] w-auto p-0">
    <div className="relative w-full h-full bg-black/95">
      {/* Controls: Close (top-right), Prev/Next (sides), Counter (top-center) */}
      <div className="w-full h-[90vh] p-16">
        <img className="max-w-full max-h-full object-contain" />
      </div>
      {/* Caption: gradient overlay (bottom) */}
    </div>
  </DialogContent>
</Dialog>
```

## Key Implementation
**Container**: `max-w-[90vw] max-h-[90vh]` on DialogContent  
**Image**: `max-w-full max-h-full object-contain` (preserves aspect ratio)  
**Navigation**: Prev/Next buttons with `e.stopPropagation()` (critical)  
**Caption**: Gradient overlay `from-black/90 to-transparent`

## Props
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

## Usage
```tsx
const [lightboxOpen, setLightboxOpen] = useState(false);
const [lightboxIndex, setLightboxIndex] = useState(0);

<ImageLightbox
  images={albumImages}
  currentIndex={lightboxIndex}
  isOpen={lightboxOpen}
  onClose={() => setLightboxOpen(false)}
  onPrevious={() => setLightboxIndex((prev) => 
    prev === 0 ? images.length - 1 : prev - 1
  )}
  onNext={() => setLightboxIndex((prev) => 
    prev === images.length - 1 ? 0 : prev + 1
  )}
/>
```

## Common Issues
| Issue | Solution |
|-------|----------|
| Image too small | Use `max-w-full max-h-full` |
| Cropped/distorted | Always use `object-contain` (not `object-cover`) |
| Buttons don't work | Add `e.stopPropagation()` to onClick |

## Dependencies
- `@radix-ui/react-dialog` - Modal
- `lucide-react` - Icons (X, ChevronLeft, ChevronRight)
- `src/components/ui/button.tsx` - Button

## Future Enhancement: Mobile Optimization
**Planned**: Use `Drawer` (vaul) for mobile with `useIsMobile()` hook
- Mobile: Full-height drawer with larger touch targets (48px buttons)
- Desktop: Current Dialog implementation
- Key: `dismissible={false}` on Drawer to prevent swipe conflicts

**Files**: `src/hooks/use-mobile.tsx` (breakpoint: 768px)
