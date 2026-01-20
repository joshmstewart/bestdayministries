import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface UseVirtualScrollOptions<T> {
  items: T[];
  itemHeight: number | ((item: T, index: number) => number);
  overscan?: number;
  containerHeight?: number;
}

interface UseVirtualScrollReturn<T> {
  virtualItems: Array<{ item: T; index: number; offsetTop: number }>;
  totalHeight: number;
  containerRef: React.RefObject<HTMLDivElement>;
  scrollToIndex: (index: number) => void;
}

export function useVirtualScroll<T>({
  items,
  itemHeight,
  overscan = 3,
  containerHeight: initialContainerHeight,
}: UseVirtualScrollOptions<T>): UseVirtualScrollReturn<T> {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(initialContainerHeight ?? 600);

  // Calculate item heights and offsets
  const { itemOffsets, totalHeight } = useMemo(() => {
    const offsets: number[] = [];
    let total = 0;

    for (let i = 0; i < items.length; i++) {
      offsets.push(total);
      const height = typeof itemHeight === 'function' 
        ? itemHeight(items[i], i) 
        : itemHeight;
      total += height;
    }

    return { itemOffsets: offsets, totalHeight: total };
  }, [items, itemHeight]);

  // Find visible range
  const { startIndex, endIndex } = useMemo(() => {
    if (items.length === 0) {
      return { startIndex: 0, endIndex: 0 };
    }

    // Binary search for start index
    let start = 0;
    let end = items.length - 1;
    
    while (start < end) {
      const mid = Math.floor((start + end) / 2);
      const height = typeof itemHeight === 'function' 
        ? itemHeight(items[mid], mid) 
        : itemHeight;
      
      if (itemOffsets[mid] + height < scrollTop) {
        start = mid + 1;
      } else {
        end = mid;
      }
    }

    const visibleStart = Math.max(0, start - overscan);
    
    // Find end index
    let visibleEnd = start;
    let accumulatedHeight = itemOffsets[start] - scrollTop;
    
    while (visibleEnd < items.length && accumulatedHeight < containerHeight) {
      const height = typeof itemHeight === 'function' 
        ? itemHeight(items[visibleEnd], visibleEnd) 
        : itemHeight;
      accumulatedHeight += height;
      visibleEnd++;
    }

    return {
      startIndex: visibleStart,
      endIndex: Math.min(items.length, visibleEnd + overscan),
    };
  }, [items, itemHeight, itemOffsets, scrollTop, containerHeight, overscan]);

  // Virtual items to render
  const virtualItems = useMemo(() => {
    const result: Array<{ item: T; index: number; offsetTop: number }> = [];
    
    for (let i = startIndex; i < endIndex; i++) {
      result.push({
        item: items[i],
        index: i,
        offsetTop: itemOffsets[i],
      });
    }

    return result;
  }, [items, startIndex, endIndex, itemOffsets]);

  // Handle scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container || initialContainerHeight) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [initialContainerHeight]);

  // Scroll to index
  const scrollToIndex = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container || index < 0 || index >= items.length) return;

    container.scrollTo({
      top: itemOffsets[index],
      behavior: 'smooth',
    });
  }, [items.length, itemOffsets]);

  return {
    virtualItems,
    totalHeight,
    containerRef,
    scrollToIndex,
  };
}
