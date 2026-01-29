import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

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
  if (images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[100vw] md:!max-w-[90vw] !max-h-[100vh] md:!max-h-[90vh] w-screen md:w-auto h-screen md:h-auto p-0 overflow-hidden border-0" hideCloseButton>
        <div className="relative flex items-center justify-center bg-black w-full h-full">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 md:top-4 md:right-4 z-50 bg-black/50 hover:bg-black/70 text-white"
            onClick={onClose}
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </Button>

          {/* Previous Button */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white"
              onClick={(e) => {
                e.stopPropagation();
                onPrevious();
              }}
            >
              <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
            </Button>
          )}

          {/* Main Image */}
          <img
            src={currentImage.image_url}
            alt={currentImage.caption || `Image ${currentIndex + 1}`}
            className="w-[95vw] h-[95vh] md:w-auto md:h-auto md:max-w-[90vw] md:max-h-[90vh] object-contain"
          />
          
          {/* Caption */}
          {currentImage.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 md:p-8 text-center">
              <p className="text-white text-sm md:text-lg">{currentImage.caption}</p>
            </div>
          )}

          {/* Next Button */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
            >
              <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
            </Button>
          )}

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute top-2 md:top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
