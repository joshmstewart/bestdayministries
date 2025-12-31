import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ShoppingCart, Minus, Plus } from "lucide-react";
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
        .select('*')
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

  // Filter images based on selected color's variant ID and include custom color images
  const filteredImages = (() => {
    // Get custom images for the selected color
    const customImagesForColor = selectedColor 
      ? (customColorImages || [])
          .filter(img => img.color_name === selectedColor)
          .map(img => img.image_url)
      : [];
    
    if (!product?.images || !selectedColor || !hasMultipleOptions) {
      // Include custom images at the end of default images
      return [...(product?.images || []), ...customImagesForColor];
    }
    
    const variantId = colorToVariantId.get(selectedColor);
    if (!variantId) {
      return [...product.images, ...customImagesForColor];
    }
    
    // Filter Printify images that contain this variant ID in the URL path
    const matchingPrintifyImages = product.images.filter((img: string) => 
      img.includes(`/${variantId}/`)
    );
    
    // Combine Printify images for this color with custom uploaded images
    const baseImages = matchingPrintifyImages.length > 0 ? matchingPrintifyImages : product.images;
    return [...baseImages, ...customImagesForColor];
  })();

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

  const imageUrl = filteredImages.length > 0 
    ? filteredImages[0] 
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
            {/* Product Images */}
            <div className="space-y-4">
              <div className="aspect-square relative overflow-hidden rounded-lg bg-secondary/10">
                <img 
                  src={imageUrl}
                  alt={product.name}
                  className="object-cover w-full h-full"
                />
              </div>
              
              {/* Thumbnail gallery */}
              {filteredImages.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {filteredImages.slice(0, 4).map((img: string, idx: number) => (
                    <div key={idx} className="aspect-square rounded-md overflow-hidden bg-secondary/10">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
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
