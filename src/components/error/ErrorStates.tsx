import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw, WifiOff, ServerCrash, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BaseErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Generic error state component
 */
export function ErrorState({ 
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
  className 
}: BaseErrorProps) {
  return (
    <div 
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        "animate-fade-in",
        className
      )}
    >
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-muted-foreground max-w-md mb-4">
        {message}
      </p>
      
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try Again
        </Button>
      )}
    </div>
  );
}

/**
 * Network/offline error state
 */
export function OfflineState({ 
  onRetry,
  className 
}: Pick<BaseErrorProps, 'onRetry' | 'className'>) {
  return (
    <div 
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        "animate-fade-in",
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <WifiOff className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        You're offline
      </h3>
      
      <p className="text-sm text-muted-foreground max-w-md mb-4">
        Please check your internet connection and try again.
      </p>
      
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Retry Connection
        </Button>
      )}
    </div>
  );
}

/**
 * Server error state (500)
 */
export function ServerErrorState({ 
  onRetry,
  className 
}: Pick<BaseErrorProps, 'onRetry' | 'className'>) {
  return (
    <div 
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        "animate-fade-in",
        className
      )}
    >
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <ServerCrash className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Server Error
      </h3>
      
      <p className="text-sm text-muted-foreground max-w-md mb-4">
        Our servers are having trouble. Please try again in a moment.
      </p>
      
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try Again
        </Button>
      )}
    </div>
  );
}

/**
 * Not found / 404 state
 */
export function NotFoundState({ 
  title = "Not Found",
  message = "The content you're looking for doesn't exist or has been moved.",
  className 
}: Omit<BaseErrorProps, 'onRetry'>) {
  return (
    <div 
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        "animate-fade-in",
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <FileQuestion className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-muted-foreground max-w-md">
        {message}
      </p>
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Empty state component
 */
export function EmptyState({ 
  icon,
  title,
  message,
  action,
  className 
}: EmptyStateProps) {
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        "animate-fade-in",
        className
      )}
    >
      {icon && (
        <div className="rounded-full bg-muted p-4 mb-4">
          {icon}
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      {message && (
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          {message}
        </p>
      )}
      
      {action && (
        <Button onClick={action.onClick} className="gap-2">
          {action.label}
        </Button>
      )}
    </div>
  );
}

interface InlineErrorProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Inline error message for forms/inputs
 */
export function InlineError({ 
  message, 
  onDismiss,
  className 
}: InlineErrorProps) {
  return (
    <div 
      role="alert"
      className={cn(
        "flex items-center gap-2 p-3 rounded-md",
        "bg-destructive/10 border border-destructive/20",
        "text-sm text-destructive",
        "animate-scale-in",
        className
      )}
    >
      <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button 
          onClick={onDismiss}
          className="text-destructive/70 hover:text-destructive"
          aria-label="Dismiss error"
        >
          ×
        </button>
      )}
    </div>
  );
}

/**
 * Toast-style error notification
 */
export function ErrorToast({ 
  message, 
  onDismiss,
  className 
}: InlineErrorProps) {
  return (
    <div 
      role="alert"
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "flex items-center gap-3 p-4 rounded-lg",
        "bg-destructive text-destructive-foreground",
        "shadow-lg",
        "animate-slide-up",
        className
      )}
    >
      <AlertTriangle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
      {onDismiss && (
        <button 
          onClick={onDismiss}
          className="ml-2 opacity-70 hover:opacity-100"
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}
