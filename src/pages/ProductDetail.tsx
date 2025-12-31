import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ShoppingCart, Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { FloatingCartButton } from "@/components/marketplace/FloatingCartButton";
import { UnifiedCartSheet } from "@/components/marketplace/UnifiedCartSheet";
import { useShopifyCartStore } from "@/stores/shopifyCartStore";
import { useCartSession } from "@/hooks/useCartSession";

interface ProductVariant {
  id: number;
  title: string;
  price: number;
  is_enabled: boolean;
}

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const shopifyCartItems = useShopifyCartStore(state => state.getTotalItems);
  const { getCartFilter, getCartInsertData, isLoading: cartSessionLoading } = useCartSession();

  // Fetch cart count using session-aware filter
  const { data: cartCount } = useQuery({
    queryKey: ['cart-count', getCartFilter()],
    queryFn: async () => {
      const filter = getCartFilter();
      if (!filter) return 0;
      
      let query = supabase.from('shopping_cart').select('quantity');
      
      if ('user_id' in filter) {
        query = query.eq('user_id', filter.user_id);
      } else if ('session_id' in filter) {
        query = query.eq('session_id', filter.session_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    },
    enabled: !cartSessionLoading
  });

  const totalCartCount = (cartCount || 0) + shopifyCartItems();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, default_image_url')
        .eq('id', productId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  // Fetch custom color images for this product
  const { data: customColorImages } = useQuery({
    queryKey: ['product-color-images', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_color_images')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });

  const variants: ProductVariant[] = product?.printify_variant_ids 
    ? Object.entries(product.printify_variant_ids as Record<string, number>).map(([title, id]) => ({
        id: id as number,
        title,
        price: product.price,
        is_enabled: true,
      }))
    : [];

  // Intelligently parse variants into option groups
  // For two-part variants like "Color / Size", splits them
  // For single-part variants, treats them as a single option
  const { option1Values, option2Values, option1Label, option2Label, hasMultipleOptions, option1ToVariantId, defaultOption1, defaultOption2 } = (() => {
    const option1Set = new Set<string>();
    const option2Set = new Set<string>();
    const option1VariantMap = new Map<string, number>();
    
    variants.forEach(v => {
      const parts = v.title.split(' / ');
      if (parts.length === 2) {
        option1Set.add(parts[0]);
        option2Set.add(parts[1]);
        if (!option1VariantMap.has(parts[0])) {
          option1VariantMap.set(parts[0], v.id);
        }
      } else if (parts.length === 1) {
        // Single-part variant (e.g., "With lid and straw")
        option1Set.add(parts[0]);
        if (!option1VariantMap.has(parts[0])) {
          option1VariantMap.set(parts[0], v.id);
        }
      }
    });
    
    const opt1Values = Array.from(option1Set);
    const opt2Values = Array.from(option2Set);
    
    // Detect if values look like sizes or colors
    const sizePatterns = /^(xs|s|m|l|xl|xxl|2xl|3xl|4xl|5xl|6xl|one size|\d+)$/i;
    const colorPatterns = /^(white|black|red|blue|green|yellow|orange|purple|pink|gray|grey|brown|navy|natural|beige|cream|tan|olive|teal|coral|lime|gold|silver|maroon|burgundy)$/i;
    
    const opt1IsSize = opt1Values.some(v => sizePatterns.test(v.trim()));
    const opt1IsColor = opt1Values.some(v => colorPatterns.test(v.trim().toLowerCase()));
    const opt2IsSize = opt2Values.some(v => sizePatterns.test(v.trim()));
    const opt2IsColor = opt2Values.some(v => colorPatterns.test(v.trim().toLowerCase()));
    
    // Determine labels based on detected patterns
    let label1 = "Option";
    let label2 = "Option";
    
    if (opt2Values.length > 0) {
      // Two-part variants
      if (opt1IsColor && opt2IsSize) {
        label1 = "Color";
        label2 = "Size";
      } else if (opt1IsSize && opt2IsColor) {
        label1 = "Size";
        label2 = "Color";
      } else if (opt1IsSize) {
        label1 = "Size";
        label2 = "Style";
      } else if (opt2IsSize) {
        label1 = "Style";
        label2 = "Size";
      } else {
        label1 = "Style";
        label2 = "Option";
      }
    } else {
      // Single-part variants - use a generic "Style" label
      label1 = "Style";
    }
    
    return {
      option1Values: opt1Values,
      option2Values: opt2Values,
      option1Label: label1,
      option2Label: label2,
      hasMultipleOptions: opt1Values.length > 0 && opt2Values.length > 0,
      option1ToVariantId: option1VariantMap,
      defaultOption1: opt1Values.length === 1 ? opt1Values[0] : "",
      defaultOption2: opt2Values.length === 1 ? opt2Values[0] : ""
    };
  })();

  // Rename state for clarity but keep backward compatibility
  const colors = option1Values;
  const sizes = option2Values;
  const colorToVariantId = option1ToVariantId;
  const defaultColor = defaultOption1;
  const defaultSize = defaultOption2;

  // Auto-select single options when product loads
  useEffect(() => {
    if (defaultColor && !selectedColor) setSelectedColor(defaultColor);
    if (defaultSize && !selectedSize) setSelectedSize(defaultSize);
  }, [defaultColor, defaultSize]);

  // Build ordered images (no duplicates): group by color using product_color_images mapping.
  // - Includes Printify API images (already in products.images)
  // - Includes any custom uploaded images (app-assets/product-colors)
  // - Selecting a color will jump to that color's "section" in this ordered list
  const allImages = useMemo(() => {
    const apiImages = (product?.images as string[]) || [];
    const apiSet = new Set(apiImages);
    const rows = customColorImages || [];

    const result: string[] = [];
    const seen = new Set<string>();

    const add = (url?: string | null) => {
      if (!url) return;
      if (seen.has(url)) return;
      seen.add(url);
      result.push(url);
    };

    // 1) Add mapped images per color in order
    colors.forEach((color) => {
      const group = rows
        .filter((r) => r.color_name === color)
        .slice()
        .sort((a, b) => {
          const orderA = Number(a.display_order ?? 0);
          const orderB = Number(b.display_order ?? 0);
          if (orderA !== orderB) return orderA - orderB;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

      group.forEach((r) => add(r.image_url));
    });

    // 2) Add any remaining API images in their original order
    apiImages.forEach((url) => add(url));

    // 3) Add any remaining mapped rows (unassigned colors, etc.)
    rows.forEach((r) => add(r.image_url));

    return result;
  }, [product?.images, customColorImages, colors]);

  // Map colors to their first image index for navigation
  const colorToFirstImageIndex = useMemo(() => {
    const map = new Map<string, number>();
    const rows = customColorImages || [];

    colors.forEach((color) => {
      // Prefer explicit mapping from product_color_images
      const firstMappedUrl = rows
        .filter((r) => r.color_name === color)
        .slice()
        .sort((a, b) => {
          const orderA = Number(a.display_order ?? 0);
          const orderB = Number(b.display_order ?? 0);
          if (orderA !== orderB) return orderA - orderB;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        })
        .map((r) => r.image_url)
        .find(Boolean);

      if (firstMappedUrl) {
        const idx = allImages.indexOf(firstMappedUrl);
        if (idx !== -1) map.set(color, idx);
        return;
      }

      // Fallback: detect by Printify variant ID in URL
      const variantId = colorToVariantId.get(color);
      if (variantId) {
        const idx = allImages.findIndex((url) => url.includes(`/${variantId}/`));
        if (idx !== -1) map.set(color, idx);
      }
    });

    return map;
  }, [colors, customColorImages, allImages, colorToVariantId]);

  // On first load, if a default image was set in admin, start on it (but keep ordering intact)
  const hasSetInitialImageRef = useRef(false);
  useEffect(() => {
    if (hasSetInitialImageRef.current) return;
    if (!allImages.length) return;

    const def = product?.default_image_url;
    if (def) {
      const idx = allImages.indexOf(def);
      if (idx !== -1) setCurrentImageIndex(idx);
    }

    hasSetInitialImageRef.current = true;
  }, [allImages, product?.default_image_url]);

  // When color changes, jump to that color's first image
  useEffect(() => {
    if (!selectedColor) return;
    const targetIndex = colorToFirstImageIndex.get(selectedColor);
    if (targetIndex !== undefined) setCurrentImageIndex(targetIndex);
  }, [selectedColor, colorToFirstImageIndex]);

  // Navigation handlers
  const goToPrevImage = () => {
    setCurrentImageIndex(prev => prev > 0 ? prev - 1 : allImages.length - 1);
  };

  const goToNextImage = () => {
    setCurrentImageIndex(prev => prev < allImages.length - 1 ? prev + 1 : 0);
  };

  // Build the effective variant from selections
  const effectiveVariant = (() => {
    if (variants.length === 1) return variants[0].title;
    // Two-part variants (Color / Size format)
    if (hasMultipleOptions && selectedColor && selectedSize) {
      return `${selectedColor} / ${selectedSize}`;
    }
    // Single-option variants (just one selection needed)
    if (!hasMultipleOptions && selectedColor) {
      return selectedColor;
    }
    return "";
  })();

  const addToCart = async () => {
    if (cartSessionLoading) return;

    // For Printify products with multiple variants, we need a variant selection
    if (product?.is_printify_product && variants.length > 1 && !effectiveVariant) {
      const optionText = hasMultipleOptions ? `${option1Label.toLowerCase()} and ${option2Label.toLowerCase()}` : option1Label.toLowerCase();
      toast({
        title: "Select options",
        description: `Please select ${optionText} before adding to cart`,
        variant: "destructive"
      });
      return;
    }

    const variantInfo = effectiveVariant 
      ? { variant: effectiveVariant, variantId: variants.find(v => v.title === effectiveVariant)?.id } 
      : null;

    const insertData = getCartInsertData(product?.id || '', quantity, variantInfo);
    if (!insertData) {
      toast({
        title: "Error",
        description: "Unable to add to cart. Please try again.",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('shopping_cart')
      .upsert(insertData, {
        onConflict: 'user_id' in insertData ? 'user_id,product_id' : 'session_id,product_id',
        ignoreDuplicates: false
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive"
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['cart-count'] });
    queryClient.invalidateQueries({ queryKey: ['cart-items'] });

    toast({
      title: "Added to cart",
      description: `${product?.name}${effectiveVariant ? ` (${effectiveVariant})` : ''} has been added to your cart`
    });
  };

  const currentImage = allImages.length > 0 
    ? allImages[currentImageIndex] 
    : '/placeholder.svg';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <UnifiedHeader />
        <main className="pt-24 pb-16">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Skeleton className="aspect-square rounded-lg" />
              <div className="space-y-4">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <UnifiedHeader />
        <main className="pt-24 pb-16">
          <div className="container max-w-6xl mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold mb-4">Product not found</h1>
            <Button onClick={() => navigate('/store')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Store
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader />
      <main className="pt-24 pb-16">
        <div className="container max-w-6xl mx-auto px-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/joyhousestore')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Store
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Product Images with Navigation */}
            <div className="space-y-4">
              <div className="aspect-square relative overflow-hidden rounded-lg bg-secondary/10 group">
                <img 
                  src={currentImage}
                  alt={product.name}
                  className="object-cover w-full h-full"
                />
                
                {/* Left/Right Navigation Arrows */}
                {allImages.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={goToPrevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={goToNextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                    
                    {/* Image counter */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 px-2 py-1 rounded text-xs font-medium">
                      {currentImageIndex + 1} / {allImages.length}
                    </div>
                  </>
                )}
              </div>
              
              {/* Thumbnail gallery - show all images, highlight current */}
              {allImages.length > 1 && (
                <div className="grid grid-cols-5 gap-2 max-h-[200px] overflow-y-auto">
                  {allImages.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`aspect-square rounded-md overflow-hidden bg-secondary/10 border-2 transition-all ${
                        idx === currentImageIndex ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted-foreground/30'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                <p className="text-3xl font-bold text-primary">
                  ${Number(product.price).toFixed(2)}
                </p>
              </div>

              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description || 'No description available.'}
              </p>

              {/* Variant Selection - dynamic labels based on option types */}
              {product.is_printify_product && variants.length > 1 && (
                <div className="space-y-4">
                  {/* Option 1 Selection (Color, Style, etc.) */}
                  {colors.length > 1 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{option1Label}</label>
                      <Select value={selectedColor} onValueChange={setSelectedColor}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={`Choose ${option1Label.toLowerCase()}...`} />
                        </SelectTrigger>
                        <SelectContent>
                          {colors.map((color) => (
                            <SelectItem key={color} value={color}>
                              {color}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Option 2 Selection (Size, Option, etc.) - only if there are two-part variants */}
                  {sizes.length > 1 && hasMultipleOptions && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{option2Label}</label>
                      <Select value={selectedSize} onValueChange={setSelectedSize}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={`Choose ${option2Label.toLowerCase()}...`} />
                        </SelectTrigger>
                        <SelectContent>
                          {sizes.map((size) => (
                            <SelectItem key={size} value={size}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity</label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Add to Cart */}
              <Button 
                size="lg"
                className="w-full"
                onClick={addToCart}
                disabled={product.inventory_count === 0}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to Cart
              </Button>

              {product.inventory_count === 0 && (
                <Badge variant="destructive" className="w-full justify-center py-2">
                  Out of Stock
                </Badge>
              )}
            </div>
          </div>
        </div>
      </main>
      <FloatingCartButton cartCount={totalCartCount} onClick={() => setCartOpen(true)} />
      <UnifiedCartSheet open={cartOpen} onOpenChange={setCartOpen} />
      <Footer />
    </div>
  );
};

export default ProductDetail;
