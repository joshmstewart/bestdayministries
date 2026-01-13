/**
 * Virtual List Hook for efficiently rendering large lists
 * Only renders items visible in the viewport plus a buffer
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface UseVirtualListOptions<T> {
  /** Array of items to virtualize */
  items: T[];
  /** Estimated height of each item in pixels */
  itemHeight: number;
  /** Number of items to render above/below visible area */
  overscan?: number;
  /** Get unique key for each item */
  getKey?: (item: T, index: number) => string | number;
}

interface VirtualItem<T> {
  item: T;
  index: number;
  key: string | number;
  style: React.CSSProperties;
}

interface UseVirtualListReturn<T> {
  /** Ref to attach to the scrollable container */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Items to render with positioning styles */
  virtualItems: VirtualItem<T>[];
  /** Total height of all items (for scroll container) */
  totalHeight: number;
  /** Current scroll position */
  scrollTop: number;
  /** Scroll to a specific index */
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  /** Is currently scrolling */
  isScrolling: boolean;
}

export function useVirtualList<T>({
  items,
  itemHeight,
  overscan = 3,
  getKey = (_, i) => i,
}: UseVirtualListOptions<T>): UseVirtualListReturn<T> {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollingTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculate visible range
  const { startIndex, endIndex, virtualItems } = useMemo(() => {
    const totalHeight = items.length * itemHeight;
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length - 1, start + visibleCount + overscan * 2);

    const virtual: VirtualItem<T>[] = [];
    for (let i = start; i <= end; i++) {
      if (items[i] !== undefined) {
        virtual.push({
          item: items[i],
          index: i,
          key: getKey(items[i], i),
          style: {
            position: 'absolute',
            top: i * itemHeight,
            left: 0,
            right: 0,
            height: itemHeight,
          },
        });
      }
    }

    return { startIndex: start, endIndex: end, virtualItems: virtual };
  }, [items, itemHeight, scrollTop, containerHeight, overscan, getKey]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
      setIsScrolling(true);

      // Clear existing timeout
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }

      // Set scrolling to false after 150ms of no scroll
      scrollingTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    }
  }, []);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    setContainerHeight(container.clientHeight);

    return () => {
      resizeObserver.disconnect();
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }
    };
  }, []);

  // Attach scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Scroll to index function
  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      if (containerRef.current) {
        const top = index * itemHeight;
        containerRef.current.scrollTo({ top, behavior });
      }
    },
    [itemHeight]
  );

  const totalHeight = items.length * itemHeight;

  return {
    containerRef,
    virtualItems,
    totalHeight,
    scrollTop,
    scrollToIndex,
    isScrolling,
  };
}

/**
 * Simplified hook for when you just need to know what's visible
 */
export function useVisibleRange(
  containerRef: React.RefObject<HTMLElement>,
  itemCount: number,
  itemHeight: number
): { start: number; end: number } {
  const [range, setRange] = useState({ start: 0, end: 10 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateRange = () => {
      const scrollTop = container.scrollTop;
      const height = container.clientHeight;
      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
      const end = Math.min(itemCount - 1, Math.ceil((scrollTop + height) / itemHeight) + 2);
      setRange({ start, end });
    };

    updateRange();
    container.addEventListener('scroll', updateRange, { passive: true });
    window.addEventListener('resize', updateRange);

    return () => {
      container.removeEventListener('scroll', updateRange);
      window.removeEventListener('resize', updateRange);
    };
  }, [containerRef, itemCount, itemHeight]);

  return range;
}

/**
 * Hook for infinite scroll pagination
 */
export function useInfiniteScroll(
  containerRef: React.RefObject<HTMLElement>,
  options: {
    onLoadMore: () => Promise<void>;
    hasMore: boolean;
    threshold?: number;
    loading?: boolean;
  }
) {
  const { onLoadMore, hasMore, threshold = 200, loading = false } = options;
  const loadingRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = async () => {
      if (loadingRef.current || loading || !hasMore) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      if (distanceFromBottom < threshold) {
        loadingRef.current = true;
        try {
          await onLoadMore();
        } finally {
          loadingRef.current = false;
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef, onLoadMore, hasMore, threshold, loading]);
}
