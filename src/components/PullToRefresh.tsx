import { ReactNode, useCallback, forwardRef } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  threshold?: number;
}

export const PullToRefresh = forwardRef<HTMLDivElement, PullToRefreshProps>(({
  onRefresh,
  children,
  className,
  disabled = false,
  threshold = 80,
}, ref) => {
  const { isPulling, isRefreshing, pullDistance, containerRef } = usePullToRefresh({
    onRefresh,
    threshold,
    disabled,
  });

  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div 
      ref={containerRef}
      className={cn("relative", className)}
    >
      {/* Pull indicator */}
      <div 
        className={cn(
          "absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center transition-all duration-200",
          showIndicator ? "opacity-100" : "opacity-0"
        )}
        style={{ 
          top: Math.max(pullDistance - 40, 8),
          transform: `translateX(-50%) rotate(${progress * 180}deg)`,
        }}
      >
        <div className={cn(
          "w-10 h-10 rounded-full bg-background border-2 border-primary shadow-lg flex items-center justify-center",
          isRefreshing && "animate-pulse"
        )}>
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <ArrowDown 
              className={cn(
                "w-5 h-5 text-primary transition-transform",
                progress >= 1 && "text-green-500"
              )} 
            />
          )}
        </div>
      </div>

      {/* Content with pull offset */}
      <div 
        style={{ 
          transform: `translateY(${isRefreshing ? threshold / 2 : pullDistance / 2}px)`,
          transition: isPulling ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
});

PullToRefresh.displayName = 'PullToRefresh';
