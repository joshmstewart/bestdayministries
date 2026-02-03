import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Image as ImageIcon, Crop, Loader2 } from "lucide-react";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { isHeicFile, convertHeicToJpeg } from "@/lib/imageUtils";
import { toast } from "sonner";

type AspectRatioKey = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3';

interface ImageUploadWithCropProps {
  label?: string;
  imagePreview: string | null;
  onImageChange: (file: File | null, preview: string | null) => void;
  aspectRatio?: AspectRatioKey;
  onAspectRatioChange?: (ratio: AspectRatioKey) => void;
  allowAspectRatioChange?: boolean;
  maxSizeMB?: number;
  className?: string;
}

export function ImageUploadWithCrop({
  label = "Image",
  imagePreview,
  onImageChange,
  aspectRatio = '16:9',
  onAspectRatioChange,
  allowAspectRatioChange = true,
  maxSizeMB = 20,
  className = "",
}: ImageUploadWithCropProps) {
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatioKey>(aspectRatio);
  const [isConverting, setIsConverting] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let processedFile = file;

    // Handle HEIC conversion
    if (isHeicFile(file)) {
      setIsConverting(true);
      try {
        processedFile = await convertHeicToJpeg(file);
        toast.success("HEIC image converted successfully");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to convert HEIC image");
        setIsConverting(false);
        return;
      }
      setIsConverting(false);
    }

    if (!processedFile.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    if (processedFile.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File is too large. Maximum size is ${maxSizeMB}MB`);
      return;
    }

    setOriginalFile(processedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(processedFile);
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const croppedFile = new File(
      [croppedBlob],
      originalFile?.name || 'cropped-image.jpg',
      { type: 'image/jpeg' }
    );

    const reader = new FileReader();
    reader.onloadend = () => {
      onImageChange(croppedFile, reader.result as string);
    };
    reader.readAsDataURL(croppedBlob);
  };

  const handleRatioChange = (ratio: AspectRatioKey) => {
    setSelectedRatio(ratio);
    onAspectRatioChange?.(ratio);
  };

  const removeImage = () => {
    onImageChange(null, null);
    setOriginalFile(null);
    setImageToCrop(null);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Label>{label}</Label>
      
      {imagePreview ? (
        <Card className="relative overflow-hidden">
          <CardContent className="p-0">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-auto object-contain"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => {
                  if (imageToCrop) {
                    setCropDialogOpen(true);
                  }
                }}
                disabled={!imageToCrop}
              >
                <Crop className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={removeImage}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${isConverting ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isConverting ? (
              <>
                <Loader2 className="w-8 h-8 mb-2 text-muted-foreground animate-spin" />
                <p className="text-sm text-muted-foreground">Converting HEIC...</p>
              </>
            ) : (
              <>
                <ImageIcon className="w-8 h-8 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload an image
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max {maxSizeMB}MB • HEIC supported
                </p>
              </>
            )}
          </div>
          <Input
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isConverting}
          />
        </label>
      )}

      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageUrl={imageToCrop || ""}
        onCropComplete={handleCropComplete}
        allowAspectRatioChange={allowAspectRatioChange}
        selectedRatioKey={selectedRatio}
        onAspectRatioKeyChange={handleRatioChange}
        title={`Crop ${label}`}
        description="Adjust the crop area to your liking"
      />
    </div>
  );
}
