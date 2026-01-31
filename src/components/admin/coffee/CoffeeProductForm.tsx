import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ImageUploadWithCrop } from "@/components/common/ImageUploadWithCrop";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, X, Plus } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";
import { CoffeeProductTiersManager } from "./CoffeeProductTiersManager";

const formSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  description: z.string().max(2000).optional(),
  cost_price: z.coerce.number().min(0.01, "Cost price must be greater than 0"),
  selling_price: z.coerce.number().min(0.01, "Selling price must be greater than 0"),
  shipstation_sku: z.string().min(1, "ShipStation SKU is required").max(100),
  is_active: z.boolean().default(true),
  display_order: z.coerce.number().int().default(0),
});

type FormData = z.infer<typeof formSchema>;

interface CoffeeProduct {
  id: string;
  name: string;
  description: string | null;
  cost_price: number;
  selling_price: number;
  shipstation_sku: string;
  images: string[];
  is_active: boolean;
  display_order: number;
}

interface CoffeeProductFormProps {
  product?: CoffeeProduct | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CoffeeProductForm({ product, onSuccess, onCancel }: CoffeeProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [images, setImages] = useState<string[]>(product?.images || []);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const sanitizeFilename = (originalName: string) =>
    originalName
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

  const uploadCoffeeProductImage = async (file: File) => {
    // IMPORTANT: derive sanitized name from the original File name
    const originalName = file.name;
    const sanitizedName = sanitizeFilename(originalName);
    const fileName = `coffee-products/${Date.now()}-${sanitizedName || "image.jpg"}`;

    // Keep uploads small/reliable
    const compressed = await compressImage(file, 5);

    const { error: uploadError } = await supabase.storage
      .from("app-assets")
      .upload(fileName, compressed);
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("app-assets")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      cost_price: product?.cost_price || 0,
      selling_price: product?.selling_price || 0,
      shipstation_sku: product?.shipstation_sku || "",
      is_active: product?.is_active ?? true,
      display_order: product?.display_order || 0,
    },
  });

  const handleImageChange = (file: File | null, preview: string | null) => {
    setImageFile(file);
    setImagePreview(preview);
  };

  const addImage = async () => {
    if (!imageFile || !imagePreview) return;
    if (isUploadingImage) return;

    try {
      setIsUploadingImage(true);
      const publicUrl = await uploadCoffeeProductImage(imageFile);

      setImages((prev) => [...prev, publicUrl]);
      setImageFile(null);
      setImagePreview(null);
      toast({ title: "Image added" });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Failed to upload image",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormData) => {
    if (isUploadingImage) {
      toast({
        title: "Image upload in progress",
        description: "Please wait for the image upload to finish, then try saving again.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // If the user selected/cropped an image but didn't click "Add",
      // upload it automatically during save so it can't be lost.
      let finalImages = images;
      if (imageFile && imagePreview) {
        setIsUploadingImage(true);
        const publicUrl = await uploadCoffeeProductImage(imageFile);
        finalImages = [...images, publicUrl];
        setImages(finalImages);
        setImageFile(null);
        setImagePreview(null);
        toast({ title: "Image added" });
        setIsUploadingImage(false);
      }

      if (product) {
        const { error } = await supabase
          .from("coffee_products")
          .update({
            name: data.name,
            description: data.description || null,
            cost_price: data.cost_price,
            selling_price: data.selling_price,
            shipstation_sku: data.shipstation_sku,
            is_active: data.is_active,
            display_order: data.display_order,
            images: finalImages,
          })
          .eq("id", product.id);
        if (error) throw error;
        toast({ title: "Product updated successfully" });
      } else {
        const { error } = await supabase
          .from("coffee_products")
          .insert([{
            name: data.name,
            description: data.description || null,
            cost_price: data.cost_price,
            selling_price: data.selling_price,
            shipstation_sku: data.shipstation_sku,
            is_active: data.is_active,
            display_order: data.display_order,
            images: finalImages,
          }]);
        if (error) throw error;
        toast({ title: "Product created successfully" });
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast({
        title: "Error saving product",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
    }
  };

  const margin = form.watch("selling_price") - form.watch("cost_price");
  const marginPercent = form.watch("cost_price") > 0 
    ? ((margin / form.watch("cost_price")) * 100).toFixed(1) 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product ? "Edit Coffee Product" : "Add Coffee Product"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Colombian Dark Roast" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the coffee product..." 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shipstation_sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ShipStation SKU *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., COFFEE-DARK-12OZ" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cost_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Price (Wholesale) *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          className="pl-7"
                          placeholder="0.00" 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="selling_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price (Retail) *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          className="pl-7"
                          placeholder="0.00" 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.watch("cost_price") > 0 && form.watch("selling_price") > 0 && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <span className="font-medium">Margin:</span>{" "}
                <span className={margin >= 0 ? "text-green-600" : "text-destructive"}>
                  ${margin.toFixed(2)} ({marginPercent}%)
                </span>
              </div>
            )}

            <div className="space-y-4">
              <Label>Product Images</Label>
              
              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {images.map((url, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={url} 
                        alt={`Product ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <ImageUploadWithCrop
                    label="Add Image"
                    imagePreview={imagePreview}
                    onImageChange={handleImageChange}
                    aspectRatio="1:1"
                    allowAspectRatioChange={true}
                  />
                </div>
                {imagePreview && (
                  <Button type="button" onClick={addImage} variant="outline" disabled={isUploadingImage}>
                    {isUploadingImage ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    {isUploadingImage ? "Uploading..." : "Add"}
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="display_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                    <FormLabel className="cursor-pointer">Active</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Pricing Tiers - only show for existing products */}
            {product && (
              <div className="pt-4 border-t">
                <CoffeeProductTiersManager
                  productId={product.id}
                  basePrice={form.watch("selling_price")}
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting || isUploadingImage}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {product ? "Update Product" : "Create Product"}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
