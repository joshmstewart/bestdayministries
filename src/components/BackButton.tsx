import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

interface BackButtonProps {
  /** The destination path. If not provided, uses browser history */
  to?: string;
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
 * Standard: BACK_BUTTON_PLACEMENT_STANDARD.md
 * - Always mb-6 for spacing
 * - variant="outline" size="sm"
 * - ArrowLeft icon with mr-2
 */
export function BackButton({ to, label = "Back", className = "", onClick }: BackButtonProps) {
  const navigate = useNavigate();

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

  // Use navigate(-1) for browser history
  return (
    <Button
      variant="outline"
      size="sm"
      className={`mb-6 ${className}`}
      onClick={() => navigate(-1)}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
