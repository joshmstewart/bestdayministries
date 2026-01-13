import { forwardRef } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccessibleIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon: LucideIcon;
  label: string;
  size?: number;
  decorative?: boolean;
}

/**
 * Wrapper for icons with proper accessibility
 * WCAG 2.1 Success Criterion 1.1.1 - Non-text Content
 */
export const AccessibleIcon = forwardRef<HTMLSpanElement, AccessibleIconProps>(
  ({ icon: Icon, label, size = 16, decorative = false, className, ...props }, ref) => {
    if (decorative) {
      return (
        <span ref={ref} className={cn("inline-flex", className)} {...props}>
          <Icon 
            size={size} 
            aria-hidden="true" 
            focusable="false"
          />
        </span>
      );
    }

    return (
      <span 
        ref={ref}
        role="img" 
        aria-label={label}
        className={cn("inline-flex", className)}
        {...props}
      >
        <Icon 
          size={size} 
          aria-hidden="true" 
          focusable="false"
        />
      </span>
    );
  }
);

AccessibleIcon.displayName = "AccessibleIcon";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  size?: number;
}

/**
 * Accessible icon-only button
 * WCAG 2.1 Success Criterion 4.1.2 - Name, Role, Value
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon: Icon, label, size = 16, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex items-center justify-center",
          "rounded-md p-2",
          "text-muted-foreground hover:text-foreground",
          "hover:bg-accent",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          "transition-colors",
          className
        )}
        {...props}
      >
        <Icon size={size} aria-hidden="true" focusable="false" />
        <span className="sr-only">{label}</span>
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
