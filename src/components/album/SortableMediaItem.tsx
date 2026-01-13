import { Button } from "@/components/ui/button";
import { GripVertical, Images, MessageSquare, Edit, X, Play, Video, Youtube } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface AlbumMedia {
  id: string;
  image_url: string | null;
  video_url: string | null;
  video_type: 'image' | 'upload' | 'youtube';
  youtube_url: string | null;
  video_id: string | null;
  caption: string | null;
  display_order: number;
  original_image_url?: string | null;
}

interface SortableMediaItemProps {
  media: AlbumMedia;
  isCover: boolean;
  onSetCover: (url: string) => void;
  onEditCaption: (media: AlbumMedia) => void;
  onCrop: (media: AlbumMedia) => void;
  onDelete: (id: string) => void;
}

// Helper to get YouTube thumbnail
function getYouTubeThumbnail(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
    /youtube\.com\/shorts\/([^&\?\/]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    }
  }
  return '';
}

// Helper to get video thumbnail (first frame or placeholder)
function getVideoThumbnail(videoUrl: string): string {
  // For uploaded videos, we'll use a placeholder since we can't easily get thumbnails
  return '';
}

export function SortableMediaItem({ 
  media, 
  isCover, 
  onSetCover, 
  onEditCaption, 
  onCrop, 
  onDelete 
}: SortableMediaItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: media.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isVideo = media.video_type === 'upload' || media.video_type === 'youtube';
  const isYouTube = media.video_type === 'youtube';
  
  // Get display thumbnail
  const getThumbnail = (): string | null => {
    if (media.image_url) return media.image_url;
    if (isYouTube && media.youtube_url) return getYouTubeThumbnail(media.youtube_url);
    return null;
  };
  
  const thumbnail = getThumbnail();

  return (
    <div ref={setNodeRef} style={style} className="relative space-y-2">
      <div className="relative">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={media.caption || "Album media"} 
            className="w-full h-32 object-cover rounded-lg" 
          />
        ) : isVideo ? (
          <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
            <Video className="w-8 h-8 text-muted-foreground" />
          </div>
        ) : (
          <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
            <Images className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        
        {/* Video indicator overlay */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
              {isYouTube ? (
                <Youtube className="w-6 h-6 text-red-500" />
              ) : (
                <Play className="w-6 h-6 text-white fill-white" />
              )}
            </div>
          </div>
        )}
        
        {isCover && !isVideo && (
          <div className="absolute top-2 left-10 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-semibold">
            Cover
          </div>
        )}
        
        {/* Type badge */}
        {isVideo && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-0.5 rounded text-xs font-medium">
            {isYouTube ? 'YouTube' : 'Video'}
          </div>
        )}
        
        <div className="absolute top-2 left-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-move bg-black/50 hover:bg-black/70"
            {...attributes}
            {...listeners}
            title="Drag to reorder"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-4 h-4 text-white" />
          </Button>
        </div>
        
        <div className="absolute top-2 right-2 flex gap-1">
          {/* Only show set cover for images */}
          {!isVideo && media.image_url && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-7 w-7"
              onClick={() => onSetCover(media.image_url!)}
              title="Set as cover"
              aria-label="Set as cover image"
            >
              <Images className="w-3 h-3" />
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEditCaption(media)}
            title="Edit caption"
            aria-label="Edit caption"
          >
            <MessageSquare className="w-3 h-3" />
          </Button>
          {/* Only show crop for images */}
          {!isVideo && media.image_url && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-7 w-7"
              onClick={() => onCrop(media)}
              title="Recrop image"
              aria-label="Recrop image"
            >
              <Edit className="w-3 h-3" />
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="h-7 w-7"
            onClick={() => onDelete(media.id)}
            aria-label="Delete media"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
      {media.caption && (
        <p className="text-xs text-muted-foreground truncate">
          {media.caption}
        </p>
      )}
    </div>
  );
}
