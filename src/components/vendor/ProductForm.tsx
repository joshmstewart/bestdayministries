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
import { Loader2, Plus, Upload, X, Settings2, ArrowLeft, Eye, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { compressImage } from "@/lib/imageUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Json } from "@/integrations/supabase/types";
import { ProductReviewPreview } from "./ProductReviewPreview";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PRODUCT_CATEGORIES = [
  "Art",
  "Candles",
  "Clothing",
  "Home Decor",
  "Jewelry",
  "Pottery",
  "Prints",
  "Stickers",
  "Woodwork",
];

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
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(product?.price || "");
  const [inventoryCount, setInventoryCount] = useState(product?.inventory_count || 0);
  const [weightOz, setWeightOz] = useState<number | "">(product?.weight_oz ?? "");
  const [category, setCategory] = useState(product?.category || "");
  const [tags, setTags] = useState(product?.tags?.join(", ") || "");
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(product?.images || []);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  // Options state
  const [options, setOptions] = useState<ProductOption[]>(product?.options || []);
  const [newOptionType, setNewOptionType] = useState<string>("");
  const [customOptionName, setCustomOptionName] = useState("");
  const [newOptionValueInputs, setNewOptionValueInputs] = useState<string[]>(["", "", ""]);
  const [addingValueToOption, setAddingValueToOption] = useState<number | null>(null);
  const [newValueForOption, setNewValueForOption] = useState("");
  
  // Image-option mapping state
  const [imageOptionMapping, setImageOptionMapping] = useState<ImageOptionMapping>(product?.image_option_mapping || {});
  
  // Custom category state
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  // Reset form when product changes or dialog opens
  useEffect(() => {
    if (open) {
      setName(product?.name || "");
      setDescription(product?.description || "");
      setPrice(product?.price || "");
      setInventoryCount(product?.inventory_count || 0);
      setWeightOz(product?.weight_oz ?? "");
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

  const COMMON_OPTION_TYPES = ["Color", "Size", "Material", "Style", "Pattern", "Flavor", "Scent"];

  const getOptionName = () => {
    if (newOptionType === "custom") return customOptionName.trim();
    return newOptionType;
  };

  const addOption = () => {
    const optionName = getOptionName();
    if (!optionName) {
      toast({
        title: "Missing option type",
        description: "Please select or enter an option type",
        variant: "destructive"
      });
      return;
    }

    const values = newOptionValueInputs.map(v => v.trim()).filter(Boolean);
    if (values.length === 0) {
      toast({
        title: "No values",
        description: "Please enter at least one choice",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate option names
    if (options.some(opt => opt.name.toLowerCase() === optionName.toLowerCase())) {
      toast({
        title: "Duplicate option",
        description: `An option named "${optionName}" already exists`,
        variant: "destructive"
      });
      return;
    }

    setOptions(prev => [...prev, { name: optionName, values }]);
    setNewOptionType("");
    setCustomOptionName("");
    setNewOptionValueInputs(["", "", ""]);
  };

  const pendingOptionHasType =
    Boolean(newOptionType) && (newOptionType !== "custom" || customOptionName.trim().length > 0);

  const pendingOptionHasValues = newOptionValueInputs.some((v) => v.trim().length > 0);

  const addOptionValueInput = () => {
    setNewOptionValueInputs(prev => [...prev, ""]);
  };

  const updateOptionValueInput = (index: number, value: string) => {
    setNewOptionValueInputs(prev => prev.map((v, i) => i === index ? value : v));
  };

  const removeOptionValueInput = (index: number) => {
    if (newOptionValueInputs.length <= 1) return;
    setNewOptionValueInputs(prev => prev.filter((_, i) => i !== index));
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

  const addValueToOption = (optionIndex: number) => {
    if (!newValueForOption.trim()) return;
    
    const values = newValueForOption.split(',').map(v => v.trim()).filter(Boolean);
    if (values.length === 0) return;
    
    setOptions(prev => prev.map((opt, i) => 
      i === optionIndex 
        ? { ...opt, values: [...opt.values, ...values] }
        : opt
    ));
    setNewValueForOption("");
    setAddingValueToOption(null);
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
      // SAFETY: If the user started entering a new option but forgot to click "Add Option",
      // either block saving (if no values) or auto-include the pending option.
      const pendingOptionName = getOptionName();
      const pendingHasType = Boolean(newOptionType) && (newOptionType !== "custom" || customOptionName.trim().length > 0);
      const pendingValues = newOptionValueInputs.map((v) => v.trim()).filter(Boolean);

      if (pendingHasType && pendingValues.length === 0) {
        toast({
          title: "Finish your option",
          description: `Add at least one choice for ${pendingOptionName || "this option"}, or clear it before saving.`,
          variant: "destructive",
        });
        return;
      }

      const optionsToSave: ProductOption[] | null = (() => {
        if (!pendingHasType || pendingValues.length === 0) return options;

        // Prevent duplicates (same validation as addOption)
        if (options.some((opt) => opt.name.toLowerCase() === pendingOptionName.toLowerCase())) {
          toast({
            title: "Duplicate option",
            description: `An option named "${pendingOptionName}" already exists.`,
            variant: "destructive",
          });
          return null;
        }

        return [...options, { name: pendingOptionName, values: pendingValues }];
      })();

      if (!optionsToSave) return;

      const newImageUrls = await uploadImages();
      const allImages = [...existingImages, ...newImageUrls];

      const productData = {
        vendor_id: vendorId,
        name,
        description,
        price: parseFloat(price),
        inventory_count: inventoryCount,
        weight_oz: weightOz === "" ? null : Number(weightOz),
        category: category || null,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : null,
        images: allImages,
        is_active: isActive,
        options: (optionsToSave.length > 0 ? optionsToSave : []) as unknown as Json,
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
    setWeightOz("");
    setCategory("");
    setTags("");
    setIsActive(true);
    setImages([]);
    setImagePreviews([]);
    setExistingImages([]);
    setOptions([]);
    setImageOptionMapping({});
    setNewOptionType("");
    setCustomOptionName("");
    setNewOptionValueInputs(["", "", ""]);
    setStep('edit');
    setShowCustomCategory(false);
  };

  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setStep('edit');
    }
  };

  // Validate form before allowing review
  const canReview = name.trim() && description.trim() && price && parseFloat(price) > 0;

  // Get all option values for image mapping
  const allOptionValues = options.flatMap(opt => opt.values);
  const totalImages = existingImages.length + imagePreviews.length;

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button>
          {product ? "Edit" : <><Plus className="h-4 w-4 mr-2" /> Add Product</>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'review' 
              ? "Review Your Product" 
              : (product ? "Edit Product" : "Add New Product")}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'review' ? (
          <div className="space-y-6">
            <ProductReviewPreview
              name={name}
              description={description}
              price={parseFloat(price) || 0}
              inventoryCount={inventoryCount}
              category={category}
              tags={tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []}
              images={[...existingImages, ...imagePreviews]}
              options={options}
            />
            
            <div className="flex gap-2 justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep('edit')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Edit
              </Button>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="secondary"
                  disabled={loading}
                  onClick={() => {
                    setIsActive(false);
                    handleSubmit(new Event('submit') as any);
                  }}
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save as Draft
                </Button>
                <Button 
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setIsActive(true);
                    handleSubmit(new Event('submit') as any);
                  }}
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Publish Product
                </Button>
              </div>
            </div>
          </div>
        ) : (
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

          <div className="grid grid-cols-3 gap-4">
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
              <Label htmlFor="inventory">Inventory *</Label>
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

            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="weight">Weight (oz)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p>Used for shipping calculations. If left empty, we'll assume 16 oz (1 lb).</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0"
                value={weightOz}
                onChange={(e) => setWeightOz(e.target.value === "" ? "" : parseFloat(e.target.value))}
                placeholder="16"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <div className="space-y-2">
              <Select
                value={PRODUCT_CATEGORIES.includes(category) ? category : (category ? "other" : "")}
                onValueChange={(value) => {
                  if (value === "other") {
                    setCategory("");
                    setShowCustomCategory(true);
                  } else {
                    setCategory(value);
                    setShowCustomCategory(false);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                  <SelectItem value="other">Other (custom)</SelectItem>
                </SelectContent>
              </Select>
              {(showCustomCategory || (category && !PRODUCT_CATEGORIES.includes(category))) && (
                <Input
                  id="customCategory"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Enter custom category"
                />
              )}
            </div>
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
            <p className="text-xs text-muted-foreground mb-2">Upload images first, then assign them to options below</p>
            <div className="space-y-3">
              {(existingImages.length > 0 || imagePreviews.length > 0) && (
                <div className="grid grid-cols-5 gap-2">
                  {existingImages.map((url, index) => (
                    <div key={`existing-${index}`} className="relative">
                      <img src={url} alt="" className="w-full h-20 object-cover rounded" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-5 w-5"
                        onClick={() => removeExistingImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] text-center py-0.5">
                        #{index + 1}
                      </div>
                    </div>
                  ))}
                  {imagePreviews.map((preview, index) => (
                    <div key={`new-${index}`} className="relative">
                      <img src={preview} alt="" className="w-full h-20 object-cover rounded" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-5 w-5"
                        onClick={() => removeNewImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] text-center py-0.5">
                        #{existingImages.length + index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <Button type="button" variant="outline" size="sm" asChild>
                <label htmlFor="images" className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  {totalImages > 0 ? "Add More Images" : "Upload Images"}
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

          {/* Product Options Section - with inline image selection */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              <Label className="text-sm font-medium">Product Options</Label>
              {options.length > 0 && <Badge variant="secondary">{options.length}</Badge>}
            </div>
            
            {/* Existing Options with Image Selection */}
            {options.length > 0 && (
              <div className="space-y-4">
                {options.map((option, optIndex) => (
                  <div key={optIndex} className="border rounded-lg p-3 space-y-3 bg-muted/20">
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
                    
                    {/* Each option value with its image selection */}
                    <div className="space-y-3">
                      {option.values.map((value, valIndex) => (
                        <div key={valIndex} className="border rounded p-2 bg-background">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">{value}</Badge>
                            <button
                              type="button"
                              onClick={() => removeOptionValue(optIndex, valIndex)}
                              className="text-xs text-muted-foreground hover:text-destructive"
                            >
                              Remove
                            </button>
                          </div>
                          
                          {/* Image selection for this option value */}
                          {totalImages > 0 ? (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Click images to link to "{value}":</p>
                              <div className="flex flex-wrap gap-1">
                                {[...existingImages, ...imagePreviews].map((img, imgIndex) => {
                                  const isLinked = imageOptionMapping[value]?.includes(imgIndex);
                                  return (
                                    <div
                                      key={imgIndex}
                                      className={`relative cursor-pointer rounded overflow-hidden transition-all ${
                                        isLinked 
                                          ? 'ring-2 ring-primary ring-offset-1' 
                                          : 'opacity-50 hover:opacity-100'
                                      }`}
                                      onClick={() => toggleImageOptionMapping(value, imgIndex)}
                                      title={isLinked ? `Unlink image #${imgIndex + 1}` : `Link image #${imgIndex + 1}`}
                                    >
                                      <img src={img} alt="" className="w-10 h-10 object-cover" />
                                      {isLinked && (
                                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                          <div className="w-3 h-3 bg-primary rounded-full" />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {imageOptionMapping[value]?.length > 0 && (
                                <p className="text-xs text-primary">
                                  {imageOptionMapping[value].length} image{imageOptionMapping[value].length > 1 ? 's' : ''} linked
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">Upload images above to link them</p>
                          )}
                        </div>
                      ))}
                      
                      {/* Add more values to this option */}
                      {addingValueToOption === optIndex ? (
                        <div className="flex gap-2 items-center">
                          <Input
                            placeholder="e.g., Purple, Orange"
                            value={newValueForOption}
                            onChange={(e) => setNewValueForOption(e.target.value)}
                            className="flex-1 h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addValueToOption(optIndex);
                              }
                              if (e.key === 'Escape') {
                                setAddingValueToOption(null);
                                setNewValueForOption("");
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="h-8"
                            onClick={() => addValueToOption(optIndex)}
                          >
                            Add
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => {
                              setAddingValueToOption(null);
                              setNewValueForOption("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full h-8"
                          onClick={() => setAddingValueToOption(optIndex)}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add {option.name}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Option */}
            <div className="border rounded-lg p-3 space-y-4 bg-muted/30">
              <Label className="text-sm font-medium">Add New Option</Label>
              
              {/* Step 1: Choose Option Type */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">1. What type of option?</Label>
                <Select value={newOptionType} onValueChange={(value) => {
                  setNewOptionType(value);
                  if (value !== "custom") setCustomOptionName("");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select option type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_OPTION_TYPES.filter(type => 
                      !options.some(opt => opt.name.toLowerCase() === type.toLowerCase())
                    ).map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                    <SelectItem value="custom">+ Custom option...</SelectItem>
                  </SelectContent>
                </Select>
                
                {newOptionType === "custom" && (
                  <Input
                    placeholder="Enter custom option name..."
                    value={customOptionName}
                    onChange={(e) => setCustomOptionName(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>

              {/* Step 2: Add Choices (only show if option type selected) */}
              {(newOptionType && (newOptionType !== "custom" || customOptionName.trim())) && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    2. Add choices for {newOptionType === "custom" ? customOptionName : newOptionType}
                  </Label>
                  <div className="space-y-2">
                    {newOptionValueInputs.map((value, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder={`Choice ${index + 1}`}
                          value={value}
                          onChange={(e) => updateOptionValueInput(index, e.target.value)}
                        />
                        {newOptionValueInputs.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => removeOptionValueInput(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addOptionValueInput}
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add another choice
                  </Button>
                  
                  <Button
                    type="button"
                    size="sm"
                    onClick={addOption}
                    disabled={!pendingOptionHasValues}
                    className="w-full mt-2"
                  >
                    Save Option
                  </Button>
                </div>
              )}
            </div>
            
            {options.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No options yet. Add options like Color, Size, or Material if your product has variants.
              </p>
            )}
          </div>

          {/* Hide the active toggle when creating - we'll set it based on save/publish choice */}
          {product && (
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="active">Product is active</Label>
            </div>
          )}

          <div className="flex gap-2 justify-between">
            <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {product ? (
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Update Product
                </Button>
              ) : (
                <>
                  <Button 
                    type="button" 
                    variant="secondary"
                    disabled={loading}
                    onClick={() => {
                      setIsActive(false);
                      handleSubmit(new Event('submit') as any);
                    }}
                  >
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Draft
                  </Button>
                  <Button 
                    type="button"
                    disabled={loading || !canReview}
                    onClick={() => setStep('review')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Review & Publish
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
