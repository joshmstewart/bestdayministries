import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Upload, X, Settings2 } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Json } from "@/integrations/supabase/types";

interface ProductOption {
  name: string;
  values: string[];
}

interface ImageOptionMapping {
  [optionValue: string]: number[];
}

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
  
  // Options state
  const [options, setOptions] = useState<ProductOption[]>(product?.options || []);
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionValues, setNewOptionValues] = useState("");
  
  // Image-option mapping state
  const [imageOptionMapping, setImageOptionMapping] = useState<ImageOptionMapping>(product?.image_option_mapping || {});

  // Reset form when product changes or dialog opens
  useEffect(() => {
    if (open) {
      setName(product?.name || "");
      setDescription(product?.description || "");
      setPrice(product?.price || "");
      setInventoryCount(product?.inventory_count || 0);
      setCategory(product?.category || "");
      setTags(product?.tags?.join(", ") || "");
      setIsActive(product?.is_active ?? true);
      setExistingImages(product?.images || []);
      setOptions(product?.options || []);
      setImageOptionMapping(product?.image_option_mapping || {});
      setImages([]);
      setImagePreviews([]);
    }
  }, [open, product]);

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
    
    // Update mappings - new images are after existing images
    const actualIndex = existingImages.length + index;
    updateMappingsAfterImageRemoval(actualIndex);
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
    updateMappingsAfterImageRemoval(index);
  };

  const updateMappingsAfterImageRemoval = (removedIndex: number) => {
    const newMapping: ImageOptionMapping = {};
    Object.entries(imageOptionMapping).forEach(([optionValue, indices]) => {
      newMapping[optionValue] = indices
        .filter(i => i !== removedIndex)
        .map(i => i > removedIndex ? i - 1 : i);
    });
    setImageOptionMapping(newMapping);
  };

  const addOption = () => {
    if (!newOptionName.trim() || !newOptionValues.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both option name and values",
        variant: "destructive"
      });
      return;
    }

    const values = newOptionValues.split(',').map(v => v.trim()).filter(Boolean);
    if (values.length === 0) {
      toast({
        title: "No values",
        description: "Please enter at least one option value",
        variant: "destructive"
      });
      return;
    }

    setOptions(prev => [...prev, { name: newOptionName.trim(), values }]);
    setNewOptionName("");
    setNewOptionValues("");
  };

  const removeOption = (index: number) => {
    const optionToRemove = options[index];
    // Remove mappings for this option's values
    const newMapping = { ...imageOptionMapping };
    optionToRemove.values.forEach(value => {
      delete newMapping[value];
    });
    setImageOptionMapping(newMapping);
    setOptions(prev => prev.filter((_, i) => i !== index));
  };

  const removeOptionValue = (optionIndex: number, valueIndex: number) => {
    const valueToRemove = options[optionIndex].values[valueIndex];
    // Remove mapping for this value
    const newMapping = { ...imageOptionMapping };
    delete newMapping[valueToRemove];
    setImageOptionMapping(newMapping);
    
    setOptions(prev => prev.map((opt, i) => 
      i === optionIndex 
        ? { ...opt, values: opt.values.filter((_, vi) => vi !== valueIndex) }
        : opt
    ));
  };

  const toggleImageOptionMapping = (optionValue: string, imageIndex: number) => {
    setImageOptionMapping(prev => {
      const current = prev[optionValue] || [];
      if (current.includes(imageIndex)) {
        return { ...prev, [optionValue]: current.filter(i => i !== imageIndex) };
      } else {
        return { ...prev, [optionValue]: [...current, imageIndex].sort((a, b) => a - b) };
      }
    });
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
        options: (options.length > 0 ? options : []) as unknown as Json,
        image_option_mapping: (Object.keys(imageOptionMapping).length > 0 ? imageOptionMapping : {}) as unknown as Json,
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
        const { error } = await supabase
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
    setOptions([]);
    setImageOptionMapping({});
    setNewOptionName("");
    setNewOptionValues("");
  };

  // Get all option values for image mapping
  const allOptionValues = options.flatMap(opt => opt.values);
  const totalImages = existingImages.length + imagePreviews.length;

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

          {/* Product Options Section */}
          <Accordion type="single" collapsible className="w-full" defaultValue={options.length > 0 ? "options" : undefined}>
            <AccordionItem value="options" className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Product Options (Color, Size, etc.) {options.length > 0 && <Badge variant="secondary" className="ml-2">{options.length}</Badge>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                {/* Existing Options */}
                {options.length > 0 && (
                  <div className="space-y-3">
                    {options.map((option, optIndex) => (
                      <div key={optIndex} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{option.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeOption(optIndex)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {option.values.map((value, valIndex) => (
                            <Badge key={valIndex} variant="secondary" className="gap-1">
                              {value}
                              <button
                                type="button"
                                onClick={() => removeOptionValue(optIndex, valIndex)}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Option */}
                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <Label className="text-sm font-medium">Add New Option</Label>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Option Name</Label>
                      <Input
                        placeholder="e.g., Color, Size, Material"
                        value={newOptionName}
                        onChange={(e) => setNewOptionName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Option Choices (comma separated)</Label>
                      <Input
                        placeholder="e.g., Red, Blue, Green"
                        value={newOptionValues}
                        onChange={(e) => setNewOptionValues(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addOption}>
                    <Plus className="h-3 w-3 mr-1" /> Add Option
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Tip about linking images */}
          {options.length > 0 && totalImages === 0 && (
            <p className="text-xs text-muted-foreground italic">
              💡 Add images below, then you can link specific images to each option choice.
            </p>
          )}

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
                      <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
                        #{index + 1}
                      </div>
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
                      <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
                        #{existingImages.length + index + 1}
                      </div>
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

          {/* Image-Option Mapping Section */}
          {allOptionValues.length > 0 && totalImages > 0 && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="mapping">
                <AccordionTrigger className="text-sm font-medium">
                  Link Images to Options
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <p className="text-xs text-muted-foreground">
                    Select which images should show for each option value. Customers will see the linked images when they select that option.
                  </p>
                  <div className="space-y-4">
                    {allOptionValues.map((optionValue) => (
                      <div key={optionValue} className="border rounded-lg p-3 space-y-2">
                        <Label className="text-sm font-medium">{optionValue}</Label>
                        <div className="grid grid-cols-6 gap-2">
                          {[...existingImages, ...imagePreviews].map((img, imgIndex) => {
                            const isLinked = imageOptionMapping[optionValue]?.includes(imgIndex);
                            return (
                              <div
                                key={imgIndex}
                                className={`relative cursor-pointer rounded overflow-hidden border-2 transition-all ${
                                  isLinked ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted-foreground/30'
                                }`}
                                onClick={() => toggleImageOptionMapping(optionValue, imgIndex)}
                              >
                                <img src={img} alt="" className="w-full h-12 object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                  <Checkbox
                                    checked={isLinked}
                                    className="pointer-events-none"
                                  />
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] text-center">
                                  #{imgIndex + 1}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

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
