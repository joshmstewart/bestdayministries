import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { toast } from "sonner";

interface VideoScreenshotCaptureProps {
  videoUrl?: string;
  youtubeUrl?: string;
  onCaptureComplete: (imageBlob: Blob, timestamp: number) => void;
  onCancel: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VideoScreenshotCapture = ({
  videoUrl,
  youtubeUrl,
  onCaptureComplete,
  onCancel,
  open,
  onOpenChange,
}: VideoScreenshotCaptureProps) => {
  const [screenshots, setScreenshots] = useState<Array<{ url: string; timestamp: number }>>([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState<number | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [aspectRatioKey, setAspectRatioKey] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3'>('16:9');
  const [detectedAspectRatio, setDetectedAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3'>('16:9');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (open && videoRef.current) {
      // Auto-generate screenshots at key moments when video loads
      const video = videoRef.current;
      const handleLoadedMetadata = () => {
        const duration = video.duration;
        
        // Detect video aspect ratio
        const width = video.videoWidth;
        const height = video.videoHeight;
        const ratio = width / height;
        
        // Map to closest standard aspect ratio
        let detectedRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3' = '16:9';
        
        if (Math.abs(ratio - 1) < 0.1) detectedRatio = '1:1';
        else if (Math.abs(ratio - 16/9) < 0.1) detectedRatio = '16:9';
        else if (Math.abs(ratio - 9/16) < 0.1) detectedRatio = '9:16';
        else if (Math.abs(ratio - 4/3) < 0.1) detectedRatio = '4:3';
        else if (Math.abs(ratio - 3/4) < 0.1) detectedRatio = '3:4';
        else if (Math.abs(ratio - 3/2) < 0.1) detectedRatio = '3:2';
        else if (Math.abs(ratio - 2/3) < 0.1) detectedRatio = '2:3';
        
        setDetectedAspectRatio(detectedRatio);
        setAspectRatioKey(detectedRatio);
        
        if (duration && duration > 0) {
          // Generate screenshots at 25%, 50%, 75% of the video
          const times = [duration * 0.25, duration * 0.5, duration * 0.75];
          captureAtTimes(times);
        }
      };
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }
  }, [open]);

  const captureAtTimes = async (times: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newScreenshots: Array<{ url: string; timestamp: number }> = [];

    for (const time of times) {
      video.currentTime = time;
      await new Promise(resolve => {
        video.addEventListener('seeked', () => resolve(true), { once: true });
      });
      
      const screenshot = captureFrame(time);
      if (screenshot) {
        newScreenshots.push(screenshot);
      }
    }

    setScreenshots(prev => [...prev, ...newScreenshots]);
  };

  const captureFrame = (timestamp: number): { url: string; timestamp: number } | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob URL
    const url = canvas.toDataURL('image/jpeg', 0.9);
    
    return { url, timestamp };
  };

  const handleCaptureNow = () => {
    const video = videoRef.current;
    if (!video) return;

    const screenshot = captureFrame(video.currentTime);
    if (screenshot) {
      setScreenshots(prev => [...prev, screenshot]);
      toast.success("Screenshot captured!");
    }
  };

  const handleSelectScreenshot = (index: number) => {
    setSelectedScreenshot(index);
    setCropDialogOpen(true);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (selectedScreenshot !== null) {
      const timestamp = screenshots[selectedScreenshot].timestamp;
      onCaptureComplete(croppedBlob, timestamp);
      onOpenChange(false);
      toast.success("Cover image set!");
    }
  };

  const handleRemoveScreenshot = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setScreenshots(prev => prev.filter((_, i) => i !== index));
  };

  const getEmbedUrl = (url: string): string => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Capture Video Screenshot</DialogTitle>
            <DialogDescription>
              Play the video and capture screenshots, or use the auto-generated options. Then crop your selection to use as the cover image.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Video Player */}
            <div className="relative bg-black rounded-lg overflow-hidden">
              {youtubeUrl ? (
                <iframe
                  src={getEmbedUrl(youtubeUrl)}
                  className="w-full aspect-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="w-full aspect-video"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center text-muted-foreground">
                  No video loaded
                </div>
              )}
            </div>

            {/* Hidden canvas for screenshot capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Capture Button - only for uploaded videos */}
            {videoUrl && (
              <div className="flex justify-center">
                <Button onClick={handleCaptureNow} size="lg">
                  <Camera className="w-5 h-5 mr-2" />
                  Capture Current Frame
                </Button>
              </div>
            )}

            {/* Note for YouTube videos */}
            {youtubeUrl && (
              <div className="text-sm text-muted-foreground text-center p-4 bg-muted/50 rounded-lg">
                For YouTube videos, you'll need to manually upload a screenshot or use a different image as the cover.
                You can take a screenshot using your device's screenshot tool while the video is playing.
              </div>
            )}

            {/* Screenshots Grid */}
            {screenshots.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Select a screenshot to use as cover:</h3>
                <div className="grid grid-cols-3 gap-4">
                  {screenshots.map((screenshot, index) => (
                    <div
                      key={index}
                      className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all"
                      onClick={() => handleSelectScreenshot(index)}
                    >
                      <img
                        src={screenshot.url}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full aspect-video object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Check className="w-8 h-8 text-white" />
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleRemoveScreenshot(index, e)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {Math.floor(screenshot.timestamp)}s
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Crop Dialog */}
      {selectedScreenshot !== null && (
        <ImageCropDialog
          open={cropDialogOpen}
          onOpenChange={setCropDialogOpen}
          imageUrl={screenshots[selectedScreenshot].url}
          onCropComplete={handleCropComplete}
          allowAspectRatioChange={true}
          selectedRatioKey={aspectRatioKey}
          onAspectRatioKeyChange={setAspectRatioKey}
          title="Crop Cover Image"
          description={`Adjust the crop area. Detected video aspect ratio: ${detectedAspectRatio}. You can change it if needed.`}
        />
      )}
    </>
  );
};
