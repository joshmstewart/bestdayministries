import { cn } from "@/lib/utils";

interface VisuallyHiddenProps {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}

/**
 * Visually Hidden component for screen reader-only content
 * WCAG 2.1 - Provides context for assistive technologies
 * Use for: icon-only buttons, decorative images that need context, form instructions
 */
export const VisuallyHidden = ({ 
  children, 
  as: Component = "span",
  className 
}: VisuallyHiddenProps) => {
  return (
    <Component
      className={cn(
        "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
        "[clip:rect(0,0,0,0)]",
        className
      )}
    >
      {children}
    </Component>
  );
};
