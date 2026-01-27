import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";

interface BackButtonProps {
  /** The destination path. If not provided, uses browser history with fallback */
  to?: string;
  /** Fallback destination if no browser history exists. Defaults to /community */
  fallback?: string;
  /** The label text. Defaults to "Back" */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Custom click handler (takes precedence over `to` and history back) */
  onClick?: () => void;
}

/**
 * A consistent back button for PWA navigation.
 * Use `onClick` for custom behavior, `to` for explicit destination, or omit both for browser history back.
 * 
 * IMPORTANT: When using browser history (no `to` or `onClick`), if there's no history to go back to,
 * the button will navigate to the `fallback` destination (defaults to /community).
 * 
 * Standard: BACK_BUTTON_PLACEMENT_STANDARD.md
 * - Always mb-6 for spacing
 * - variant="outline" size="sm"
 * - ArrowLeft icon with mr-2
 */
export function BackButton({ to, fallback = "/community", label = "Back", className = "", onClick }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Use custom onClick handler if provided
  if (onClick) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={`mb-6 ${className}`}
        onClick={onClick}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {label}
      </Button>
    );
  }

  // Use Link for explicit destinations
  if (to) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={`mb-6 ${className}`}
        asChild
      >
        <Link to={to}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {label}
        </Link>
      </Button>
    );
  }

  // Use navigate(-1) for browser history with fallback
  const handleBackClick = () => {
    // Check if we have history to go back to
    // window.history.length > 1 isn't reliable (includes forward entries)
    // Instead, check if we came from within the app using the referrer or state
    const hasHistory = window.history.state?.idx > 0;
    
    if (hasHistory) {
      navigate(-1);
    } else {
      // No history - navigate to fallback destination
      navigate(fallback, { replace: true });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={`mb-6 ${className}`}
      onClick={handleBackClick}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
