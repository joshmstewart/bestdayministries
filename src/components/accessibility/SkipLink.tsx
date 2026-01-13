import { cn } from "@/lib/utils";

interface SkipLinkProps {
  href?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Skip Link component for keyboard navigation accessibility
 * Allows users to skip directly to main content, bypassing navigation
 * WCAG 2.1 Success Criterion 2.4.1 - Bypass Blocks
 */
export const SkipLink = ({ 
  href = "#main-content", 
  children = "Skip to main content",
  className 
}: SkipLinkProps) => {
  return (
    <a
      href={href}
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100]",
        "focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground",
        "focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "font-medium text-sm transition-all",
        className
      )}
    >
      {children}
    </a>
  );
};
