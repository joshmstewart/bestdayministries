import { useEffect, useRef, useState, useCallback } from "react";

interface AnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  delay?: number;
}

/**
 * Hook for scroll-triggered animations
 */
export function useScrollAnimation(options: AnimationOptions = {}) {
  const { 
    threshold = 0.1, 
    rootMargin = "0px", 
    triggerOnce = true,
    delay = 0 
  } = options;
  
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      setHasAnimated(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!triggerOnce || !hasAnimated)) {
          if (delay > 0) {
            setTimeout(() => {
              setIsVisible(true);
              setHasAnimated(true);
            }, delay);
          } else {
            setIsVisible(true);
            setHasAnimated(true);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce, delay, hasAnimated]);

  return { ref, isVisible };
}

/**
 * Hook for staggered animations in lists
 */
export function useStaggerAnimation(
  itemCount: number, 
  options: { staggerDelay?: number; initialDelay?: number } = {}
) {
  const { staggerDelay = 100, initialDelay = 0 } = options;
  const [visibleItems, setVisibleItems] = useState<number[]>([]);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setVisibleItems(Array.from({ length: itemCount }, (_, i) => i));
      return;
    }

    const timers: NodeJS.Timeout[] = [];

    for (let i = 0; i < itemCount; i++) {
      const timer = setTimeout(() => {
        setVisibleItems(prev => [...prev, i]);
      }, initialDelay + i * staggerDelay);
      timers.push(timer);
    }

    return () => timers.forEach(clearTimeout);
  }, [itemCount, staggerDelay, initialDelay]);

  const isVisible = (index: number) => visibleItems.includes(index);
  
  return { isVisible, visibleItems };
}

/**
 * Hook for spring-like animations
 */
export function useSpringAnimation(
  value: number,
  options: { stiffness?: number; damping?: number } = {}
) {
  const { stiffness = 170, damping = 26 } = options;
  const [animatedValue, setAnimatedValue] = useState(value);
  const velocityRef = useRef(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setAnimatedValue(value);
      return;
    }

    const animate = () => {
      const displacement = value - animatedValue;
      const spring = displacement * stiffness;
      const damper = velocityRef.current * damping;
      const acceleration = spring - damper;
      
      velocityRef.current += acceleration * 0.001;
      const newValue = animatedValue + velocityRef.current;

      if (Math.abs(displacement) < 0.01 && Math.abs(velocityRef.current) < 0.01) {
        setAnimatedValue(value);
        return;
      }

      setAnimatedValue(newValue);
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, stiffness, damping, animatedValue]);

  return animatedValue;
}

interface TransitionState {
  isEntering: boolean;
  isExiting: boolean;
  isVisible: boolean;
}

/**
 * Hook for enter/exit transitions
 */
export function useTransition(
  show: boolean, 
  options: { enterDuration?: number; exitDuration?: number } = {}
): TransitionState {
  const { enterDuration = 200, exitDuration = 150 } = options;
  const [state, setState] = useState<TransitionState>({
    isEntering: false,
    isExiting: false,
    isVisible: show,
  });

  useEffect(() => {
    if (show && !state.isVisible) {
      setState({ isEntering: true, isExiting: false, isVisible: true });
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, isEntering: false }));
      }, enterDuration);
      return () => clearTimeout(timer);
    } else if (!show && state.isVisible) {
      setState(prev => ({ ...prev, isEntering: false, isExiting: true }));
      const timer = setTimeout(() => {
        setState({ isEntering: false, isExiting: false, isVisible: false });
      }, exitDuration);
      return () => clearTimeout(timer);
    }
  }, [show, state.isVisible, enterDuration, exitDuration]);

  return state;
}

/**
 * Hook for typewriter effect
 */
export function useTypewriter(
  text: string, 
  options: { speed?: number; delay?: number } = {}
) {
  const { speed = 50, delay = 0 } = options;
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayText(text);
      setIsComplete(true);
      return;
    }

    setDisplayText("");
    setIsComplete(false);

    const startTimer = setTimeout(() => {
      let index = 0;
      const interval = setInterval(() => {
        if (index < text.length) {
          setDisplayText(text.slice(0, index + 1));
          index++;
        } else {
          setIsComplete(true);
          clearInterval(interval);
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [text, speed, delay]);

  return { displayText, isComplete };
}

/**
 * Hook for counting animation
 */
export function useCountUp(
  end: number, 
  options: { duration?: number; start?: number; decimals?: number } = {}
) {
  const { duration = 2000, start = 0, decimals = 0 } = options;
  const [count, setCount] = useState(start);
  const countRef = useRef(start);
  const frameRef = useRef<number>();

  const animate = useCallback(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setCount(end);
      return;
    }

    const startTime = performance.now();
    
    const tick = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      
      countRef.current = current;
      setCount(parseFloat(current.toFixed(decimals)));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [end, start, duration, decimals]);

  useEffect(() => {
    animate();
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [animate]);

  return count;
}

/**
 * Hook for parallax effect
 */
export function useParallax(speed: number = 0.5) {
  const ref = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const scrolled = window.scrollY;
      const elementTop = rect.top + scrolled;
      const diff = scrolled - elementTop;
      setOffset(diff * speed);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return { ref, offset, transform: `translateY(${offset}px)` };
}

/**
 * Hook for hover animations
 */
export function useHoverAnimation() {
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<HTMLElement>(null);

  const handlers = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
    onFocus: () => setIsHovered(true),
    onBlur: () => setIsHovered(false),
  };

  return { ref, isHovered, handlers };
}
