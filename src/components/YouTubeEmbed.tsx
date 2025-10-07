import { AspectRatio } from "@/components/ui/aspect-ratio";

interface YouTubeEmbedProps {
  url: string; // YouTube URL or video ID
  title?: string;
  aspectRatio?: number; // default 16/9
  autoplay?: boolean;
  className?: string;
}

export function YouTubeEmbed({ 
  url, 
  title = "YouTube video", 
  aspectRatio = 16/9,
  autoplay = false,
  className = ""
}: YouTubeEmbedProps) {
  // Extract video ID from URL or use as-is if already an ID
  const getVideoId = (input: string): string => {
    // If it's already just an ID (11 characters), return it
    if (input.length === 11 && !input.includes('/') && !input.includes('?')) {
      return input;
    }
    
    // Extract from various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
      /youtube\.com\/shorts\/([^&\?\/]+)/
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) return match[1];
    }
    
    return input; // Return as-is if no pattern matches
  };

  const videoId = getVideoId(url);
  const embedUrl = `https://www.youtube.com/embed/${videoId}${autoplay ? '?autoplay=1' : ''}`;

  return (
    <div className={className}>
      <AspectRatio ratio={aspectRatio}>
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full rounded-lg border-0"
        />
      </AspectRatio>
    </div>
  );
}
