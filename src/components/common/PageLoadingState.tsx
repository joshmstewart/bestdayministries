/**
 * Standardized loading state component for pages
 * Use this for consistent loading UI across the application
 */

interface PageLoadingStateProps {
  message?: string;
}

export function PageLoadingState({ message = "Loading..." }: PageLoadingStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

/**
 * Standardized loading state for sections within a page
 */
interface SectionLoadingStateProps {
  message?: string;
  className?: string;
}

export function SectionLoadingState({ message = "Loading...", className = "" }: SectionLoadingStateProps) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className="text-center space-y-3">
        <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

/**
 * Inline loading spinner for buttons and small elements
 */
interface InlineLoadingProps {
  size?: "sm" | "md" | "lg";
}

export function InlineLoading({ size = "sm" }: InlineLoadingProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full border-2 border-primary border-t-transparent animate-spin`} />
  );
}

/**
 * Card skeleton for lists and grids
 */
export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-3 bg-muted rounded w-1/4" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-5/6" />
        <div className="h-3 bg-muted rounded w-4/6" />
      </div>
    </div>
  );
}

/**
 * Multiple card skeletons for lists
 */
interface CardSkeletonListProps {
  count?: number;
  className?: string;
}

export function CardSkeletonList({ count = 3, className = "" }: CardSkeletonListProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Table row skeleton for data tables
 */
interface TableRowSkeletonProps {
  columns?: number;
}

export function TableRowSkeleton({ columns = 4 }: TableRowSkeletonProps) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-muted rounded w-full" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Table skeleton for data tables
 */
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <table className="w-full">
      <thead>
        <tr className="animate-pulse">
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i} className="px-4 py-3 text-left">
              <div className="h-4 bg-muted rounded w-20" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRowSkeleton key={i} columns={columns} />
        ))}
      </tbody>
    </table>
  );
}
