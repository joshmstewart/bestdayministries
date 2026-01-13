/**
 * Render Optimization Hooks
 * Tools for preventing unnecessary re-renders and optimizing component updates
 */

import { useRef, useCallback, useMemo, useState, useEffect, memo } from 'react';
import type { DependencyList } from 'react';

/**
 * Deep comparison memo - only re-renders when props deeply change
 */
export function deepMemo<T extends object>(
  Component: React.ComponentType<T>,
  propsAreEqual?: (prevProps: Readonly<T>, nextProps: Readonly<T>) => boolean
) {
  return memo(Component, propsAreEqual || deepEqual);
}

/**
 * Deep equality check for objects
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * Use a stable reference that only updates when values deeply change
 */
export function useDeepMemo<T>(value: T): T {
  const ref = useRef<T>(value);

  if (!deepEqual(ref.current, value)) {
    ref.current = value;
  }

  return ref.current;
}

/**
 * Callback that maintains reference equality as long as callback logic is same
 */
export function useEventCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);
  
  // Update ref on every render
  useEffect(() => {
    callbackRef.current = callback;
  });

  // Return stable function reference
  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * Skip re-renders when specific props haven't meaningfully changed
 */
export function useStableProps<T extends Record<string, any>>(
  props: T,
  comparators: Partial<Record<keyof T, (a: any, b: any) => boolean>> = {}
): T {
  const prevPropsRef = useRef<T>(props);
  const stablePropsRef = useRef<T>(props);

  const hasChanged = useMemo(() => {
    const prev = prevPropsRef.current;
    
    for (const key of Object.keys(props) as Array<keyof T>) {
      const comparator = comparators[key] || Object.is;
      if (!comparator(prev[key], props[key])) {
        return true;
      }
    }
    
    return false;
  }, [props, comparators]);

  if (hasChanged) {
    stablePropsRef.current = props;
  }
  
  prevPropsRef.current = props;
  
  return stablePropsRef.current;
}

/**
 * Defer a value update to avoid blocking render
 */
export function useDeferredValue<T>(value: T, delay: number = 100): T {
  const [deferredValue, setDeferredValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDeferredValue(value);
    }, delay);

    return () => clearTimeout(timeout);
  }, [value, delay]);

  return deferredValue;
}

/**
 * Track render count for debugging
 */
export function useRenderCount(componentName?: string): number {
  const renderCount = useRef(0);
  renderCount.current++;

  if (process.env.NODE_ENV === 'development' && componentName) {
    console.log(`[Render] ${componentName}: ${renderCount.current}`);
  }

  return renderCount.current;
}

/**
 * Detect which prop changed and caused re-render
 */
export function useWhyDidYouUpdate<T extends Record<string, any>>(
  componentName: string,
  props: T
): void {
  const previousPropsRef = useRef<T>();

  useEffect(() => {
    if (previousPropsRef.current && process.env.NODE_ENV === 'development') {
      const changedProps: Record<string, { from: any; to: any }> = {};
      const allKeys = new Set([
        ...Object.keys(previousPropsRef.current),
        ...Object.keys(props),
      ]);

      allKeys.forEach((key) => {
        if (previousPropsRef.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousPropsRef.current![key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        console.log(`[WhyDidYouUpdate] ${componentName}:`, changedProps);
      }
    }

    previousPropsRef.current = props;
  });
}

/**
 * Lazy initialize expensive values
 */
export function useLazyValue<T>(factory: () => T): T {
  const ref = useRef<{ value: T } | null>(null);

  if (ref.current === null) {
    ref.current = { value: factory() };
  }

  return ref.current.value;
}

/**
 * Memoize with custom cache key
 */
export function useMemoWithKey<T>(
  factory: () => T,
  cacheKey: string
): T {
  const cacheRef = useRef<Map<string, T>>(new Map());
  
  if (!cacheRef.current.has(cacheKey)) {
    cacheRef.current.set(cacheKey, factory());
    
    // Limit cache size
    if (cacheRef.current.size > 50) {
      const firstKey = cacheRef.current.keys().next().value;
      cacheRef.current.delete(firstKey);
    }
  }
  
  return cacheRef.current.get(cacheKey)!;
}

/**
 * Force update hook (use sparingly)
 */
export function useForceUpdate(): () => void {
  const [, setTick] = useState(0);
  return useCallback(() => setTick((t) => t + 1), []);
}

/**
 * Batch multiple state updates
 */
export function useBatchedUpdates() {
  const updatesRef = useRef<Array<() => void>>([]);
  const scheduledRef = useRef(false);

  const scheduleUpdate = useCallback((update: () => void) => {
    updatesRef.current.push(update);

    if (!scheduledRef.current) {
      scheduledRef.current = true;
      requestAnimationFrame(() => {
        const updates = updatesRef.current;
        updatesRef.current = [];
        scheduledRef.current = false;
        updates.forEach((u) => u());
      });
    }
  }, []);

  return scheduleUpdate;
}

/**
 * Prevent rapid state updates (coalesce updates)
 */
export function useCoalescedState<T>(
  initialValue: T,
  delay: number = 16 // One frame at 60fps
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState(initialValue);
  const pendingRef = useRef<T | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const setCoalescedState = useCallback(
    (value: T | ((prev: T) => T)) => {
      if (typeof value === 'function') {
        pendingRef.current = (value as (prev: T) => T)(
          pendingRef.current ?? state
        );
      } else {
        pendingRef.current = value;
      }

      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          if (pendingRef.current !== null) {
            setState(pendingRef.current);
            pendingRef.current = null;
          }
          timeoutRef.current = undefined;
        }, delay);
      }
    },
    [state, delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, setCoalescedState];
}

/**
 * Only update when component is in viewport
 */
export function useVisibleUpdates<T>(
  value: T,
  containerRef: React.RefObject<HTMLElement>
): T {
  const [visibleValue, setVisibleValue] = useState(value);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      isVisibleRef.current = entry.isIntersecting;
      if (entry.isIntersecting) {
        setVisibleValue(value);
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef]);

  useEffect(() => {
    if (isVisibleRef.current) {
      setVisibleValue(value);
    }
  }, [value]);

  return visibleValue;
}
