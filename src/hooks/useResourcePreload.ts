/**
 * Resource Preloading Hooks
 * Intelligently preload resources based on user behavior and navigation patterns
 */

import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { imagePreloader } from '@/lib/imagePreloader';

/**
 * Preload resources for likely next routes based on current route
 */
export function useRoutePreloading() {
  const location = useLocation();

  useEffect(() => {
    // Define route relationships and what to preload
    const routePreloads: Record<string, () => void> = {
      '/': () => {
        // From homepage, likely to go to community or auth
        prefetchRoute('/community');
        prefetchRoute('/auth');
      },
      '/community': () => {
        // From community, likely to go to discussions or events
        prefetchRoute('/discussions');
        prefetchRoute('/events');
      },
      '/marketplace': () => {
        // From marketplace, preload product pages data
        prefetchRoute('/store/product');
      },
      '/discussions': () => {
        // Preload community
        prefetchRoute('/community');
      },
    };

    const currentPath = location.pathname;
    const preloadFn = routePreloads[currentPath];

    if (preloadFn) {
      // Delay preloading to not interfere with current page load
      const timer = setTimeout(preloadFn, 2000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);
}

/**
 * Prefetch a route's JavaScript chunk
 */
function prefetchRoute(path: string): void {
  // Create a link element to prefetch the route
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = 'document';
  link.href = path;
  document.head.appendChild(link);
}

/**
 * Preload images on hover (for links/cards)
 */
export function useHoverPreload(imageUrls: string[]) {
  const preloadedRef = useRef(false);

  const handleMouseEnter = useCallback(() => {
    if (!preloadedRef.current && imageUrls.length > 0) {
      preloadedRef.current = true;
      imagePreloader.preloadMany(imageUrls, 'high');
    }
  }, [imageUrls]);

  return { onMouseEnter: handleMouseEnter };
}

/**
 * Preload images when they're near the viewport
 */
export function useViewportPreload(
  imageUrls: string[],
  options: {
    rootMargin?: string;
    enabled?: boolean;
  } = {}
) {
  const { rootMargin = '200px', enabled = true } = options;
  const elementRef = useRef<HTMLDivElement>(null);
  const preloadedRef = useRef(false);

  useEffect(() => {
    if (!enabled || preloadedRef.current || imageUrls.length === 0) return;

    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !preloadedRef.current) {
          preloadedRef.current = true;
          imagePreloader.preloadMany(imageUrls, 'normal');
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [imageUrls, rootMargin, enabled]);

  return elementRef;
}

/**
 * Preload critical resources for a component
 */
export function useCriticalPreload(resources: {
  images?: string[];
  fonts?: string[];
  scripts?: string[];
}) {
  useEffect(() => {
    const { images = [], fonts = [], scripts = [] } = resources;

    // Preload images with high priority
    if (images.length > 0) {
      imagePreloader.preloadAboveFold(images);
    }

    // Preload fonts
    fonts.forEach((fontUrl) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      link.href = fontUrl;
      document.head.appendChild(link);
    });

    // Preload scripts
    scripts.forEach((scriptUrl) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = scriptUrl;
      document.head.appendChild(link);
    });
  }, []);
}

/**
 * Preload resources during idle time
 */
export function useIdlePreload(imageUrls: string[]) {
  useEffect(() => {
    if (imageUrls.length === 0) return;

    const schedulePreload = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(
          () => {
            imagePreloader.preloadOnIdle(imageUrls);
          },
          { timeout: 5000 }
        );
      } else {
        setTimeout(() => {
          imagePreloader.preloadMany(imageUrls, 'low');
        }, 2000);
      }
    };

    // Wait for initial render to complete
    const timer = setTimeout(schedulePreload, 1000);
    return () => clearTimeout(timer);
  }, [imageUrls.join(',')]);
}

/**
 * Preload next page images for pagination
 */
export function usePaginationPreload({
  currentPage,
  totalPages,
  getPageImages,
}: {
  currentPage: number;
  totalPages: number;
  getPageImages: (page: number) => string[];
}) {
  useEffect(() => {
    // Preload next page images
    if (currentPage < totalPages - 1) {
      const nextPageImages = getPageImages(currentPage + 1);
      imagePreloader.preloadOnIdle(nextPageImages);
    }

    // Also preload previous page if going backwards might happen
    if (currentPage > 0) {
      const prevPageImages = getPageImages(currentPage - 1);
      imagePreloader.preloadOnIdle(prevPageImages);
    }
  }, [currentPage, totalPages, getPageImages]);
}

/**
 * Preload based on user scroll direction
 */
export function useScrollDirectionPreload({
  items,
  getImageUrl,
  currentIndex,
  preloadCount = 3,
}: {
  items: any[];
  getImageUrl: (item: any) => string | undefined;
  currentIndex: number;
  preloadCount?: number;
}) {
  const lastIndexRef = useRef(currentIndex);

  useEffect(() => {
    const lastIndex = lastIndexRef.current;
    const scrollingDown = currentIndex > lastIndex;
    lastIndexRef.current = currentIndex;

    const imagesToPreload: string[] = [];

    if (scrollingDown) {
      // Preload items ahead
      for (let i = 1; i <= preloadCount; i++) {
        const nextItem = items[currentIndex + i];
        if (nextItem) {
          const url = getImageUrl(nextItem);
          if (url) imagesToPreload.push(url);
        }
      }
    } else {
      // Preload items behind
      for (let i = 1; i <= preloadCount; i++) {
        const prevItem = items[currentIndex - i];
        if (prevItem) {
          const url = getImageUrl(prevItem);
          if (url) imagesToPreload.push(url);
        }
      }
    }

    if (imagesToPreload.length > 0) {
      imagePreloader.preloadMany(imagesToPreload, 'normal');
    }
  }, [currentIndex, items, getImageUrl, preloadCount]);
}
