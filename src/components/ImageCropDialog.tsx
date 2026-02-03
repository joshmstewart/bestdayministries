import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import Cropper from "react-easy-crop";
import { ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

const ASPECT_RATIOS = {
  '1:1': 1,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
  '3:2': 3 / 2,
  '2:3': 2 / 3,
} as const;

type AspectRatioKey = keyof typeof ASPECT_RATIOS;

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
  aspectRatio?: number;
  title?: string;
  description?: string;
  allowAspectRatioChange?: boolean;
  selectedRatioKey?: AspectRatioKey;
  onAspectRatioKeyChange?: (ratioKey: AspectRatioKey) => void;
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ImageCropDialog({
  open,
  onOpenChange,
  imageUrl,
  onCropComplete,
  aspectRatio = 16 / 9,
  title = "Crop Image",
  description = "Adjust the crop area to select what will be visible in the final image",
  allowAspectRatioChange = false,
  selectedRatioKey = '16:9',
  onAspectRatioKeyChange,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleAspectRatioChange = (ratioKey: AspectRatioKey) => {
    if (onAspectRatioKeyChange) {
      onAspectRatioKeyChange(ratioKey);
    }
  };

  const currentAspectRatio = ASPECT_RATIOS[selectedRatioKey];

  const onCropChange = (newCrop: { x: number; y: number }) => {
    setCrop(newCrop);
  };

  const onZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  const onCropCompleteInternal = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const createCroppedImage = async () => {
    if (!croppedAreaPixels) return;

    setProcessing(true);
    try {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = imageUrl;
      
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No 2d context");

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      canvas.toBlob((blob) => {
        if (blob) {
          onCropComplete(blob);
          onOpenChange(false);
        } else {
          console.error("Failed to create blob");
        }
        setProcessing(false);
      }, "image/png");
    } catch (error) {
      console.error("Error cropping image:", error);
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </DialogHeader>

        <div className="flex-1 relative min-h-[400px] max-h-[450px] bg-black rounded-lg overflow-hidden">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={currentAspectRatio}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteInternal}
          />
        </div>

        <div className="space-y-4">
          {allowAspectRatioChange && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Aspect Ratio</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(ASPECT_RATIOS) as AspectRatioKey[]).map((ratioKey) => (
                  <Button
                    key={ratioKey}
                    type="button"
                    variant={selectedRatioKey === ratioKey ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleAspectRatioChange(ratioKey)}
                    className="min-w-[60px]"
                  >
                    {ratioKey}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <ZoomOut className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[zoom]}
              onValueChange={(values) => setZoom(values[0])}
              min={0.5}
              max={3}
              step={0.05}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="text-sm text-muted-foreground">
            <p>• Drag the image to reposition</p>
            <p>• Use the slider to zoom in/out</p>
            <p>• The highlighted area shows what will be visible</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={createCroppedImage} disabled={processing}>
            {processing ? "Processing..." : "Apply Crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}