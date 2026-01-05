# Error Handling and Defensive Programming Patterns

## Overview

This document describes the defensive programming patterns implemented to handle intermittent loading issues, particularly on mobile devices with varying network conditions.

## Components

### ErrorBoundary (`src/components/ErrorBoundary.tsx`)

**Purpose:** Catch JavaScript errors anywhere in the component tree and display a fallback UI instead of crashing.

**Features:**
- Catches errors during rendering, in lifecycle methods, and in constructors
- Provides a custom fallback UI or uses default error message
- Includes a "Retry" button to reset error state
- Optional `onReset` callback for custom recovery logic

**Usage:**
```tsx
<ErrorBoundary
  fallback={<CustomFallbackUI />}
  onReset={() => {
    // Custom reset logic
  }}
>
  <YourComponent />
</ErrorBoundary>
```

### HeaderSkeleton (`src/components/HeaderSkeleton.tsx`)

**Purpose:** Provide visual feedback while the header is loading data.

**Features:**
- Shows placeholder UI with same dimensions as actual header
- Prevents layout shift when real content loads
- Uses Skeleton component for smooth pulse animation

**Usage:**
```tsx
{!dataLoaded ? <HeaderSkeleton /> : <ActualHeader />}
```

### useRetryFetch Hook (`src/hooks/useRetryFetch.ts`)

**Purpose:** Wrap any async function with automatic retry logic and exponential backoff.

**Features:**
- Configurable retry attempts (default: 3)
- Exponential backoff with jitter to avoid thundering herd
- Tracks retry count and retry state
- Easy reset functionality

**Usage:**
```tsx
const { fetchWithRetry, isRetrying, retryCount } = useRetryFetch(
  async () => {
    const { data, error } = await supabase.from('table').select();
    if (error) throw error;
    return data;
  },
  { maxRetries: 3, initialDelay: 1000 }
);

// Call it
const data = await fetchWithRetry();
```

## Implementation in UnifiedHeader

The UnifiedHeader component demonstrates best practices for handling data loading:

### 1. Consolidated Data Loading

Instead of multiple separate `useEffect` hooks, all initial data loading happens in a single effect:

```tsx
useEffect(() => {
  const initializeHeader = async () => {
    const [logoResult, navResult, authResult] = await Promise.allSettled([
      loadLogo(),
      loadNavLinks(),
      checkUser()
    ]);
    // Check for failures and retry if needed
  };
  initializeHeader();
}, [retryCount]);
```

**Benefits:**
- Reduces race conditions
- Easier to track overall loading state
- Simpler retry logic

### 2. Automatic Retry with Exponential Backoff

If any data fetch fails, the component automatically retries with increasing delays:

```tsx
if (hasFailures && retryCount < 3) {
  setTimeout(() => {
    setRetryCount(prev => prev + 1);
  }, 1000 * Math.pow(2, retryCount)); // 1s, 2s, 4s
}
```

**Benefits:**
- Handles temporary network issues
- Doesn't overwhelm the server
- User doesn't need to manually refresh

### 3. Loading Skeleton

Shows placeholder UI while data loads:

```tsx
{!dataLoaded ? (
  <HeaderSkeleton />
) : (
  <ActualHeaderContent />
)}
```

**Benefits:**
- Prevents "flash of missing content"
- Better perceived performance
- Reduces layout shift

### 4. Error Boundary Wrapper

Catches any unhandled errors in the header:

```tsx
<ErrorBoundary
  fallback={<MinimalHeaderUI />}
  onReset={() => {
    setRetryCount(0);
    setDataLoaded(false);
  }}
>
  <HeaderContent />
</ErrorBoundary>
```

**Benefits:**
- Prevents entire app crash
- Provides recovery mechanism
- Maintains partial functionality

## Common Issues and Solutions

### Issue: "Header doesn't load on first try"

**Cause:** Network timing issues, especially on mobile
**Solution:** Automatic retry logic handles this transparently

### Issue: "Header loads but some data is missing"

**Cause:** One of multiple parallel requests failed
**Solution:** `Promise.allSettled` ensures all attempts complete, retry logic catches failures

### Issue: "Header crashes and breaks the page"

**Cause:** Unhandled JavaScript error in component
**Solution:** ErrorBoundary catches the error and shows fallback UI

### Issue: "Loading takes too long"

**Cause:** Multiple sequential requests
**Solution:** Parallel loading with `Promise.allSettled` reduces total time

## Best Practices

1. **Always wrap critical components in ErrorBoundary**
2. **Show loading states for better UX**
3. **Use retry logic for network requests**
4. **Consolidate data loading to reduce race conditions**
5. **Clean up subscriptions and timeouts on unmount**
6. **Log errors for debugging but handle gracefully for users**

