# BACK BUTTON PLACEMENT

## Spacing Rules
**Main Element:**
- `pt-4` (16px) with nav bar
- `pt-6` (24px) without nav bar

**Back Button:**
- `mb-6` (24px) standard spacing above content
- `mb-4` (16px) for dense layouts

**Button Style:**
- `variant="outline"`, `size="sm"`
- `<ArrowLeft className="mr-2 h-4 w-4" />` + "Back to [Destination]"

## Standard Layout
```tsx
<main className="flex-1 pt-4">
  <div className="container mx-auto px-4">
    <Button variant="outline" size="sm" className="mb-6" onClick={() => navigate('/route')}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back to [Destination]
    </Button>
    <Card>{/* content */}</Card>
  </div>
</main>
```

## Banner Layout (Vendor/Event Pages)
```tsx
<div className="h-32 bg-gradient-to-br ...">
  <div className="container mx-auto px-4 h-full flex items-center">
    <Button variant="outline" size="sm">
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back to List
    </Button>
  </div>
</div>
<div className="container mx-auto px-4">
  <div className="relative -mt-8 mb-6">
    <Card>{/* overlaps banner */}</Card>
  </div>
</div>
```

## Common Mistakes
❌ `mb-12+` (too much space)
❌ Inconsistent spacing
❌ Button inside content cards
❌ Different variants across pages
❌ Missing descriptive text (icon only)

## Accessibility
- Descriptive text required (not just icon)
- Min 44x44px touch target
- Sufficient color contrast
- Semantic `<button>` with `onClick`
