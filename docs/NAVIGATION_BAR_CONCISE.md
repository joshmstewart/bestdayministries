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

## Implementation Key Points
- Wait for profile load to prevent flash
- Authentication check before rendering
- Role verification
- Smooth scroll transitions
