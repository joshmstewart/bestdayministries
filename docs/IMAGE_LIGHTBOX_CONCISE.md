# IMAGE LIGHTBOX - CONCISE DOCS

## Current Implementation
`ImageLightbox` (`src/components/ImageLightbox.tsx`) displays images in full-screen overlay with navigation. Uses responsive mobile-first design with Dialog for all devices.

## Core Structure
```tsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="!max-w-[100vw] md:!max-w-[90vw] !max-h-[100vh] md:!max-h-[90vh] w-screen md:w-auto h-screen md:h-auto p-0 overflow-hidden border-0">
    <div className="relative flex items-center justify-center bg-black w-full h-full">
      {/* Controls: Close (top-right), Prev/Next (sides), Counter (top-center) */}
      <img className="w-[95vw] h-[95vh] md:w-auto md:h-auto md:max-w-[90vw] md:max-h-[90vh] object-contain" />
      {/* Caption: gradient overlay (bottom) */}
    </div>
  </DialogContent>
</Dialog>
```

## Key Implementation
**Mobile-First Approach**:
- **Mobile Container**: `!max-w-[100vw] !max-h-[100vh] w-screen h-screen` - Full-screen with !important overrides
- **Desktop Container**: `md:!max-w-[90vw] md:!max-h-[90vh] md:w-auto md:h-auto` - Contained with breathing room
- **Mobile Image**: `w-[95vw] h-[95vh]` - Nearly full viewport, slight padding
- **Desktop Image**: `md:w-auto md:h-auto md:max-w-[90vw] md:max-h-[90vh]` - Auto-sized with max constraints
- **Critical**: `!important` overrides needed to bypass Dialog's default `max-w-lg` constraint
- **Navigation**: Prev/Next buttons with `e.stopPropagation()` (prevents dialog close)
- **Image Fit**: Always use `object-contain` (preserves aspect ratio)
- **Caption**: Gradient overlay `from-black/90 to-transparent`

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
| Image too small on mobile | Use responsive sizing: `w-[95vw] h-[95vh]` for mobile, `md:w-auto md:h-auto` for desktop |
| Black space on sides (mobile) | Add `!important` overrides: `!max-w-[100vw] w-screen` to bypass Dialog defaults |
| Cropped/distorted | Always use `object-contain` (not `object-cover`) |
| Buttons don't work | Add `e.stopPropagation()` to onClick |
| Dialog not full-screen | Use `!max-w-[100vw] !max-h-[100vh] w-screen h-screen` on DialogContent |

## Dependencies
- `@radix-ui/react-dialog` - Modal
- `lucide-react` - Icons (X, ChevronLeft, ChevronRight)
- `src/components/ui/button.tsx` - Button

## Design Decisions
**Why Dialog for all devices (not Drawer)?**
- Consistent behavior across all screen sizes
- Full-screen capability achieved through responsive classes + !important overrides
- Simpler implementation without conditional rendering
- Dialog provides better image viewing experience with centered content

**Responsive Strategy**:
- Mobile: Full viewport (100vw/vh) with 95% image sizing for subtle padding
- Desktop: 90% viewport with auto-sized images for breathing room
- Breakpoint: 768px (md: prefix)
