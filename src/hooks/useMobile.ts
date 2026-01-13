/**
 * Mobile & Touch Utilities
 * Comprehensive hooks for mobile responsiveness and touch interactions
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ============ Device Detection ============

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isPWA: boolean;
  orientation: 'portrait' | 'landscape';
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
  hasNotch: boolean;
  prefersReducedMotion: boolean;
  prefersColorScheme: 'light' | 'dark' | 'no-preference';
}

export const useDeviceInfo = (): DeviceInfo => {
  const [info, setInfo] = useState<DeviceInfo>(() => getDeviceInfo());

  useEffect(() => {
    const handleResize = () => setInfo(getDeviceInfo());
    const handleOrientationChange = () => setInfo(getDeviceInfo());

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Listen for reduced motion preference changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const colorQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    motionQuery.addEventListener?.('change', handleResize);
    colorQuery.addEventListener?.('change', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      motionQuery.removeEventListener?.('change', handleResize);
      colorQuery.removeEventListener?.('change', handleResize);
    };
  }, []);

  return info;
};

function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouch: false,
      isIOS: false,
      isAndroid: false,
      isSafari: false,
      isChrome: false,
      isFirefox: false,
      isPWA: false,
      orientation: 'landscape',
      screenWidth: 1920,
      screenHeight: 1080,
      viewportWidth: 1920,
      viewportHeight: 1080,
      pixelRatio: 1,
      hasNotch: false,
      prefersReducedMotion: false,
      prefersColorScheme: 'light',
    };
  }

  const ua = navigator.userAgent;
  const width = window.innerWidth;
  const height = window.innerHeight;

  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isMobile = width < 768 || /Mobile|Android|iPhone|iPod/.test(ua);
  const isTablet = (width >= 768 && width < 1024) || /iPad|Tablet/.test(ua);
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    isTouch,
    isIOS,
    isAndroid,
    isSafari: /Safari/.test(ua) && !/Chrome/.test(ua),
    isChrome: /Chrome/.test(ua),
    isFirefox: /Firefox/.test(ua),
    isPWA: window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true,
    orientation: width > height ? 'landscape' : 'portrait',
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: width,
    viewportHeight: height,
    pixelRatio: window.devicePixelRatio || 1,
    hasNotch: CSS.supports('padding-top: env(safe-area-inset-top)'),
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    prefersColorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'no-preference',
  };
}

// ============ Breakpoints ============

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const breakpointValues: Record<Breakpoint, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export const useBreakpoint = (): {
  current: Breakpoint;
  isAbove: (bp: Breakpoint) => boolean;
  isBelow: (bp: Breakpoint) => boolean;
  isBetween: (min: Breakpoint, max: Breakpoint) => boolean;
} => {
  const [width, setWidth] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const current = useMemo((): Breakpoint => {
    if (width >= breakpointValues['2xl']) return '2xl';
    if (width >= breakpointValues.xl) return 'xl';
    if (width >= breakpointValues.lg) return 'lg';
    if (width >= breakpointValues.md) return 'md';
    if (width >= breakpointValues.sm) return 'sm';
    return 'xs';
  }, [width]);

  return {
    current,
    isAbove: useCallback((bp: Breakpoint) => width >= breakpointValues[bp], [width]),
    isBelow: useCallback((bp: Breakpoint) => width < breakpointValues[bp], [width]),
    isBetween: useCallback(
      (min: Breakpoint, max: Breakpoint) => 
        width >= breakpointValues[min] && width < breakpointValues[max],
      [width]
    ),
  };
};

// ============ Touch Gestures ============

export interface SwipeState {
  direction: 'left' | 'right' | 'up' | 'down' | null;
  distance: number;
  velocity: number;
}

export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwiping?: (state: SwipeState) => void;
  threshold?: number;
  preventDefaultOnSwipe?: boolean;
}

export const useSwipe = (handlers: SwipeHandlers = {}) => {
  const { threshold = 50, preventDefaultOnSwipe = false } = handlers;
  
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent | TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent | TouchEvent) => {
    if (!touchStartRef.current) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    const diffX = touchStartRef.current.x - currentX;
    const diffY = touchStartRef.current.y - currentY;
    
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);
    
    const distance = Math.sqrt(diffX * diffX + diffY * diffY);
    const duration = (Date.now() - touchStartRef.current.time) / 1000;
    const velocity = distance / (duration || 0.001);

    let direction: SwipeState['direction'] = null;
    
    if (absX > absY && absX > threshold / 2) {
      direction = diffX > 0 ? 'left' : 'right';
    } else if (absY > absX && absY > threshold / 2) {
      direction = diffY > 0 ? 'up' : 'down';
    }

    if (preventDefaultOnSwipe && direction) {
      e.preventDefault();
    }

    handlers.onSwiping?.({ direction, distance, velocity });
    
    touchEndRef.current = { x: currentX, y: currentY };
  }, [handlers, threshold, preventDefaultOnSwipe]);

  const onTouchEnd = useCallback(() => {
    if (!touchStartRef.current || !touchEndRef.current) {
      touchStartRef.current = null;
      touchEndRef.current = null;
      return;
    }

    const diffX = touchStartRef.current.x - touchEndRef.current.x;
    const diffY = touchStartRef.current.y - touchEndRef.current.y;
    
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);

    if (absX > absY && absX > threshold) {
      if (diffX > 0) {
        handlers.onSwipeLeft?.();
      } else {
        handlers.onSwipeRight?.();
      }
    } else if (absY > absX && absY > threshold) {
      if (diffY > 0) {
        handlers.onSwipeUp?.();
      } else {
        handlers.onSwipeDown?.();
      }
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [handlers, threshold]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
};

// ============ Pinch to Zoom ============

export interface PinchState {
  scale: number;
  origin: { x: number; y: number };
}

export const usePinchZoom = (options?: {
  minScale?: number;
  maxScale?: number;
  onPinch?: (state: PinchState) => void;
  onPinchEnd?: (scale: number) => void;
}) => {
  const { minScale = 0.5, maxScale = 3, onPinch, onPinchEnd } = options || {};
  
  const initialDistance = useRef<number | null>(null);
  const initialScale = useRef(1);
  const [scale, setScale] = useState(1);

  const getDistance = (t0: Touch, t1: Touch): number => {
    const dx = t0.clientX - t1.clientX;
    const dy = t0.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getCenter = (t0: Touch, t1: Touch): { x: number; y: number } => ({
    x: (t0.clientX + t1.clientX) / 2,
    y: (t0.clientY + t1.clientY) / 2,
  });

  const onTouchStart = useCallback((e: React.TouchEvent | TouchEvent) => {
    if (e.touches.length === 2) {
      initialDistance.current = getDistance(e.touches[0], e.touches[1]);
      initialScale.current = scale;
    }
  }, [scale]);

  const onTouchMove = useCallback((e: React.TouchEvent | TouchEvent) => {
    if (e.touches.length === 2 && initialDistance.current !== null) {
      e.preventDefault();
      
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scaleChange = currentDistance / initialDistance.current;
      const newScale = Math.min(maxScale, Math.max(minScale, initialScale.current * scaleChange));
      
      setScale(newScale);
      onPinch?.({
        scale: newScale,
        origin: getCenter(e.touches[0], e.touches[1]),
      });
    }
  }, [minScale, maxScale, onPinch]);

  const onTouchEnd = useCallback(() => {
    if (initialDistance.current !== null) {
      initialDistance.current = null;
      onPinchEnd?.(scale);
    }
  }, [scale, onPinchEnd]);

  const resetScale = useCallback(() => setScale(1), []);

  return {
    scale,
    resetScale,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
};

// ============ Long Press ============

export const useLongPress = (
  callback: () => void,
  options?: {
    threshold?: number;
    onStart?: () => void;
    onCancel?: () => void;
  }
) => {
  const { threshold = 500, onStart, onCancel } = options || {};
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onStart?.();
    
    isLongPressActive.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      callback();
    }, threshold);
  }, [callback, threshold, onStart]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (!isLongPressActive.current) {
      onCancel?.();
    }
  }, [onCancel]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
  };
};

// ============ Double Tap ============

export const useDoubleTap = (
  onDoubleTap: () => void,
  options?: {
    threshold?: number;
    onSingleTap?: () => void;
  }
) => {
  const { threshold = 300, onSingleTap } = options || {};
  
  const lastTapRef = useRef(0);
  const singleTapTimer = useRef<NodeJS.Timeout | null>(null);

  const handler = useCallback(() => {
    const now = Date.now();
    const timeDiff = now - lastTapRef.current;

    if (timeDiff < threshold && timeDiff > 0) {
      // Double tap
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
        singleTapTimer.current = null;
      }
      onDoubleTap();
      lastTapRef.current = 0;
    } else {
      // Potential single tap - wait to see if it's a double tap
      lastTapRef.current = now;
      
      if (onSingleTap) {
        singleTapTimer.current = setTimeout(() => {
          onSingleTap();
          singleTapTimer.current = null;
        }, threshold);
      }
    }
  }, [threshold, onDoubleTap, onSingleTap]);

  useEffect(() => {
    return () => {
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
      }
    };
  }, []);

  return { onClick: handler };
};

// ============ Pull to Refresh ============

export const usePullToRefresh = (
  onRefresh: () => Promise<void>,
  options?: {
    threshold?: number;
    resistance?: number;
    maxPull?: number;
  }
) => {
  const { threshold = 80, resistance = 2.5, maxPull = 150 } = options || {};
  
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  const startY = useRef(0);
  const currentY = useRef(0);

  const canPull = useCallback(() => {
    return window.scrollY <= 0;
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent | TouchEvent) => {
    if (canPull() && !refreshing) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, [canPull, refreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent | TouchEvent) => {
    if (!pulling || refreshing) return;

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    if (diff > 0) {
      const distance = Math.min(maxPull, diff / resistance);
      setPullDistance(distance);
      
      if (distance > 0) {
        e.preventDefault();
      }
    }
  }, [pulling, refreshing, resistance, maxPull]);

  const onTouchEnd = useCallback(async () => {
    if (!pulling) return;

    setPulling(false);

    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }

    setPullDistance(0);
  }, [pulling, pullDistance, threshold, refreshing, onRefresh]);

  return {
    pulling,
    pullDistance,
    refreshing,
    progress: Math.min(1, pullDistance / threshold),
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
};

// ============ Safe Area ============

export const useSafeArea = () => {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10) || 
             parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
        right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10) ||
               parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0', 10),
        bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10) ||
                parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
        left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10) ||
              parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0', 10),
      });
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    window.addEventListener('orientationchange', updateSafeArea);

    return () => {
      window.removeEventListener('resize', updateSafeArea);
      window.removeEventListener('orientationchange', updateSafeArea);
    };
  }, []);

  return safeArea;
};

// ============ Keyboard ============

export const useVirtualKeyboard = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if ('virtualKeyboard' in navigator) {
      const vk = (navigator as any).virtualKeyboard;
      vk.overlaysContent = true;

      const handleGeometryChange = () => {
        const { height } = vk.boundingRect;
        setIsOpen(height > 0);
        setKeyboardHeight(height);
      };

      vk.addEventListener('geometrychange', handleGeometryChange);
      return () => vk.removeEventListener('geometrychange', handleGeometryChange);
    }

    // Fallback: detect keyboard via viewport height changes
    const initialHeight = window.innerHeight;
    
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDiff = initialHeight - currentHeight;
      
      // If height decreased significantly, keyboard is probably open
      if (heightDiff > 150) {
        setIsOpen(true);
        setKeyboardHeight(heightDiff);
      } else {
        setIsOpen(false);
        setKeyboardHeight(0);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { isOpen, keyboardHeight };
};

// ============ Orientation Lock ============

export const useOrientationLock = () => {
  const lock = useCallback(async (orientation: 'portrait' | 'landscape' | 'any') => {
    const screenOrientation = screen.orientation as any;
    if (!screenOrientation?.lock) {
      console.warn('Screen orientation lock not supported');
      return false;
    }

    try {
      const orientationValue = orientation === 'any' ? 'any' : `${orientation}-primary`;
      await screenOrientation.lock(orientationValue);
      return true;
    } catch (error) {
      console.error('Failed to lock orientation:', error);
      return false;
    }
  }, []);

  const unlock = useCallback(() => {
    const screenOrientation = screen.orientation as any;
    if (screenOrientation?.unlock) {
      screenOrientation.unlock();
    }
  }, []);

  return { lock, unlock };
};

// ============ Touch Target Size Helper ============

/**
 * Returns minimum touch target size based on device
 * WCAG 2.5.5 requires 44x44px minimum
 */
export const useTouchTargetSize = () => {
  const device = useDeviceInfo();
  
  return useMemo(() => ({
    minSize: device.isTouch ? 44 : 24,
    recommendedSize: device.isTouch ? 48 : 32,
    spacing: device.isTouch ? 8 : 4,
    style: {
      minWidth: device.isTouch ? '44px' : '24px',
      minHeight: device.isTouch ? '44px' : '24px',
    },
  }), [device.isTouch]);
};

export default {
  useDeviceInfo,
  useBreakpoint,
  useSwipe,
  usePinchZoom,
  useLongPress,
  useDoubleTap,
  usePullToRefresh,
  useSafeArea,
  useVirtualKeyboard,
  useOrientationLock,
  useTouchTargetSize,
};