## Testing

To test error handling:

```tsx
// Force an error in development
if (import.meta.env.DEV && Math.random() > 0.5) {
  throw new Error('Test error');
}
```

To test retry logic:

```tsx
// Simulate intermittent network failure
if (retryCount < 2) {
  throw new Error('Network timeout');
}
```

## 🚨🚨🚨 MANDATORY ERROR TOAST STANDARD 🚨🚨🚨

**⛔ THIS IS NON-NEGOTIABLE. ZERO EXCEPTIONS. EVER. ⛔**

### THE ONLY WAY TO SHOW ERRORS:

ALL error messages MUST be:
1. **RED** - variant: "destructive"
2. **PERSISTENT** - duration: Infinity (NEVER auto-dismiss)
3. **COPYABLE** - includes copy button for debugging

### CORRECT IMPLEMENTATION:

```tsx
import { showErrorToastWithCopy } from "@/lib/errorUtils";

try {
  await someOperation();
} catch (error) {
  console.error("Error context:", error);
  showErrorToastWithCopy("Operation name", error);
}
```

### ⛔ FORBIDDEN - NEVER USE THESE ⛔

```tsx
// ❌ WRONG - toast.error() from sonner
toast.error("Failed to save");

// ❌ WRONG - inline destructive toast without copy
toast({ title: "Error", description: error.message, variant: "destructive" });

// ❌ WRONG - error message that auto-dismisses
toast.error(`Failed: ${error.message}`);
```

### The `showErrorToastWithCopy` Function

Located in `src/lib/errorUtils.tsx`:

- Uses `getFullErrorText(error)` to serialize ALL error details
- Displays in scrollable `<pre>` element with copy button
- Uses `duration: Infinity` - NEVER auto-dismisses
- Uses `variant: "destructive"` - always RED

### Error Serialization with `getFullErrorText`

Produces comprehensive plain-text including:
- Error name, message, and stack trace
- All extra properties (including nested context objects)
- Safe handling of circular references
- Supabase error context fully captured

### Why This Matters

- Users CANNOT debug if errors disappear
- Users CANNOT report issues without details
- Support tickets are USELESS without copyable errors
- Developers CANNOT fix issues without full context

### Before Writing ANY Code

Search for `toast.error` and `variant.*destructive` in your changes.
If found, REPLACE with `showErrorToastWithCopy`.

**VIOLATIONS ARE BUGS THAT MUST BE FIXED.**

## Browser Compatibility Patterns

### iOS 18.x CSS Transform Issues

**Issue:** iOS 18.x has known rendering problems with CSS transforms, particularly when combined with:
- Absolute positioning
- Transform-origin properties
- Animation classes
- Nested transforms in child components

**Symptoms:**
- Page appears to load but then "disappears"
- Rapid horizontal translations in session replays
- Content shifts off-screen unexpectedly
- Layout thrashing during initial render

**Solution Pattern:**

1. **Create browser detection utility** (`src/lib/browserDetection.ts`):
```typescript
export function getIOSVersion(): number | null {
  if (typeof window === 'undefined') return null;
  
  const userAgent = window.navigator.userAgent;
  const match = userAgent.match(/OS (\d+)_/);
  
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  
  return null;
}

export function isProblematicIOSVersion(): boolean {
  const version = getIOSVersion();
  // iOS 18.x has known issues with CSS transforms
  return version !== null && version === 18;
}
```

2. **Apply conditional styling**:
```tsx
import { isProblematicIOSVersion } from '@/lib/browserDetection';

// Instead of inline styles:
// style={{ transform: 'rotate(-8deg)' }}

// Use conditional className:
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

3. **Wrap in ErrorBoundary**:
```tsx
<ErrorBoundary fallback={null}>
  <ProblematicComponent />
</ErrorBoundary>
```

**Key Principles:**
- Detect problematic versions explicitly (don't assume all iOS)
- Provide graceful degradation (skip effect, don't break page)
- Use `will-change` and `backface-visibility` for optimization
- Wrap in ErrorBoundary as final safety net
- Test on actual devices when possible

**Prevention:**
- Avoid inline transform styles on absolutely positioned elements
- Use CSS classes with Tailwind arbitrary values instead
- Always consider iOS compatibility for animations
- Test on multiple iOS versions when adding complex transforms

## Future Improvements

- [ ] Add telemetry to track error rates
- [ ] Implement circuit breaker pattern for repeated failures
- [ ] Add offline detection and user notification
- [ ] Implement optimistic updates for better perceived performance
- [ ] Add request deduplication to prevent duplicate fetches
- [ ] Expand browser detection for other known compatibility issues
- [ ] Create automated testing for iOS-specific rendering bugs
