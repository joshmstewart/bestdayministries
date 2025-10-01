import { MapPin, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationLinkProps {
  location: string;
  className?: string;
  showIcon?: boolean;
}

export function LocationLink({ location, className, showIcon = true }: LocationLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 text-left hover:text-primary transition-colors group",
        className
      )}
      title="Open in Google Maps"
    >
      {showIcon && <MapPin className="w-4 h-4 flex-shrink-0" />}
      <span className="flex-1">{location}</span>
      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </button>
  );
}
