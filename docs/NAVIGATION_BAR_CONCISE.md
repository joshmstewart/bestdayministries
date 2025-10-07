# NAVIGATION BAR

## Visibility Rules

**Display When:**
```tsx
{user && profile && profile.role !== "vendor" && <nav>...</nav>}
```
- User authenticated (`user` exists)
- Profile loaded (`profile` exists)
- NOT vendor role

**Hidden For:** Non-authenticated users, vendors
**Visible For:** bestie, caregiver, supporter, admin, owner

## Scroll Behavior
- **Shows:** Within 150px of top OR scrolling UP
- **Hides:** Past 150px AND scrolling DOWN
- **CSS:** `translate-y-0 opacity-100` (visible) / `-translate-y-full opacity-0` (hidden)

## Page Layout Requirements

**CRITICAL: All pages MUST include top spacing for the nav bar**

### Spacing Guidelines
- **Standard pages:** Use `pt-24` (96px) on main content wrapper
- **Pages with banners:** Banner can overlap, content below needs `pt-24`
- **Minimum clearance:** 80px to prevent nav overlap with content

### Implementation Pattern
```tsx
<div className="min-h-screen flex flex-col">
  <UnifiedHeader />
  
  <main className="flex-1 pt-24"> {/* REQUIRED top padding */}
    <div className="container mx-auto px-4">
      {/* Page content */}
    </div>
  </main>
  
  <Footer />
</div>
```

### Why This Matters
- Nav bar is absolutely positioned and overlays content
- Without top padding, nav covers page headers and content
- Consistent spacing maintains visual hierarchy across all pages

### Common Issues
| Issue | Cause | Fix |
|-------|-------|-----|
| Nav covers page title | Missing top padding | Add `pt-24` to main element |
| Title too close to nav | Insufficient padding | Increase to `pt-28` or `pt-32` |
| Mobile overlap | Fixed padding doesn't scale | Test on mobile, adjust if needed |

## Navigation Links

**Data Source:** `navigation_links` table
```js
.select("id, label, href, display_order")
.eq("is_active", true)
.order("display_order", { ascending: true })
```

**Link Types:**
- **Internal:** `<Link to={href}>{label}</Link>`
- **External:** `<a href={href} target="_blank" rel="noopener noreferrer">{label}</a>`

**Styling:**
- Hover: Burnt orange color (`hover:text-[hsl(var(--burnt-orange))]`)
- Animated underline on hover
- Font: Roca (`font-['Roca']`)

## Physical Dimensions
- **Height:** ~64px (header) + ~48px (nav) = ~112px total
- **Z-index:** 50 (nav) ensures it stays above content
- **Backdrop blur:** Creates depth separation from content

## Real-Time Updates
Subscribes to `navigation_links` changes → auto-refreshes without page reload

## User Role Badge
- Right side of nav
- Shows: User icon + capitalized role (e.g., "Caregiver")
- Styled with primary color theme

## Positioning
- Absolutely positioned below header (`absolute top-full`)
- Overlays content (doesn't push down)
- Full width (`left-0 right-0`), high z-index (`z-50`)
- Backdrop blur effect

## Why Vendors Don't See It
- Vendors use `/vendor-dashboard` exclusively
- Separate tab navigation (Products, Orders, Earnings, Settings)
- Check `profile.role !== "vendor"` prevents display
- Avoids confusion, provides focused vendor experience

## Implementation Checklist
- [ ] User authentication check
- [ ] Profile loaded before rendering
- [ ] Role verification (exclude vendors)
- [ ] Page has `pt-24` top padding
- [ ] Smooth scroll transitions enabled
- [ ] Real-time subscription cleanup on unmount
