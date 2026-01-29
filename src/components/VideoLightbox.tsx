import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface VideoLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  videoType: 'video' | 'youtube';
  caption?: string | null;
}

export default function VideoLightbox({
  isOpen,
  onClose,
  videoUrl,
  videoType,
  caption,
}: VideoLightboxProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[95vw] md:!max-w-[80vw] lg:!max-w-[900px] !max-h-[90vh] p-0 overflow-hidden border-0 bg-black" hideCloseButton>
        <VisuallyHidden>
          <DialogTitle>Video Player</DialogTitle>
        </VisuallyHidden>
        <div className="relative flex flex-col items-center justify-center w-full">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-50 bg-black/50 hover:bg-black/70 text-white"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Video Content */}
          <div className="w-full aspect-video">
            {videoType === 'video' ? (
              <video 
                src={videoUrl} 
                controls 
                autoPlay
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <YouTubeEmbed 
                url={videoUrl} 
                autoplay={true}
              />
            )}
          </div>
          
          {/* Caption */}
          {caption && (
            <div className="w-full bg-black/90 p-4 text-center">
              <p className="text-white text-sm md:text-base">{caption}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
