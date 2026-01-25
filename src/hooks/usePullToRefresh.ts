import { useEffect, useRef, useState, useCallback } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  resistance?: number;
  disabled?: boolean;
}

interface UsePullToRefreshReturn {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  containerRef: React.RefObject<HTMLDivElement>;
}

// Minimum distance to move before we consider it a pull-to-refresh vs normal scroll
const PULL_START_THRESHOLD = 10;

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const startX = useRef<number>(0);
  const currentY = useRef<number>(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  
  // Track if we've determined the gesture direction
  const gestureDecided = useRef(false);
  const isVerticalPull = useRef(false);
  // Track if touch is potentially starting a pull
  const touchStartedAtTop = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const scrollTop = containerRef.current?.scrollTop ?? window.scrollY;
    
    // Only track if we're at the top
    if (scrollTop > 5) {
      touchStartedAtTop.current = false;
      return;
    }
    
    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
    touchStartedAtTop.current = true;
    gestureDecided.current = false;
    isVerticalPull.current = false;
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || !touchStartedAtTop.current) return;
    
    const scrollTop = containerRef.current?.scrollTop ?? window.scrollY;
    
    // If we scrolled away from top, cancel any pull
    if (scrollTop > 5) {
      if (isPulling) {
        setIsPulling(false);
        setPullDistance(0);
      }
      touchStartedAtTop.current = false;
      return;
    }
    
    currentY.current = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    
    const deltaY = currentY.current - startY.current;
    const deltaX = currentX - startX.current;
    
    // If we haven't decided the gesture direction yet
    if (!gestureDecided.current) {
      const totalMovement = Math.abs(deltaY) + Math.abs(deltaX);
      
      // Wait until we have enough movement to decide
      if (totalMovement < PULL_START_THRESHOLD) {
        return;
      }
      
      gestureDecided.current = true;
      
      // Determine if this is a vertical pull-down gesture
      // Must be moving downward and more vertical than horizontal
      isVerticalPull.current = deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5;
      
      if (isVerticalPull.current) {
        setIsPulling(true);
      }
    }
    
    // Only handle as pull-to-refresh if we determined it's a vertical pull
    if (!isVerticalPull.current) {
      return;
    }
    
    const distance = Math.max(0, deltaY / resistance);
    
    if (distance > 0) {
      // Only prevent default when we're actively pulling
      e.preventDefault();
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  }, [isPulling, disabled, isRefreshing, resistance, threshold]);

  const handleTouchEnd = useCallback(async () => {
    // Reset touch tracking
    touchStartedAtTop.current = false;
    gestureDecided.current = false;
    isVerticalPull.current = false;
    
    if (!isPulling || disabled) {
      setIsPulling(false);
      setPullDistance(0);
      return;
    }
    
    setIsPulling(false);
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, disabled, pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const container = containerRef.current || document;
    
    container.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    container.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
    container.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart as EventListener);
      container.removeEventListener('touchmove', handleTouchMove as EventListener);
      container.removeEventListener('touchend', handleTouchEnd as EventListener);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    containerRef,
  };
}
