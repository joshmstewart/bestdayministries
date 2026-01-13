import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

/**
 * Accessible loading spinner with screen reader support
 */
export function LoadingSpinner({ 
  size = "md", 
  label = "Loading...",
  className 
}: LoadingSpinnerProps) {
  return (
    <div 
      role="status" 
      aria-label={label}
      className={cn("inline-flex items-center justify-center", className)}
    >
      <Loader2 
        className={cn("animate-spin text-primary", sizeClasses[size])} 
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

interface LoadingOverlayProps {
  show: boolean;
  label?: string;
  blur?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Full-screen or container loading overlay
 */
export function LoadingOverlay({ 
  show, 
  label = "Loading...",
  blur = true,
  className,
  children 
}: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div
      role="alert"
      aria-busy="true"
      aria-label={label}
      className={cn(
        "absolute inset-0 z-50",
        "flex items-center justify-center",
        "bg-background/80",
        blur && "backdrop-blur-sm",
        "animate-fade-in",
        className
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" label={label} />
        {children || (
          <p className="text-sm text-muted-foreground">{label}</p>
        )}
      </div>
    </div>
  );
}

interface CardSkeletonProps {
  lines?: number;
  showImage?: boolean;
  showAvatar?: boolean;
  className?: string;
}

/**
 * Skeleton loader for cards
 */
export function CardSkeleton({ 
  lines = 3, 
  showImage = false,
  showAvatar = false,
  className 
}: CardSkeletonProps) {
  return (
    <div 
      role="status"
      aria-label="Loading content"
      className={cn(
        "rounded-lg border bg-card p-4 space-y-4",
        "animate-pulse",
        className
      )}
    >
      {showImage && (
        <Skeleton className="h-48 w-full rounded-md" />
      )}
      
      <div className="flex items-center gap-3">
        {showAvatar && (
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        )}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton 
            key={i} 
            className={cn(
              "h-3",
              i === lines - 1 ? "w-4/5" : "w-full"
            )} 
          />
        ))}
      </div>
      
      <span className="sr-only">Loading content</span>
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

/**
 * Skeleton loader for tables
 */
export function TableSkeleton({ 
  rows = 5, 
  columns = 4,
  className 
}: TableSkeletonProps) {
  return (
    <div 
      role="status"
      aria-label="Loading table"
      className={cn("rounded-lg border overflow-hidden", className)}
    >
      {/* Header */}
      <div className="bg-muted/50 p-4 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={rowIndex} 
          className="p-4 flex gap-4 border-t"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              className={cn(
                "h-4 flex-1",
                colIndex === 0 && "w-1/4 flex-none"
              )} 
            />
          ))}
        </div>
      ))}
      
      <span className="sr-only">Loading table</span>
    </div>
  );
}

interface ListSkeletonProps {
  items?: number;
  showIcon?: boolean;
  className?: string;
}

/**
 * Skeleton loader for lists
 */
export function ListSkeleton({ 
  items = 5, 
  showIcon = true,
  className 
}: ListSkeletonProps) {
  return (
    <div 
      role="status"
      aria-label="Loading list"
      className={cn("space-y-3", className)}
    >
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
          {showIcon && (
            <Skeleton className="h-8 w-8 rounded-md flex-shrink-0" />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
      
      <span className="sr-only">Loading list</span>
    </div>
  );
}

interface FormSkeletonProps {
  fields?: number;
  showLabels?: boolean;
  className?: string;
}

/**
 * Skeleton loader for forms
 */
export function FormSkeleton({ 
  fields = 4, 
  showLabels = true,
  className 
}: FormSkeletonProps) {
  return (
    <div 
      role="status"
      aria-label="Loading form"
      className={cn("space-y-6", className)}
    >
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          {showLabels && (
            <Skeleton className="h-4 w-24" />
          )}
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      
      <div className="flex gap-3 pt-2">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-20 rounded-md" />
      </div>
      
      <span className="sr-only">Loading form</span>
    </div>
  );
}

interface PageSkeletonProps {
  showHeader?: boolean;
  showSidebar?: boolean;
  className?: string;
}

/**
 * Full page skeleton
 */
export function PageSkeleton({ 
  showHeader = true, 
  showSidebar = false,
  className 
}: PageSkeletonProps) {
  return (
    <div 
      role="status"
      aria-label="Loading page"
      className={cn("min-h-screen", className)}
    >
      {showHeader && (
        <div className="h-16 border-b bg-card px-4 flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      )}
      
      <div className="flex">
        {showSidebar && (
          <div className="w-64 border-r p-4 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        )}
        
        <div className="flex-1 p-6 space-y-6">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} lines={2} />
            ))}
          </div>
        </div>
      </div>
      
      <span className="sr-only">Loading page</span>
    </div>
  );
}
