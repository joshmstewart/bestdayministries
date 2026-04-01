# Browser Compatibility Guide

## Overview

This document outlines browser compatibility patterns, known issues, and solutions for ensuring the application works across different browsers and versions, with particular focus on mobile Safari/iOS issues.

## Table of Contents

1. [iOS Compatibility](#ios-compatibility)
2. [Browser Detection Utilities](#browser-detection-utilities)
3. [CSS Compatibility Patterns](#css-compatibility-patterns)
4. [Testing Strategy](#testing-strategy)
5. [Known Issues Registry](#known-issues-registry)

---

## iOS Compatibility

### iOS 18.x Critical Issue: CSS Transform Rendering Bug

**Affected Versions:** iOS 18.0 - 18.7.1 (possibly higher)

**Impact:** Pages appear to load but immediately disappear or shift off-screen.

**Root Cause:** Safari in iOS 18.x has a rendering bug when CSS transforms are applied to absolutely positioned elements that contain complex components with their own animations or transforms.

**Symptoms:**
- Page loads briefly then goes blank
- Content visible only on newer iOS versions (19+)
- Session replays show rapid horizontal translations
- Layout thrashing during initial render
- Content shifts completely off-screen

**Technical Details:**

The bug is triggered by the combination of:
1. `position: absolute` on parent container
2. Inline `transform` style (e.g., `style={{ transform: 'rotate(-8deg)' }}`)
3. Child components with their own animations (`animate-fade-in`, etc.)
4. `transform-origin` properties
5. Complex component rendering (React state, async data)

**Solution Implementation:**

See `src/lib/browserDetection.ts` for detection utilities and `src/pages/Community.tsx` lines 333-345 for example implementation.

**Key Pattern:**
```tsx
import { isProblematicIOSVersion } from '@/lib/browserDetection';
import { ErrorBoundary } from '@/components/ErrorBoundary';

<div 
  className={`absolute top-4 right-4 ${
    !isProblematicIOSVersion() 
      ? '[transform:rotate(-8deg)] [transform-origin:center_center] [will-change:transform] [backface-visibility:hidden]' 
      : ''
  }`}
>
  <ErrorBoundary fallback={null}>
    <ComplexComponent />
  </ErrorBoundary>
</div>
```

**Prevention Rules:**
1. ❌ Never use inline `style={{ transform: ... }}` on absolutely positioned elements
2. ✅ Always use CSS classes with conditional application
3. ✅ Add `will-change: transform` and `backface-visibility: hidden` for iOS optimization
4. ✅ Wrap complex animated components in ErrorBoundary
5. ✅ Test on actual iOS 18.x devices when possible

---

## Browser Detection Utilities

### Location: `src/lib/browserDetection.ts`

### Available Functions:

#### `getIOSVersion(): number | null`
Returns the iOS major version number or null if not iOS.

```typescript
const version = getIOSVersion();
// Returns: 18, 19, 20, etc. or null
```

#### `isProblematicIOSVersion(): boolean`
Checks if the current iOS version has known compatibility issues.

```typescript
if (isProblematicIOSVersion()) {
  // Apply fallback styles
}
```

**Current Logic:**
- Returns `true` for iOS 18.x
- Returns `false` for all other versions
- Returns `false` for non-iOS devices

**Maintenance:**
Update this function as new iOS versions are released and tested:

```typescript
export function isProblematicIOSVersion(): boolean {
  const version = getIOSVersion();
  // Add new problematic versions as discovered
  return version !== null && (version === 18 || version === XX);
}
```

### Adding New Browser Detection:

When adding detection for other browsers:

```typescript
export function getBrowserInfo() {
  if (typeof window === 'undefined') return null;
  
  const ua = window.navigator.userAgent;
  
  // Chrome/Edge
  const isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor);
  
  // Firefox
  const isFirefox = /Firefox/.test(ua);
  
  // Safari (not Chrome/Edge)
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  
  return { isChrome, isFirefox, isSafari };
}
```

---

## CSS Compatibility Patterns

### Pattern 1: Conditional Transform Application

**Problem:** CSS transforms behave differently across browsers.

**Solution:** Apply transforms conditionally based on browser capabilities.

```tsx
// ❌ WRONG: Inline styles on positioned elements
<div 
  className="absolute top-4 right-4"
  style={{ transform: 'rotate(-8deg)' }}
>
  <Component />
</div>

// ✅ CORRECT: Conditional class-based approach
<div 
  className={`absolute top-4 right-4 ${
    !isProblematicIOSVersion() 
      ? '[transform:rotate(-8deg)] [will-change:transform] [backface-visibility:hidden]' 
      : ''
  }`}
>
  <Component />
</div>
```

### Pattern 2: Graceful Degradation

**Principle:** Features should degrade gracefully on older browsers without breaking core functionality.

```tsx
// Component appears without rotation on iOS 18.x
// Component appears WITH rotation on iOS 19+ and other browsers
// Either way, the component is VISIBLE and FUNCTIONAL
```

### Pattern 3: Performance Optimization for Mobile

When using transforms on mobile:

```css
/* Optimize for mobile rendering */
.mobile-transform {
  will-change: transform;
  backface-visibility: hidden;
  perspective: 1000px; /* Creates 3D rendering context */
  transform: translateZ(0); /* Force GPU acceleration */
}
```

**Use Cases:**
- Animations
- Rotations
- Scales
- Transitions

**Tailwind Implementation:**
```tsx
className="[will-change:transform] [backface-visibility:hidden] [perspective:1000px] [transform:translateZ(0)]"
```

---

## Testing Strategy

### Manual Testing Priority

**High Priority Devices:**
1. iOS 18.x (Safari) - Known issues
2. iOS 19+ (Safari) - Verify fixes don't break newer versions
3. Android Chrome - Most common mobile browser
4. Desktop Safari - macOS rendering differences
5. Desktop Chrome - Baseline

**Test Matrix:**

| Browser | Version | Priority | Test Scenarios |
|---------|---------|----------|----------------|
| iOS Safari | 18.0-18.7 | CRITICAL | All transforms, animations, positioned elements |
| iOS Safari | 19.0+ | HIGH | Verify no regressions from iOS 18 fixes |
| Android Chrome | Latest | MEDIUM | General functionality |
| Desktop Safari | Latest | MEDIUM | CSS transform compatibility |
| Desktop Chrome | Latest | LOW | Baseline behavior |
| Firefox | Latest | LOW | General compatibility |

### Automated Testing

**E2E Tests:** Include browser-specific test runs:

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 13'],
        // Simulate iOS 18.x user agent if needed
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15'
      },
    },
  ],
});
```

**Visual Regression:** Use Percy or similar to catch iOS-specific rendering issues:

```typescript
test('page renders correctly on iOS', async ({ page }) => {
  await page.goto('/community');
  await page.waitForLoadState('networkidle');
  await percySnapshot(page, 'Community Page - iOS Safari');
});
```

### Testing Checklist for CSS Changes

Before deploying changes involving transforms, animations, or positioning:

- [ ] Test on iOS 18.x device (physical or BrowserStack)
- [ ] Test on iOS 19+ device
- [ ] Test on Android Chrome
- [ ] Verify ErrorBoundary catches failures gracefully
- [ ] Check console for layout thrashing warnings
- [ ] Verify no content disappears on page load
- [ ] Test both portrait and landscape orientations
- [ ] Verify touch interactions work correctly
- [ ] Check session replay for unexpected translations

---

## Known Issues Registry

### Active Issues

#### iOS 18.x CSS Transform Rendering Bug
- **Status:** MITIGATED
- **Affected:** iOS 18.0 - 18.7.1+
- **Solution:** Conditional transform application + ErrorBoundary
- **Files:** `src/lib/browserDetection.ts`, `src/pages/Community.tsx`
- **Discovered:** 2025-11-04
- **Fixed:** 2025-11-04

#### macOS Safari: Blank page until "Clear site data"
- **Status:** MITIGATED
- **Affected:** macOS Safari (reported on Safari 18)
- **Symptoms:** App shell appears blank or partially rendered until user clears site data
- **Root Cause (likely):** Stale cached HTML/JS OR corrupted localStorage JSON
- **Solution:** Startup recovery: validate & clear corrupted storage + one-time cache-busting reload on module/chunk load failures + IndexedDB auth storage timeouts (fallback instead of infinite hang)
- **Files:** `src/lib/appStartupRecovery.ts`, `src/main.tsx`, `index.html`
- **Discovered:** 2026-01-09
- **Fixed:** 2026-01-09

### Historical Issues

(To be populated as issues are discovered and resolved)

---

## Best Practices Summary

### DO:
✅ Use CSS classes over inline styles for transforms  
✅ Detect problematic browser versions explicitly  
✅ Provide graceful degradation, not feature removal  
✅ Wrap complex components in ErrorBoundary  
✅ Test on actual devices when possible  
✅ Use `will-change` and `backface-visibility` for mobile optimization  
✅ Document browser-specific workarounds  

### DON'T:
❌ Use inline `style={{ transform }}` on positioned elements  
❌ Assume all iOS versions behave the same  
❌ Break core functionality for visual effects  
❌ Remove features entirely due to one browser version  
❌ Skip testing on older iOS versions  
❌ Ignore ErrorBoundary as a safety net  
❌ Mix multiple transform syntaxes  

---

## Maintenance

### When to Update This Document:

1. **New browser version released** → Test for compatibility issues
2. **New iOS version released** → Update `isProblematicIOSVersion()` logic
3. **New CSS feature used** → Document browser support requirements
4. **Bug discovered** → Add to Known Issues Registry
5. **Bug fixed** → Move to Historical Issues, update solution pattern

### Review Schedule:

- **Quarterly:** Review known issues and update browser support matrix
- **After major iOS release:** Test and update detection logic
- **After Safari updates:** Verify no new issues introduced
- **When user reports appear:** Investigate and document immediately

---

**Last Updated:** 2025-11-04  
**Next Review:** 2026-02-04
