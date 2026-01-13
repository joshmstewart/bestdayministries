/**
 * Smart Query Cache for Supabase queries
 * Provides intelligent caching with TTL, stale-while-revalidate, and background refresh
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  staleAt: number;
  expireAt: number;
}

interface CacheOptions {
  /** Time until data is considered stale (ms) - will serve cached but refresh in background */
  staleTime?: number;
  /** Time until cache entry expires completely (ms) */
  cacheTime?: number;
  /** Whether to dedupe concurrent requests for same key */
  dedupe?: boolean;
}

const DEFAULT_STALE_TIME = 30 * 1000; // 30 seconds
const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  private subscribers = new Map<string, Set<(data: any) => void>>();

  /**
   * Get cached data or fetch if needed
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const {
      staleTime = DEFAULT_STALE_TIME,
      cacheTime = DEFAULT_CACHE_TIME,
      dedupe = true,
    } = options;

    const now = Date.now();
    const cached = this.cache.get(key);

    // Return cached data if still fresh
    if (cached && now < cached.staleAt) {
      return cached.data;
    }

    // Return stale data while revalidating in background
    if (cached && now < cached.expireAt) {
      this.revalidateInBackground(key, fetcher, { staleTime, cacheTime });
      return cached.data;
    }

    // Dedupe concurrent requests
    if (dedupe && this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Fetch fresh data
    const fetchPromise = this.fetchAndCache(key, fetcher, { staleTime, cacheTime });
    
    if (dedupe) {
      this.pendingRequests.set(key, fetchPromise);
      fetchPromise.finally(() => this.pendingRequests.delete(key));
    }

    return fetchPromise;
  }

  /**
   * Prefetch data into cache
   */
  async prefetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<void> {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.staleAt) {
      return; // Already have fresh data
    }
    await this.get(key, fetcher, options);
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a prefix
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Set data directly in cache
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const {
      staleTime = DEFAULT_STALE_TIME,
      cacheTime = DEFAULT_CACHE_TIME,
    } = options;

    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      staleAt: now + staleTime,
      expireAt: now + cacheTime,
    });

    // Notify subscribers
    this.notifySubscribers(key, data);
  }

  /**
   * Subscribe to cache updates for a key
   */
  subscribe<T>(key: string, callback: (data: T) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    return () => {
      this.subscribers.get(key)?.delete(callback);
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  private async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { staleTime: number; cacheTime: number }
  ): Promise<T> {
    const data = await fetcher();
    this.set(key, data, options);
    return data;
  }

  private revalidateInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { staleTime: number; cacheTime: number }
  ): void {
    // Don't revalidate if already pending
    if (this.pendingRequests.has(key)) return;

    const fetchPromise = this.fetchAndCache(key, fetcher, options);
    this.pendingRequests.set(key, fetchPromise);
    fetchPromise.finally(() => this.pendingRequests.delete(key));
  }

  private notifySubscribers<T>(key: string, data: T): void {
    this.subscribers.get(key)?.forEach((callback) => callback(data));
  }
}

// Singleton instance
export const queryCache = new QueryCache();

/**
 * Create a cache key from query parameters
 */
export function createCacheKey(table: string, params: Record<string, any> = {}): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${k}:${JSON.stringify(params[k])}`)
    .join('|');
  return `${table}:${sortedParams}`;
}

/**
 * Hook for using cached queries in React components
 */
export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions & { enabled?: boolean } = {}
) {
  const { enabled = true, ...cacheOptions } = options;
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await queryCache.get(key, fetcher, cacheOptions);
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error('Unknown error'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Subscribe to cache updates
    const unsubscribe = queryCache.subscribe<T>(key, (newData) => {
      if (!cancelled) {
        setData(newData);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [key, enabled]);

  return { data, loading, error, refetch: () => queryCache.invalidate(key) };
}

// Import useState and useEffect for the hook
import { useState, useEffect } from 'react';
