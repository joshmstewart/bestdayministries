# Performance Optimization - Deep Dive

## Overview

This document covers the comprehensive performance optimization utilities and patterns implemented across the application.

## Core Performance Utilities

### Query Cache (`src/lib/queryCache.ts`)

Smart caching layer for database queries with:
- **Stale-While-Revalidate**: Serve cached data while fetching fresh data in background
- **Request Deduplication**: Prevent duplicate concurrent requests
- **TTL Management**: Configurable stale time and cache expiration
- **Subscription Support**: React to cache updates in components

```typescript
import { queryCache, createCacheKey, useCachedQuery } from '@/lib/queryCache';

// Direct cache usage
const data = await queryCache.get(
  createCacheKey('products', { category: 'merch' }),
  () => supabase.from('products').select('*').eq('category', 'merch'),
  { staleTime: 60000, cacheTime: 300000 }
);

// React hook usage
const { data, loading, error } = useCachedQuery(
  'user-profile',
  () => fetchProfile(userId),
  { staleTime: 30000 }
);
```

### Virtual List (`src/hooks/useVirtualList.ts`)

Efficiently render large lists by only rendering visible items:
- Window-based virtualization
- Overscan for smooth scrolling
- Scroll position restoration
- Infinite scroll support

```typescript
import { useVirtualList } from '@/hooks/useVirtualList';

const { containerRef, virtualItems, totalHeight } = useVirtualList({
  items: largeArray,
  itemHeight: 60,
  overscan: 5,
});
```

### Image Preloader (`src/lib/imagePreloader.ts`)

Intelligent image loading with:
- Priority queue (high/normal/low)
- Connection-aware concurrency
- Above-the-fold prioritization
- Idle-time background loading

```typescript
import { imagePreloader, useImagePreload } from '@/lib/imagePreloader';

// Preload critical images
imagePreloader.preloadAboveFold([heroImage, logoImage]);

// Preload during idle time
imagePreloader.preloadOnIdle(galleryImages);

// React hook
useImagePreload(productImages, 'normal');
```

### Web Worker Utilities (`src/lib/webWorkerUtils.ts`)

Offload heavy computations to background threads:
- Inline worker creation
- Worker pools for concurrent tasks
- Fallback for non-worker environments

```typescript
import { offloadComputation, searchInWorker, WorkerPool } from '@/lib/webWorkerUtils';

// Sort large array off main thread
const sorted = await sortInWorker(items, '(a, b) => a.name.localeCompare(b.name)');

// Search in background
const results = await searchInWorker(allNames, searchQuery, 50);
```

## React Hooks

### Render Optimization (`src/hooks/useRenderOptimization.ts`)

Prevent unnecessary re-renders:

| Hook | Purpose |
|------|---------|
| `deepMemo` | Memo with deep comparison |
| `useEventCallback` | Stable callback reference |
| `useDeepMemo` | Memoize with deep equality |
| `useDeferredValue` | Defer expensive updates |
| `useCoalescedState` | Batch rapid state changes |
| `useWhyDidYouUpdate` | Debug render causes |

### Resource Preloading (`src/hooks/useResourcePreload.ts`)

Smart preloading strategies:

| Hook | Purpose |
|------|---------|
| `useRoutePreloading` | Prefetch likely next routes |
| `useHoverPreload` | Load on hover intent |
| `useViewportPreload` | Load when near viewport |
| `useCriticalPreload` | Load above-fold resources |
| `useIdlePreload` | Load during idle time |

### Optimized List (`src/hooks/useOptimizedList.tsx`)

Complete list optimization solution:
- Virtualization
- Search/filter with debouncing
- Pagination support
- Loading states

## Performance Utilities (`src/lib/performanceUtils.ts`)

### Timing Utilities
- `useDebounce` - Delay value updates
- `useDebouncedCallback` - Debounce function calls
- `useThrottle` - Limit update frequency

### Observation Utilities
- `useIntersectionObserver` - Viewport visibility
- `useRenderTime` - Monitor render duration

### Data Utilities
- `createLRUCache` - Bounded cache
- `batchReads` / `batchUpdates` - Prevent layout thrashing
- `processInChunks` - Non-blocking array processing

### Network Utilities
- `isSlowConnection` - Detect poor connectivity
- `getConnectionType` - Adaptive loading
- `retryWithBackoff` - Resilient requests

## Usage Patterns

### Optimizing Heavy Lists

```typescript
import { OptimizedList } from '@/hooks/useOptimizedList';

<OptimizedList
  items={products}
  itemHeight={80}
  renderItem={(product, index) => <ProductCard product={product} />}
  getKey={(product) => product.id}
  searchable
  filterFn={(product, query) => 
    product.name.toLowerCase().includes(query.toLowerCase())
  }
/>
```

### Adaptive Loading

```typescript
import { isSlowConnection, getConnectionType } from '@/lib/performanceUtils';

// Load lower quality on slow connections
const imageSize = isSlowConnection() ? 'thumbnail' : 'full';

// Adjust batch sizes
const batchSize = getConnectionType() === 'slow' ? 10 : 50;
```

### Preventing Re-renders

```typescript
import { useEventCallback, useDeepMemo } from '@/hooks/useRenderOptimization';

// Stable callback even if dependencies change
const handleClick = useEventCallback(() => {
  doSomething(currentValue);
});

// Only recompute when object deeply changes
const stableConfig = useDeepMemo(complexConfig);
```

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| LCP | < 2.5s | Largest Contentful Paint |
| FID | < 100ms | First Input Delay |
| CLS | < 0.1 | Cumulative Layout Shift |
| TTI | < 3.5s | Time to Interactive |
| Bundle Size | < 500KB initial | Gzipped main chunk |

## Monitoring

### Development
- `useWhyDidYouUpdate` - Track prop changes
- `useRenderTime` - Monitor slow components
- `useRenderCount` - Count re-renders

### Production
- `measureAsync` - Time async operations
- `queryCache.getStats()` - Cache metrics
- `imagePreloader.getStats()` - Loading metrics

## Best Practices

### DO
- Use virtual lists for > 100 items
- Preload images on hover/near viewport
- Cache API responses with appropriate TTL
- Debounce search inputs (200-300ms)
- Use `memo()` on list item components
- Lazy load below-fold content

### DON'T
- Inline object/function props in JSX
- Fetch same data in multiple components
- Re-render parent on child state change
- Block main thread with heavy loops
- Load all images eagerly
- Skip loading states

## Files Reference

| File | Purpose |
|------|---------|
| `src/lib/queryCache.ts` | Query caching with SWR |
| `src/lib/imagePreloader.ts` | Smart image loading |
| `src/lib/webWorkerUtils.ts` | Background computation |
| `src/lib/performanceUtils.ts` | General utilities |
| `src/hooks/useVirtualList.ts` | List virtualization |
| `src/hooks/useOptimizedList.tsx` | Complete list solution |
| `src/hooks/useRenderOptimization.ts` | Render prevention |
| `src/hooks/useResourcePreload.ts` | Resource preloading |
| `src/components/OptimizedImage.tsx` | Lazy image component |
