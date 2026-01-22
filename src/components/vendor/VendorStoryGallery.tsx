import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Play, Youtube } from "lucide-react";
import ImageLightbox from "@/components/ImageLightbox";
import VideoLightbox from "@/components/VideoLightbox";
import { VendorThemePreset } from "@/lib/vendorThemePresets";

interface StoryMedia {
  id: string;
  media_type: 'image' | 'video' | 'youtube';
  media_url: string;
  youtube_url: string | null;
  caption: string | null;
}

interface VendorStoryGalleryProps {
  media: StoryMedia[];
  vendorName: string;
  theme?: VendorThemePreset;
}

export const VendorStoryGallery = ({ media, vendorName, theme }: VendorStoryGalleryProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [videoLightbox, setVideoLightbox] = useState<{
    open: boolean;
    url: string;
    type: 'video' | 'youtube';
    caption: string | null;
  }>({ open: false, url: '', type: 'video', caption: null });

  if (!media || media.length === 0) return null;

  const images = media.filter(m => m.media_type === 'image');

  const openLightbox = (index: number) => {
    const imageIndex = images.findIndex(img => img.id === media[index].id);
    if (imageIndex !== -1) {
      setLightboxIndex(imageIndex);
      setLightboxOpen(true);
    }
  };

  const openVideoLightbox = (item: StoryMedia) => {
    setVideoLightbox({
      open: true,
      url: item.media_url,
      type: item.media_type as 'video' | 'youtube',
      caption: item.caption
    });
  };

  const extractYoutubeId = (url: string): string | null => {
    const match = url.match(/(?:embed\/|v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  // Card styles based on theme
  const cardStyle = theme ? {
    borderColor: theme.cardBorder,
    backgroundColor: theme.cardBg,
    boxShadow: theme.cardGlow,
  } : {};

  return (
    <div className="pb-8">
      <h2 className="font-heading text-2xl font-bold mb-4">Our Story</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {media.map((item, index) => (
          <Card 
            key={item.id} 
            className="overflow-hidden group border-2 transition-all duration-300 hover:scale-[1.02]"
            style={cardStyle}
          >
            <CardContent className="p-0">
              {item.media_type === 'image' && (
                <div 
                  className="cursor-pointer relative"
                  onClick={() => openLightbox(index)}
                >
                  <AspectRatio ratio={4/3}>
                    <img 
                      src={item.media_url} 
                      alt={item.caption || `${vendorName} story`}
                      className="object-cover w-full h-full transition-transform group-hover:scale-105"
                    />
                  </AspectRatio>
                  {item.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="text-white text-sm">{item.caption}</p>
                    </div>
                  )}
                </div>
              )}

              {item.media_type === 'video' && (
                <div 
                  className="relative cursor-pointer"
                  onClick={() => openVideoLightbox(item)}
                >
                  <AspectRatio ratio={4/3}>
                    <video 
                      src={item.media_url} 
                      className="w-full h-full object-cover"
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                      <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: theme?.accent || 'hsl(var(--primary))' }}
                      >
                        <Play className="h-8 w-8 text-white ml-1" fill="currentColor" />
                      </div>
                    </div>
                  </AspectRatio>
                  {item.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="text-white text-sm">{item.caption}</p>
                    </div>
                  )}
                </div>
              )}

              {item.media_type === 'youtube' && (
                <div 
                  className="relative cursor-pointer"
                  onClick={() => openVideoLightbox(item)}
                >
                  <AspectRatio ratio={4/3}>
                    <img 
                      src={`https://img.youtube.com/vi/${extractYoutubeId(item.media_url)}/maxresdefault.jpg`}
                      alt={item.caption || "Video thumbnail"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://img.youtube.com/vi/${extractYoutubeId(item.media_url)}/hqdefault.jpg`;
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                      <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center">
                        <Youtube className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </AspectRatio>
                  {item.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="text-white text-sm">{item.caption}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {images.length > 0 && (
        <ImageLightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          images={images.map(img => ({ 
            image_url: img.media_url, 
            caption: img.caption || undefined 
          }))}
          currentIndex={lightboxIndex}
          onPrevious={() => setLightboxIndex(prev => prev > 0 ? prev - 1 : images.length - 1)}
          onNext={() => setLightboxIndex(prev => prev < images.length - 1 ? prev + 1 : 0)}
        />
      )}

      <VideoLightbox
        isOpen={videoLightbox.open}
        onClose={() => setVideoLightbox(prev => ({ ...prev, open: false }))}
        videoUrl={videoLightbox.url}
        videoType={videoLightbox.type}
        caption={videoLightbox.caption}
      />
    </div>
  );
};
