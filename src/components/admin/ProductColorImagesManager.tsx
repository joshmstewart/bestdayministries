import { useState, useRef, useMemo } from 'react';
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
import { ImagePlus, Trash2, Upload, X, Link2, Unlink, Wand2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProductColorImagesManagerProps {
  productId: string;
  productName: string;
  availableColors: string[];
}

interface ColorImageRecord {
  id: string;
  product_id: string;
  color_name: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

// Helper: extract color keywords for fuzzy matching
const getColorKeywords = (colorName: string): string[] => {
  const lower = colorName.toLowerCase();
  const words = lower.split(/[\s\-_]+/).filter(w => w.length > 2);
  const colorMap: Record<string, string[]> = {
    'grey': ['gray', 'grey'],
    'gray': ['gray', 'grey'],
    'light pink': ['pink', 'lightpink', 'light-pink'],
    'light blue': ['blue', 'lightblue', 'light-blue'],
    'sport grey': ['grey', 'gray', 'sportgrey', 'sport-grey'],
    'sport gray': ['grey', 'gray', 'sportgray', 'sport-gray'],
    'ash': ['ash', 'grey', 'gray'],
    'sand': ['sand', 'beige', 'tan'],
    'natural': ['natural', 'cream', 'beige'],
    'heather': ['heather'],
    'white': ['white'],
    'black': ['black'],
  };
  
  const keywords = [
    lower,
    lower.replace(/\s+/g, ''),
    lower.replace(/\s+/g, '-'),
    lower.replace(/\s+/g, '_'),
    ...words
  ];
  
  Object.entries(colorMap).forEach(([key, values]) => {
    if (lower.includes(key)) {
      keywords.push(...values);
    }
  });
  
  return [...new Set(keywords)];
};

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

  // Fetch product data to get API images and variant mappings
  const { data: product } = useQuery({
    queryKey: ['product-for-images', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('images, printify_variant_ids, default_image_index, default_image_url')
        .eq('id', productId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Set default image mutation - now uses URL instead of index
  const setDefaultMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const { error } = await supabase
        .from('products')
        .update({ default_image_url: imageUrl })
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-for-images', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Default image updated');
    },
    onError: (error: any) => {
      toast.error('Failed to set default: ' + error.message);
    },
  });

  // Fetch existing color images (user-added or auto-connected)
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
      return data as ColorImageRecord[];
    },
    enabled: open,
  });

  // Build variant ID to color mapping
  const variantIdToColor = useMemo(() => {
    const map = new Map<number, string>();
    if (!product?.printify_variant_ids) return map;
    
    const variantIds = product.printify_variant_ids as Record<string, number>;
    Object.entries(variantIds).forEach(([title, variantId]) => {
      // Parse "Size / Color" or "Color / Size" format
      const parts = title.split(' / ');
      if (parts.length === 2) {
        // Detect which part is the color by checking for size patterns
        const sizePatterns = /^(xs|s|m|l|xl|xxl|2xl|3xl|4xl|5xl|6xl|one size|\d+)$/i;
        const color = sizePatterns.test(parts[0].trim()) ? parts[1] : parts[0];
        map.set(variantId, color.trim());
      } else if (parts.length === 1) {
        // Single option - might be color or just a variant name
        map.set(variantId, parts[0].trim());
      }
    });
    return map;
  }, [product?.printify_variant_ids]);

  // Auto-detect color for an image URL
  const detectColorForImage = (imageUrl: string): string | null => {
    // Strategy 1: Check if URL contains a variant ID
    for (const [variantId, color] of variantIdToColor.entries()) {
      if (imageUrl.includes(`/${variantId}/`)) {
        return color;
      }
    }
    
    // Strategy 2: Fuzzy match URL against color names
    const urlLower = imageUrl.toLowerCase();
    for (const color of availableColors) {
      const keywords = getColorKeywords(color);
      if (keywords.some(kw => urlLower.includes(kw))) {
        return color;
      }
    }
    
    return null;
  };

  // Get all API images with their detected/assigned colors
  const apiImages = useMemo(() => {
    const images = (product?.images as string[]) || [];
    return images.map((url, idx) => {
      // Check if this image is already in colorImages
      const existing = colorImages?.find(ci => ci.image_url === url);
      const detectedColor = existing?.color_name || detectColorForImage(url);
      return {
        url,
        index: idx,
        assignedColor: existing?.color_name || null,
        detectedColor,
        recordId: existing?.id || null,
      };
    });
  }, [product?.images, colorImages, variantIdToColor, availableColors]);

  // Get user-uploaded images (not from API)
  const userUploadedImages = useMemo(() => {
    if (!colorImages) return [];
    const apiUrls = new Set((product?.images as string[]) || []);
    return colorImages.filter(ci => !apiUrls.has(ci.image_url));
  }, [colorImages, product?.images]);

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
      toast.success('Image unlinked');
    },
    onError: (error: any) => {
      toast.error('Failed to unlink image: ' + error.message);
    },
  });

  // Assign color mutation
  const assignColorMutation = useMutation({
    mutationFn: async ({ imageUrl, colorName, existingRecordId }: { imageUrl: string; colorName: string; existingRecordId?: string | null }) => {
      if (existingRecordId) {
        // Update existing
        const { error } = await supabase
          .from('product_color_images')
          .update({ color_name: colorName })
          .eq('id', existingRecordId);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('product_color_images')
          .insert({
            product_id: productId,
            color_name: colorName,
            image_url: imageUrl,
            display_order: 0,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-color-images', productId] });
      toast.success('Color assigned');
    },
    onError: (error: any) => {
      toast.error('Failed to assign color: ' + error.message);
    },
  });

  // Auto-connect all images
  const autoConnectAll = async () => {
    let connected = 0;
    for (const img of apiImages) {
      if (!img.assignedColor && img.detectedColor) {
        try {
          await supabase
            .from('product_color_images')
            .insert({
              product_id: productId,
              color_name: img.detectedColor,
              image_url: img.url,
              display_order: img.index,
            });
          connected++;
        } catch (e) {
          // Ignore duplicates
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ['product-color-images', productId] });
    toast.success(`Auto-connected ${connected} images`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedColor) {
      toast.error('Please select a color first');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}/${selectedColor.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(`product-colors/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('app-assets')
        .getPublicUrl(`product-colors/${fileName}`);

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
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast.error('Failed to upload image: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Group user-uploaded images by color
  const uploadedByColor = userUploadedImages.reduce((acc, img) => {
    if (!acc[img.color_name]) {
      acc[img.color_name] = [];
    }
    acc[img.color_name].push(img);
    return acc;
  }, {} as Record<string, ColorImageRecord[]>);

  const unassignedCount = apiImages.filter(i => !i.assignedColor && i.detectedColor).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full">
          <ImagePlus className="h-4 w-4 mr-2" />
          Manage Color Images
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Color Images</DialogTitle>
          <DialogDescription>
            Connect API images to colors and add custom images for "{productName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Auto-connect section */}
          {unassignedCount > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm">
                {unassignedCount} images can be auto-connected to colors
              </span>
              <Button size="sm" onClick={autoConnectAll}>
                <Wand2 className="h-4 w-4 mr-2" />
                Auto-Connect All
              </Button>
            </div>
          )}

          {/* All Images Section (API + Custom) */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              All Images 
              <Badge variant="secondary">{apiImages.length + userUploadedImages.length}</Badge>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {/* API Images */}
              {apiImages.map((img) => (
                <div 
                  key={img.url} 
                  className={cn(
                    "border rounded-lg p-2 space-y-2 relative",
                    img.assignedColor ? "border-primary/50 bg-primary/5" : "border-dashed",
                    product?.default_image_url === img.url && "ring-2 ring-yellow-500"
                  )}
                >
                  <div className="aspect-square rounded overflow-hidden bg-secondary/10 relative">
                    <img 
                      src={img.url} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                    <Badge variant="outline" className="absolute top-1 right-1 text-[10px] px-1 py-0 bg-background/80">
                      API
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "absolute top-1 left-1 h-7 w-7 bg-background/80 hover:bg-background",
                        product?.default_image_url === img.url && "text-yellow-500"
                      )}
                      onClick={() => setDefaultMutation.mutate(img.url)}
                      title="Set as default image"
                    >
                      <Star className={cn("h-4 w-4", product?.default_image_url === img.url && "fill-yellow-500")} />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {img.assignedColor ? (
                      <div className="flex items-center justify-between">
                        <Badge variant="default" className="text-xs truncate max-w-[80%]">
                          <Link2 className="h-3 w-3 mr-1" />
                          {img.assignedColor}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => img.recordId && deleteMutation.mutate(img.recordId)}
                          title="Unlink"
                        >
                          <Unlink className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Select
                        value=""
                        onValueChange={(color) => assignColorMutation.mutate({ 
                          imageUrl: img.url, 
                          colorName: color,
                          existingRecordId: img.recordId 
                        })}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder={img.detectedColor ? `Detected: ${img.detectedColor}` : "Assign color..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColors.map((color) => (
                            <SelectItem key={color} value={color}>
                              {color}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Custom Uploaded Images (in same grid) */}
              {userUploadedImages.map((img) => (
                <div 
                  key={img.id} 
                  className={cn(
                    "border rounded-lg p-2 space-y-2 relative border-secondary bg-secondary/5",
                    product?.default_image_url === img.image_url && "ring-2 ring-yellow-500"
                  )}
                >
                  <div className="aspect-square rounded overflow-hidden bg-secondary/10 relative group">
                    <img 
                      src={img.image_url} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                    <Badge variant="secondary" className="absolute top-1 right-1 text-[10px] px-1 py-0 bg-background/80">
                      Custom
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "absolute top-1 left-1 h-7 w-7 bg-background/80 hover:bg-background",
                        product?.default_image_url === img.image_url && "text-yellow-500"
                      )}
                      onClick={() => setDefaultMutation.mutate(img.image_url)}
                      title="Set as default image"
                    >
                      <Star className={cn("h-4 w-4", product?.default_image_url === img.image_url && "fill-yellow-500")} />
                    </Button>
                    <button
                      onClick={() => deleteMutation.mutate(img.id)}
                      className="absolute bottom-1 left-1 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete image"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <Badge variant="default" className="text-xs truncate max-w-full">
                      <Link2 className="h-3 w-3 mr-1" />
                      {img.color_name}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upload section */}
          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-medium">Upload Custom Image</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
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
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select Image</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  disabled={!selectedColor || isUploading}
                  className="cursor-pointer"
                />
              </div>
              <Button
                onClick={() => {
                  if (fileInputRef.current?.files?.[0]) {
                    handleFileUpload({ target: fileInputRef.current } as React.ChangeEvent<HTMLInputElement>);
                  } else {
                    toast.error('Please select an image file first');
                  }
                }}
                disabled={!selectedColor || isUploading || !fileInputRef.current?.files?.[0]}
              >
                {isUploading ? (
                  <>Uploading...</>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Save
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Select a color, choose an image file, then click "Upload & Save" to add the image.
            </p>
            
            {/* Show all images for selected color immediately after upload */}
            {selectedColor && (
              <div className="mt-4 pt-4 border-t">
                <h5 className="font-medium mb-2 flex items-center gap-2">
                  All "{selectedColor}" Images
                  <Badge variant="secondary">
                    {(colorImages?.filter(img => img.color_name === selectedColor).length || 0) +
                     (apiImages.filter(img => img.assignedColor === selectedColor).length || 0)}
                  </Badge>
                </h5>
                <div className="flex flex-wrap gap-2">
                  {/* API images assigned to this color */}
                  {apiImages
                    .filter(img => img.assignedColor === selectedColor)
                    .map((img) => (
                      <div key={img.url} className="relative group">
                        <img
                          src={img.url}
                          alt={`${selectedColor} API variant`}
                          className="w-20 h-20 object-cover rounded border border-primary/30"
                        />
                        <Badge variant="outline" className="absolute bottom-1 left-1 text-[10px] px-1 py-0 bg-background/80">
                          API
                        </Badge>
                      </div>
                    ))}
                  {/* User-uploaded images for this color */}
                  {colorImages
                    ?.filter(img => img.color_name === selectedColor && !apiImages.some(api => api.url === img.image_url))
                    .map((img) => (
                      <div key={img.id} className="relative group">
                        <img
                          src={img.image_url}
                          alt={`${selectedColor} custom variant`}
                          className="w-20 h-20 object-cover rounded border border-secondary"
                        />
                        <button
                          onClick={() => deleteMutation.mutate(img.id)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  {(colorImages?.filter(img => img.color_name === selectedColor).length === 0 &&
                    apiImages.filter(img => img.assignedColor === selectedColor).length === 0) && (
                    <p className="text-sm text-muted-foreground">No images for this color yet</p>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};
