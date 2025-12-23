import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImagePlus, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

interface ProductColorImagesManagerProps {
  productId: string;
  productName: string;
  availableColors: string[];
}

export const ProductColorImagesManager = ({
  productId,
  productName,
  availableColors,
}: ProductColorImagesManagerProps) => {
  const [open, setOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch existing color images
  const { data: colorImages, isLoading } = useQuery({
    queryKey: ['product-color-images', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_color_images')
        .select('*')
        .eq('product_id', productId)
        .order('color_name')
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase
        .from('product_color_images')
        .delete()
        .eq('id', imageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-color-images', productId] });
      toast.success('Image deleted');
    },
    onError: (error: any) => {
      toast.error('Failed to delete image: ' + error.message);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedColor) {
      toast.error('Please select a color first');
      return;
    }

    setIsUploading(true);
    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}/${selectedColor.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(`product-colors/${fileName}`, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('app-assets')
        .getPublicUrl(`product-colors/${fileName}`);

      // Insert record
      const { error: insertError } = await supabase
        .from('product_color_images')
        .insert({
          product_id: productId,
          color_name: selectedColor,
          image_url: publicUrl,
          display_order: (colorImages?.filter(img => img.color_name === selectedColor).length || 0),
        });

      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['product-color-images', productId] });
      toast.success(`Image added for ${selectedColor}`);
      
      // Reset
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast.error('Failed to upload image: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Group images by color
  const imagesByColor = colorImages?.reduce((acc, img) => {
    if (!acc[img.color_name]) {
      acc[img.color_name] = [];
    }
    acc[img.color_name].push(img);
    return acc;
  }, {} as Record<string, typeof colorImages>) || {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full">
          <ImagePlus className="h-4 w-4 mr-2" />
          Manage Color Images
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Color Images</DialogTitle>
          <DialogDescription>
            Add or remove images for specific colors on "{productName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload section */}
          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-medium">Add New Image</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select Color</Label>
                <Select value={selectedColor} onValueChange={setSelectedColor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a color..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColors.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))
                    }
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Upload Image</Label>
                <div className="flex gap-2">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={!selectedColor || isUploading}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            {isUploading && (
              <p className="text-sm text-muted-foreground">Uploading...</p>
            )}
          </div>

          {/* Existing images */}
          <div className="space-y-4">
            <h4 className="font-medium">Current Images</h4>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : Object.keys(imagesByColor).length === 0 ? (
              <p className="text-sm text-muted-foreground">No custom images added yet.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(imagesByColor).map(([color, images]) => (
                  <div key={color} className="border rounded-lg p-3">
                    <h5 className="font-medium mb-2">{color}</h5>
                    <div className="flex flex-wrap gap-2">
                      {images?.map((img) => (
                        <div key={img.id} className="relative group">
                          <img
                            src={img.image_url}
                            alt={`${color} variant`}
                            className="w-20 h-20 object-cover rounded border"
                          />
                          <button
                            onClick={() => deleteMutation.mutate(img.id)}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
