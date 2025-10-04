import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ImageLightboxProps {
  images: { image_url: string; caption?: string | null }[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

export default function ImageLightbox({
  images,
  currentIndex,
  isOpen,
  onClose,
  onPrevious,
  onNext,
}: ImageLightboxProps) {
  const isMobile = useIsMobile();
  
  if (images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isMobile ? 'max-w-full max-h-full' : 'max-w-[95vw] max-h-[95vh]'} w-auto h-auto p-0 overflow-hidden`}>
        <div className="relative w-full h-full flex items-center justify-center bg-black/95">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className={`absolute ${isMobile ? 'top-2 right-2' : 'top-4 right-4'} z-50 bg-black/50 hover:bg-black/70 text-white`}
            onClick={onClose}
          >
            <X className={isMobile ? "w-5 h-5" : "w-6 h-6"} />
          </Button>

          {/* Previous Button */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className={`absolute ${isMobile ? 'left-2' : 'left-4'} top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white`}
              onClick={onPrevious}
            >
              <ChevronLeft className={isMobile ? "w-6 h-6" : "w-8 h-8"} />
            </Button>
          )}

          {/* Main Image */}
          <div className={`w-full ${isMobile ? 'h-screen pt-12 pb-12 px-2' : 'h-[95vh] p-16'} flex items-center justify-center`}>
            <img
              src={currentImage.image_url}
              alt={currentImage.caption || `Image ${currentIndex + 1}`}
              className={isMobile ? "h-full w-auto object-contain" : "max-w-full max-h-full w-auto h-auto object-contain"}
            />
            
            {/* Caption */}
            {currentImage.caption && (
              <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent ${isMobile ? 'p-4' : 'p-8'} text-center`}>
                <p className={`text-white ${isMobile ? 'text-sm' : 'text-lg'}`}>{currentImage.caption}</p>
              </div>
            )}
          </div>

          {/* Next Button */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className={`absolute ${isMobile ? 'right-2' : 'right-4'} top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white`}
              onClick={onNext}
            >
              <ChevronRight className={isMobile ? "w-6 h-6" : "w-8 h-8"} />
            </Button>
          )}

          {/* Image Counter */}
          {images.length > 1 && (
            <div className={`absolute ${isMobile ? 'top-2' : 'top-4'} left-1/2 -translate-x-1/2 bg-black/50 text-white ${isMobile ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm'} rounded-full`}>
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
