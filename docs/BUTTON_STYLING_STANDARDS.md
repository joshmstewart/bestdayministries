BUTTON STYLING STANDARDS

## ⚠️ CRITICAL: Correct vs Wrong Gradient

### ✅ CORRECT: `bg-gradient-warm`
```tsx
<Button className="bg-gradient-warm border-0 shadow-warm hover:shadow-glow">
```
- **Visual:** Burnt orange with organic yellow SPOTS throughout (radial gradients)
- **Effect:** Liquid, organic appearance - yellow spots scattered across orange base
- **Use for:** ALL primary CTA buttons

### ❌ WRONG: `bg-gradient-to-r from-primary via-accent to-secondary`
```tsx
// DO NOT USE THIS FOR BUTTONS!
<Button className="bg-gradient-to-r from-primary via-accent to-secondary">
```
- **Visual:** Linear left-to-right gradient (orange → yellow → brown)
- **Problem:** Old style, not brand-consistent for buttons
- **Exception:** OK for TEXT gradients (`bg-clip-text text-transparent`) and decorative elements

### Quick Reference
| Use Case | Correct Class |
|----------|---------------|
| Primary buttons | `bg-gradient-warm` |
| Gradient TEXT | `bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent` |
| Loading spinners | `bg-gradient-to-r from-primary via-accent to-secondary` (OK for decorative) |

---

## Overview
Consistent button styling guidelines for when to use gradients vs solid colors, ensuring visual hierarchy and brand cohesion.

## Core Variants (from button.tsx)

### Default (Primary CTA)
```tsx
variant="default"
```
- **Style:** Complex gradient (`bg-gradient-warm`)
- **Use:** Primary calls-to-action, hero buttons, main actions
- **Colors:** Burnt orange base with liquid mustard spots (5 radial gradients)
- **Effect:** Organic, eye-catching, brand-forward

### Outline
```tsx
variant="outline"
```
- **Style:** Border with background on hover
- **Use:** Secondary actions, form buttons, navigation
- **Colors:** Border matches theme, hover uses accent

### Secondary
```tsx
variant="secondary"
```
- **Style:** Solid background, no gradient
- **Use:** Supporting actions, less prominent CTAs
- **Colors:** Secondary color (`--secondary`)

### Ghost
```tsx
variant="ghost"
```
- **Style:** Transparent, hover background only
- **Use:** Tertiary actions, icon buttons, subtle links
- **Colors:** Hover uses accent

## Gradient Usage Rules

### ✅ Use Gradients When:
1. **Primary brand actions:**
   - "Join Our Community"
   - "Donate Now"
   - "Sponsor a Bestie"
   - Hero section CTAs

2. **Brand color scheme (orange/mustard):**
   - Button uses burnt orange or mustard as base
   - Matches overall brand palette
   - Reinforces brand identity

3. **High-priority conversions:**
   - Payment/checkout buttons
   - Sign up forms
   - Main navigation actions

### ❌ NO Gradients When:
1. **Custom color schemes:**
   - Button uses non-brand colors (e.g., brown in BDE section)
   - Section has unique color palette
   - Example: Best Day Ever section (beige/brown)

2. **Secondary/tertiary actions:**
   - Cancel buttons
   - Back buttons
   - "View more" links

3. **Outline/ghost variants:**
   - These variants never use gradients by design

## Custom Color Buttons

### Pattern: Solid Background
When using custom colors outside the brand palette, always use solid backgrounds:

```tsx
<Button 
  variant="ghost"
  className="bg-[hsl(13,33%,36%)] hover:bg-[hsl(13,33%,36%)]/90 text-white"
>
  Custom Color Button
</Button>
```

**Why `variant="ghost"`?**
- Removes default gradient
- Allows custom background via className
- Still gets button structure/padding

**Opacity Pattern:**
- Base: `bg-[color]`
- Hover: `bg-[color]/90` (10% more transparent)
- Maintains consistency with other hover states

## Brand Gradient Definition

**Location:** `src/index.css`

