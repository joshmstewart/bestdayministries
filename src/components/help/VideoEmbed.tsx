import { useState } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Play, ExternalLink } from "lucide-react";

interface VideoEmbedProps {
  /** YouTube video URL or ID */
  src: string;
  /** Video title for accessibility */
  title: string;
  /** Whether to show a thumbnail with play button first */
  showThumbnail?: boolean;
  /** Aspect ratio (default 16:9) */
  aspectRatio?: number;
}

function extractYouTubeId(url: string): string | null {
  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^[a-zA-Z0-9_-]{11}$/, // Just the ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1] || match[0];
  }
  
  return null;
}

export function VideoEmbed({
  src,
  title,
  showThumbnail = true,
  aspectRatio = 16 / 9,
}: VideoEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(!showThumbnail);
  const videoId = extractYouTubeId(src);

  if (!videoId) {
    return (
      <div className="rounded-lg bg-muted flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-muted-foreground mb-2">Video unavailable</p>
          <Button variant="outline" size="sm" asChild>
            <a href={src} target="_blank" rel="noopener noreferrer">
              Open in new tab
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    );
  }

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;

  if (!isPlaying) {
    return (
      <AspectRatio ratio={aspectRatio} className="bg-muted rounded-lg overflow-hidden">
        <button
          onClick={() => setIsPlaying(true)}
          className="relative w-full h-full group"
          aria-label={`Play video: ${title}`}
        >
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/90 group-hover:bg-primary transition-colors flex items-center justify-center">
              <Play className="h-8 w-8 md:h-10 md:w-10 text-primary-foreground ml-1" />
            </div>
          </div>
        </button>
      </AspectRatio>
    );
  }

  return (
    <AspectRatio ratio={aspectRatio} className="bg-muted rounded-lg overflow-hidden">
      <iframe
        src={embedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full border-0"
        loading="lazy"
      />
    </AspectRatio>
  );
}
