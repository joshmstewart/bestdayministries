import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Check, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductColorImagesManager } from "./ProductColorImagesManager";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  inventory_count: number;
  vendor_sku?: string | null;
  is_printify_product?: boolean;
  printify_variant_ids?: Record<string, number> | null;
}

interface ProductEditDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export const ProductEditDialog = ({ product, open, onOpenChange, onSave }: ProductEditDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [vendorSku, setVendorSku] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [defaultImageIndex, setDefaultImageIndex] = useState<number>(0);
  const [defaultImageUrl, setDefaultImageUrl] = useState<string | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);

  useEffect(() => {
    if (product && open) {
      setName(product.name);
      setDescription(product.description || "");
      setPrice(product.price.toString());
      setVendorSku(product.vendor_sku || "");
      setIsActive(product.is_active);
      loadProductImages(product.id);
    }
  }, [product, open]);

  const loadProductImages = useCallback(async (productId: string) => {
    setLoadingImages(true);
    try {
      // Fetch product data AND custom color images in parallel
      const [productResult, colorImagesResult] = await Promise.all([
        supabase
          .from("products")
          .select("images, default_image_index, default_image_url, is_printify_product, printify_variant_ids")
          .eq("id", productId)
          .single(),
        supabase
          .from("product_color_images")
          .select("image_url")
          .eq("product_id", productId)
          .order("display_order", { ascending: true })
      ]);

      if (productResult.error) throw productResult.error;

      const apiImages = productResult.data.images || [];
      const customImages = (colorImagesResult.data || []).map(r => r.image_url);
      
      // Combine and dedupe: API images first, then custom uploads not already in API images
      const apiSet = new Set(apiImages);
      const allImages = [...apiImages, ...customImages.filter(url => !apiSet.has(url))];

      setImages(allImages);
      setDefaultImageIndex(productResult.data.default_image_index ?? 0);
      setDefaultImageUrl(productResult.data.default_image_url);
    } catch (error: any) {
      console.error("Failed to load product images:", error);
      setImages([]);
      setDefaultImageIndex(0);
      setDefaultImageUrl(null);
    } finally {
      setLoadingImages(false);
    }
  }, []);

  // Extract available colors from variant IDs
  const availableColors = useMemo(() => {
    if (!product?.printify_variant_ids) return [];
    const variantIds = product.printify_variant_ids as Record<string, number>;
    const colors = new Set<string>();
    const sizePatterns = /^(xs|s|m|l|xl|xxl|2xl|3xl|4xl|5xl|6xl|one size|\d+)$/i;
    
    Object.keys(variantIds).forEach((title) => {
      const parts = title.split(' / ');
      if (parts.length === 2) {
        const color = sizePatterns.test(parts[0].trim()) ? parts[1] : parts[0];
        colors.add(color.trim());
      } else if (parts.length === 1) {
        colors.add(parts[0].trim());
      }
    });
    
    return Array.from(colors).sort();
  }, [product?.printify_variant_ids]);

  const handleSave = async () => {
    if (!product) return;

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({
          name,
          description,
          price: priceNum,
          vendor_sku: vendorSku.trim() || null,
          is_active: isActive,
          default_image_index: defaultImageIndex,
          default_image_url: defaultImageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.id);

      if (error) throw error;

      toast.success("Product updated successfully");
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to update product: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update product details including price markup and default image.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="price">Price ($)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This is the final selling price including any markup.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="vendor-sku">Vendor Product ID / SKU</Label>
            <Input
              id="vendor-sku"
              value={vendorSku}
              onChange={(e) => setVendorSku(e.target.value)}
              placeholder="Optional - vendor's internal product ID"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is-active">Active</Label>
            <Switch
              id="is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {/* Default Image Selection */}
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Default Image
            </Label>
            {loadingImages ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : images.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {images.map((imageUrl, index) => {
                  const isDefault = defaultImageUrl ? defaultImageUrl === imageUrl : defaultImageIndex === index;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setDefaultImageIndex(index);
                        setDefaultImageUrl(imageUrl);
                      }}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:opacity-90",
                        isDefault
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-muted-foreground"
                      )}
                    >
                      <img
                        src={imageUrl}
                        alt={`Product image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {isDefault && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="bg-primary text-primary-foreground rounded-full p-1">
                            <Check className="h-4 w-4" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                No images available for this product.
              </p>
            )}
            {images.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Click an image to set it as the default display image.
              </p>
            )}
          </div>

          {/* Color Images Manager for Printify products */}
          {product?.is_printify_product && availableColors.length > 0 && (
            <div className="grid gap-2 pt-2 border-t">
              <Label>Color-Specific Images</Label>
              <ProductColorImagesManager
                productId={product.id}
                productName={product.name}
                availableColors={availableColors}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};