```css
--gradient-warm: 
  radial-gradient(circle at 20% 30%, hsl(46 95% 55% / 0.25) 0%, transparent 25%),
  radial-gradient(circle at 75% 20%, hsl(46 95% 55% / 0.2) 0%, transparent 30%),
  radial-gradient(circle at 85% 70%, hsl(46 95% 55% / 0.28) 0%, transparent 25%),
  radial-gradient(circle at 40% 80%, hsl(46 95% 55% / 0.18) 0%, transparent 35%),
  radial-gradient(circle at 15% 85%, hsl(46 95% 55% / 0.15) 0%, transparent 28%),
  hsl(24 85% 56%);
```

**Effect:** Organic liquid appearance with soft yellow spots over burnt orange base

## Soft Ribbon

**Variable:** `--gradient-soft-ribbon`  
**Utility Class:** `.bg-soft-ribbon`

```css
--gradient-soft-ribbon: linear-gradient(to right, hsl(var(--primary) / 0.2), hsl(var(--accent) / 0.2), hsl(var(--primary) / 0.2));
```

**Effect:** Gentle horizontal band of brand colors - like a soft ribbon of warmth  
**Use for:** Toolbars, settings bars, filter bars, any horizontal control strip  
**Example:** Cash Register game settings bar

```tsx
<div className="bg-soft-ribbon rounded-lg p-4 border border-primary/30">
  {/* Settings controls */}
</div>
```

## Color Decision Tree

```
Is it a primary CTA?
├─ Yes → Is it in brand colors (orange/mustard)?
│  ├─ Yes → Use variant="default" (gradient)
│  └─ No → Use variant="ghost" + custom bg (solid)
└─ No → Is it secondary/tertiary?
   ├─ Secondary → Use variant="secondary" (solid)
   └─ Tertiary → Use variant="outline" or "ghost"
```

## Real-World Examples

### ✅ Correct: Brand Gradient
```tsx
// Hero section CTA - brand colors, primary action
<Button size="lg">Join Our Community</Button>
```

### ✅ Correct: Custom Solid
```tsx
// BDE section - custom brown, doesn't match brand
<Button 
  variant="ghost"
  className="bg-[hsl(13,33%,36%)] hover:bg-[hsl(13,33%,36%)]/90 text-[hsl(27,41%,88%)]"
>
  <Coffee className="mr-2" />
  Visit Best Day Ever
</Button>
```

### ❌ Wrong: Gradient on Custom Color
```tsx
// Don't do this - gradient doesn't match brown theme
<Button 
  style={{ backgroundColor: 'hsl(13,33%,36%)' }}
>
  Visit Best Day Ever
</Button>
```

## Icon + Button Patterns

### With Icon
```tsx
<Button>
  <Icon className="mr-2 h-4 w-4" />
  Button Text
</Button>
```

### Icon Only
```tsx
<Button variant="ghost" size="icon">
  <Icon className="h-4 w-4" />
</Button>
```

## Size Variants

```tsx
size="sm"     // h-9, px-3  - Compact actions
size="default" // h-10, px-4 - Standard buttons
size="lg"      // h-11, px-8 - Hero CTAs
size="icon"    // h-10, w-10 - Square icon buttons
```

## Accessibility

### Color Contrast
- **Gradients:** Tested for WCAG AA on white text
- **Custom colors:** Verify contrast ratio ≥4.5:1
- **Hover states:** Maintain contrast in hover

### Focus States
- All buttons have focus ring (`ring-offset-2`)
- Keyboard navigable
- Screen reader accessible labels

## Testing Checklist

When adding a button:
- [ ] Is it a primary CTA? → gradient
- [ ] Is it in brand colors? → gradient
- [ ] Is it custom colored? → solid
- [ ] Does it have proper hover state?
- [ ] Is contrast ratio sufficient?
- [ ] Does it fit section color scheme?

## Common Mistakes

| Issue | Problem | Solution |
|-------|---------|----------|
| Gradient on brown | Doesn't match custom theme | Use solid bg |
| Inline styles for brand colors | Hard to maintain | Use semantic tokens |
| Missing hover state | Poor UX | Always define hover |
| Wrong variant | Breaks styling | Check decision tree |

## Maintenance

**When updating gradients:**
1. Update `--gradient-warm` in `index.css`
2. Test on all `variant="default"` buttons
3. Verify contrast ratios
4. Check dark mode (if applicable)

**When adding custom colors:**
1. Use HSL format
2. Create solid background
3. Define hover state (/90 opacity)
4. Test contrast

**Files:** `button.tsx`, `index.css`, `About.tsx` (examples)
