import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Upload, X } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";

interface ProductFormProps {
  vendorId: string;
  product?: any;
  onSuccess: () => void;
}

export const ProductForm = ({ vendorId, product, onSuccess }: ProductFormProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(product?.price || "");
  const [inventoryCount, setInventoryCount] = useState(product?.inventory_count || 0);
  const [category, setCategory] = useState(product?.category || "");
  const [tags, setTags] = useState(product?.tags?.join(", ") || "");
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(product?.images || []);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages(prev => [...prev, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeNewImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    const uploadedUrls: string[] = [];
    
    for (const image of images) {
      const compressed = await compressImage(image);
      const fileExt = image.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `products/${vendorId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(filePath, compressed);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('app-assets')
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newImageUrls = await uploadImages();
      const allImages = [...existingImages, ...newImageUrls];

      const productData = {
        vendor_id: vendorId,
        name,
        description,
        price: parseFloat(price),
        inventory_count: inventoryCount,
        category: category || null,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : null,
        images: allImages,
        is_active: isActive,
      };

      if (product) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);

        if (error) throw error;

        toast({
          title: "Product updated!",
          description: "Your product has been updated successfully."
        });
      } else {
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (error) throw error;
        
        // Trigger product published email if product is active
        if (isActive) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            setTimeout(() => {
              supabase.functions.invoke("send-automated-campaign", {
                body: {
                  trigger_event: "product_published",
                  recipient_email: user.email!,
                  recipient_user_id: user.id,
                  trigger_data: {
                    product_name: name,
                    product_description: description.substring(0, 100),
                  },
                },
              });
            }, 0);
          }
        }

        toast({
          title: "Product added!",
          description: "Your product has been added successfully."
        });
      }

      setOpen(false);
      onSuccess();
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setInventoryCount(0);
    setCategory("");
    setTags("");
    setIsActive(true);
    setImages([]);
    setImagePreviews([]);
    setExistingImages([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          {product ? "Edit" : <><Plus className="h-4 w-4 mr-2" /> Add Product</>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add New Product"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Handmade Ceramic Mug"
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              placeholder="Describe your product..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price ($) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                placeholder="29.99"
              />
            </div>

            <div>
              <Label htmlFor="inventory">Inventory Count *</Label>
              <Input
                id="inventory"
                type="number"
                min="0"
                value={inventoryCount}
                onChange={(e) => setInventoryCount(parseInt(e.target.value))}
                required
                placeholder="10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Pottery, Jewelry, Art, etc."
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="handmade, ceramic, gift"
            />
          </div>

          <div>
            <Label htmlFor="images">Product Images</Label>
            <div className="space-y-3">
              {existingImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {existingImages.map((url, index) => (
                    <div key={index} className="relative">
                      <img src={url} alt="" className="w-full h-24 object-cover rounded" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => removeExistingImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img src={preview} alt="" className="w-full h-24 object-cover rounded" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => removeNewImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <Button type="button" variant="outline" className="w-full" asChild>
                <label htmlFor="images" className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Add Images
                  <input
                    id="images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="active">Product is active</Label>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {product ? "Update" : "Create"} Product
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
