import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Crop, Save } from "lucide-react";

type AvatarCategory = "humans" | "animals" | "monsters" | "shapes";

export const AvatarUploader = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<AvatarCategory>("monsters");
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [uploading, setUploading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Redraw canvas whenever crop area changes
  useEffect(() => {
    if (previewUrl && imageRef.current?.complete) {
      drawCropOverlay();
    }
  }, [cropArea, previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setIsCropping(true);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDragStart({
        x: e.clientX - rect.left - cropArea.x,
        y: e.clientY - rect.top - cropArea.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragStart.x;
    const newY = e.clientY - rect.top - dragStart.y;
    
    // Constrain to image bounds
    const maxX = canvasRef.current.width - cropArea.width;
    const maxY = canvasRef.current.height - cropArea.height;
    
    setCropArea({
      ...cropArea,
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const drawCropOverlay = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match image
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Draw the full image
    ctx.drawImage(img, 0, 0);

    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear the crop area
    ctx.clearRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
    ctx.drawImage(img, cropArea.x, cropArea.y, cropArea.width, cropArea.height, 
                  cropArea.x, cropArea.y, cropArea.width, cropArea.height);

    // Draw crop border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
  };

  const getCroppedImage = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = imageRef.current;
      if (!img) {
        reject(new Error('No image loaded'));
        return;
      }

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropArea.width;
      cropCanvas.height = cropArea.height;
      const ctx = cropCanvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(
        img,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, cropArea.width, cropArea.height
      );

      cropCanvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/png');
    });
  };

  const handleSave = async () => {
    if (!selectedFile) {
      toast.error("Please select an image first");
      return;
    }

    setUploading(true);
    try {
      // Get the next avatar number
      const { data: maxAvatar } = await supabase
        .from('avatars')
        .select('avatar_number')
        .order('avatar_number', { ascending: false })
        .limit(1)
        .single();

      const nextAvatarNumber = (maxAvatar?.avatar_number || 0) + 1;

      // Get cropped image
      const croppedBlob = await getCroppedImage();
      
      // Upload to storage
      const fileName = `avatar-${nextAvatarNumber}.png`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Create avatar entry
      const { error: insertError } = await supabase
        .from('avatars')
        .insert({
          avatar_number: nextAvatarNumber,
          category: category,
          is_active: true
        });

      if (insertError) throw insertError;

      toast.success(`Avatar ${nextAvatarNumber} uploaded successfully!`);
      
      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsCropping(false);
      
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Upload New Avatar</h2>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="avatar-upload">Select Image</Label>
          <Input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="cursor-pointer"
          />
        </div>

        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={(value) => setCategory(value as AvatarCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="humans">Humans</SelectItem>
              <SelectItem value="animals">Animals</SelectItem>
              <SelectItem value="monsters">Monsters & Aliens</SelectItem>
              <SelectItem value="shapes">Shapes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {previewUrl && (
          <div className="space-y-4">
            <div className="relative">
              <img
                ref={imageRef}
                src={previewUrl}
                alt="Preview"
                className="hidden"
                onLoad={drawCropOverlay}
              />
              <canvas
                ref={canvasRef}
                className="max-w-full border-2 border-border rounded cursor-move"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
              <p className="text-sm text-muted-foreground mt-2">
                Drag the blue box to select the area to crop
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={uploading}>
                <Save className="w-4 h-4 mr-2" />
                {uploading ? "Saving..." : "Save Avatar"}
              </Button>
              <Button variant="outline" onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
                setIsCropping(false);
              }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};