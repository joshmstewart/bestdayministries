/**
 * Optimized List Component and Hook
 * Combines virtualization, memoization, and smart rendering
 */

import React, { memo, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useVirtualList } from './useVirtualList';
import { useDebouncedCallback } from '@/lib/performanceUtils';

interface OptimizedListProps<T> {
  /** Items to render */
  items: T[];
  /** Height of each item in pixels */
  itemHeight: number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Get unique key for each item */
  getKey: (item: T, index: number) => string | number;
  /** Optional class for the container */
  className?: string;
  /** Optional height for the container (defaults to 100%) */
  height?: number | string;
  /** Enable search filtering */
  searchable?: boolean;
  /** Search filter function */
  filterFn?: (item: T, query: string) => boolean;
  /** Placeholder for search input */
  searchPlaceholder?: string;
  /** Empty state component */
  emptyState?: React.ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Number of skeleton items to show while loading */
  skeletonCount?: number;
}

/**
 * Memoized list item wrapper
 */
const ListItem = memo(function ListItem<T>({
  item,
  index,
  renderItem,
  style,
}: {
  item: T;
  index: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  style: React.CSSProperties;
}) {
  return <div style={style}>{renderItem(item, index)}</div>;
});

/**
 * High-performance list component with virtualization
 */
export function OptimizedList<T>({
  items,
  itemHeight,
  renderItem,
  getKey,
  className = '',
  height = '100%',
  searchable = false,
  filterFn,
  searchPlaceholder = 'Search...',
  emptyState,
  loading = false,
  skeletonCount = 5,
}: OptimizedListProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search
  const updateDebouncedQuery = useDebouncedCallback((query: string) => {
    setDebouncedQuery(query);
  }, 200);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      updateDebouncedQuery(query);
    },
    [updateDebouncedQuery]
  );

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!debouncedQuery || !filterFn) return items;
    return items.filter((item) => filterFn(item, debouncedQuery));
  }, [items, debouncedQuery, filterFn]);

  // Virtual list
  const { containerRef, virtualItems, totalHeight } = useVirtualList({
    items: filteredItems,
    itemHeight,
    overscan: 5,
    getKey,
  });

  // Loading skeletons
  if (loading) {
    return (
      <div className={`relative overflow-auto ${className}`} style={{ height }}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-muted rounded-md mx-2 my-1"
            style={{ height: itemHeight - 8 }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`} style={{ height }}>
      {searchable && (
        <div className="px-2 py-2 border-b">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
            className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      <div ref={containerRef} className="relative flex-1 overflow-auto">
        {filteredItems.length === 0 ? (
          emptyState || (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {debouncedQuery ? 'No results found' : 'No items'}
            </div>
          )
        ) : (
          <div style={{ height: totalHeight, position: 'relative' }}>
            {virtualItems.map(({ item, index, key, style }) => (
              <ListItem
                key={key}
                item={item}
                index={index}
                renderItem={renderItem}
                style={style}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hook for optimized list with filtering and sorting
 */
export function useOptimizedListData<T>({
  items,
  filterFn,
  sortFn,
  searchQuery = '',
}: {
  items: T[];
  filterFn?: (item: T, query: string) => boolean;
  sortFn?: (a: T, b: T) => number;
  searchQuery?: string;
}) {
  // Debounce search for performance
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const updateQuery = useDebouncedCallback(setDebouncedQuery, 200);

  useEffect(() => {
    updateQuery(searchQuery);
  }, [searchQuery, updateQuery]);

  // Memoize filtered and sorted items
  const processedItems = useMemo(() => {
    let result = items;

    // Filter
    if (debouncedQuery && filterFn) {
      result = result.filter((item) => filterFn(item, debouncedQuery));
    }

    // Sort
    if (sortFn) {
      result = [...result].sort(sortFn);
    }

    return result;
  }, [items, debouncedQuery, filterFn, sortFn]);

  return {
    items: processedItems,
    isFiltering: searchQuery !== debouncedQuery,
    isEmpty: processedItems.length === 0,
    totalCount: items.length,
    filteredCount: processedItems.length,
  };
}

/**
 * Hook for paginated data loading
 */
export function usePaginatedData<T>({
  fetchPage,
  pageSize = 20,
  initialData = [],
}: {
  fetchPage: (page: number, pageSize: number) => Promise<T[]>;
  pageSize?: number;
  initialData?: T[];
}) {
  const [items, setItems] = useState<T[]>(initialData);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const newItems = await fetchPage(page, pageSize);
      setItems((prev) => [...prev, ...newItems]);
      setPage((prev) => prev + 1);
      setHasMore(newItems.length === pageSize);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load'));
    } finally {
      setLoading(false);
    }
  }, [fetchPage, page, pageSize, loading, hasMore]);

  const refresh = useCallback(async () => {
    setItems([]);
    setPage(0);
    setHasMore(true);
    setLoading(true);
    setError(null);

    try {
      const newItems = await fetchPage(0, pageSize);
      setItems(newItems);
      setPage(1);
      setHasMore(newItems.length === pageSize);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load'));
    } finally {
      setLoading(false);
    }
  }, [fetchPage, pageSize]);

  return {
    items,
    loading,
    hasMore,
    error,
    loadMore,
    refresh,
    page,
  };
}
