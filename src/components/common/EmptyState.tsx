import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Standardized empty state component
 * Use when a list or section has no data to display
 */

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * Compact empty state for smaller sections
 */
interface CompactEmptyStateProps {
  message: string;
  className?: string;
}

export function CompactEmptyState({ message, className = "" }: CompactEmptyStateProps) {
  return (
    <div className={`text-center py-8 text-muted-foreground ${className}`}>
      <p>{message}</p>
    </div>
  );
}

/**
 * Empty state with illustration for major sections
 */
interface IllustratedEmptyStateProps {
  title: string;
  description: string;
  illustration?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function IllustratedEmptyState({
  title,
  description,
  illustration,
  actions,
  className = "",
}: IllustratedEmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      {illustration && (
        <div className="mb-6">
          {illustration}
        </div>
      )}
      <h2 className="text-2xl font-bold text-foreground mb-3">{title}</h2>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      {actions && (
        <div className="flex gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}
