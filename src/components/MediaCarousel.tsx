import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Play, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import ImageLightbox from "./ImageLightbox";
import { VideoPlayer } from "./VideoPlayer";
import { YouTubeEmbed } from "./YouTubeEmbed";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

export interface MediaItem {
  image_url: string | null;
  video_url: string | null;
  video_type: 'image' | 'upload' | 'youtube';
  youtube_url: string | null;
  caption?: string | null;
}

interface MediaCarouselProps {
  items: MediaItem[];
  autoPlay?: boolean;
  interval?: number;
  className?: string;
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

export default function MediaCarousel({ 
  items, 
  autoPlay = false, 
  interval = 3000,
  className = ""
}: MediaCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const currentItem = items[currentIndex];
  const isVideo = currentItem?.video_type === 'upload' || currentItem?.video_type === 'youtube';
  const isYouTube = currentItem?.video_type === 'youtube';

  // Pause auto-play when viewing videos
  useEffect(() => {
    if (!autoPlay || items.length <= 1 || isPaused || isVideo) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, items.length, interval, isPaused, isVideo]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  // Get images only for the image lightbox
  const imageItems = items.filter(item => item.video_type === 'image' && item.image_url);
  
  const openLightbox = (index: number) => {
    // Find the corresponding image index in imageItems
    const item = items[index];
    if (item.video_type === 'image' && item.image_url) {
      const imageIndex = imageItems.findIndex(img => img.image_url === item.image_url);
      if (imageIndex >= 0) {
        setLightboxIndex(imageIndex);
        setLightboxOpen(true);
      }
    }
  };

  const goToPreviousLightbox = () => {
    setLightboxIndex((prev) => (prev - 1 + imageItems.length) % imageItems.length);
  };

  const goToNextLightbox = () => {
    setLightboxIndex((prev) => (prev + 1) % imageItems.length);
  };

  const handleItemClick = () => {
    if (isVideo) {
      setVideoDialogOpen(true);
      setIsPaused(true);
    } else {
      openLightbox(currentIndex);
    }
  };

  const getThumbnail = (): string | null => {
    if (currentItem?.image_url) return currentItem.image_url;
    if (isYouTube && currentItem?.youtube_url) return getYouTubeThumbnail(currentItem.youtube_url);
    return null;
  };

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`}>
        <p className="text-muted-foreground">No media</p>
      </div>
    );
  }

  const thumbnail = getThumbnail();

  return (
    <div className={`relative group ${className}`}>
      {/* Main Content */}
      <div 
        className="overflow-hidden rounded-lg bg-muted cursor-pointer"
        style={{
          aspectRatio: '16 / 9'
        }}
        onClick={handleItemClick}
      >
        {thumbnail ? (
          <div className="relative w-full h-full">
            <img
              src={thumbnail}
              alt={currentItem?.caption || `Media ${currentIndex + 1}`}
              className="w-full h-full object-cover transition-opacity duration-300 hover:opacity-90"
            />
            {/* Video play overlay */}
            {isVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center">
                  {isYouTube ? (
                    <Youtube className="w-8 h-8 text-red-500" />
                  ) : (
                    <Play className="w-8 h-8 text-white fill-white" />
                  )}
                </div>
              </div>
            )}
          </div>
        ) : isVideo ? (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Play className="w-8 h-8 text-primary" />
            </div>
          </div>
        ) : null}
      </div>

      {/* Navigation Buttons */}
      {items.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); goToNext(); }}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </>
      )}

      {/* Caption */}
      {currentItem?.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <p className="text-white text-sm">{currentItem.caption}</p>
        </div>
      )}

      {/* Dots Indicator */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex 
                  ? "bg-white w-8" 
                  : "bg-white/50 hover:bg-white/70"
              }`}
              aria-label={`Go to ${item.video_type === 'image' ? 'image' : 'video'} ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        images={imageItems.map(item => ({ 
          image_url: item.image_url!, 
          caption: item.caption 
        }))}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onPrevious={goToPreviousLightbox}
        onNext={goToNextLightbox}
      />

      {/* Video Dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={(open) => {
        setVideoDialogOpen(open);
        if (!open) setIsPaused(false);
      }}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {isYouTube && currentItem?.youtube_url ? (
            <YouTubeEmbed 
              url={currentItem.youtube_url} 
              title={currentItem.caption || "Video"}
              autoplay={true}
            />
          ) : currentItem?.video_url ? (
            <VideoPlayer 
              src={currentItem.video_url} 
              title={currentItem.caption || undefined}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
