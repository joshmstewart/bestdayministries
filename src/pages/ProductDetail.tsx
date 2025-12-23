import { useState } from "react";
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

  const variants: ProductVariant[] = product?.printify_variant_ids 
    ? Object.entries(product.printify_variant_ids as Record<string, number>).map(([title, id]) => ({
        id: id as number,
        title,
        price: product.price,
        is_enabled: true,
      }))
    : [];

  // Intelligently parse variants into colors and sizes (format: "OptionA / OptionB")
  // Detects which option is which by checking for known size patterns
  const { colors, sizes, hasMultipleOptions, colorToVariantId } = (() => {
    const option1Set = new Set<string>();
    const option2Set = new Set<string>();
    const option1VariantMap = new Map<string, number>();
    
    variants.forEach(v => {
      const parts = v.title.split(' / ');
      if (parts.length === 2) {
        option1Set.add(parts[0]);
        option2Set.add(parts[1]);
        // Store one variant ID per option1 (for image matching)
        if (!option1VariantMap.has(parts[0])) {
          option1VariantMap.set(parts[0], v.id);
        }
      }
    });
    
    const option1Values = Array.from(option1Set);
    const option2Values = Array.from(option2Set);
    
    // Detect which set contains sizes based on common size patterns
    const sizePatterns = /^(xs|s|m|l|xl|xxl|2xl|3xl|4xl|5xl|6xl|one size|\d+)$/i;
    const option1IsSize = option1Values.some(v => sizePatterns.test(v.trim()));
    const option2IsSize = option2Values.some(v => sizePatterns.test(v.trim()));
    
    // Determine which is color and which is size
    // If option1 looks like sizes, swap them. Otherwise keep original order.
    const colorsAreFirst = !option1IsSize || (option1IsSize && option2IsSize);
    
    return {
      colors: colorsAreFirst ? option1Values : option2Values,
      sizes: colorsAreFirst ? option2Values : option1Values,
      hasMultipleOptions: option1Set.size > 0 && option2Set.size > 0,
      colorToVariantId: colorsAreFirst ? option1VariantMap : new Map(
        // Rebuild map with option2 (color) values
        variants
          .filter(v => v.title.includes(' / '))
          .reduce((map, v) => {
            const color = v.title.split(' / ')[1];
            if (!map.has(color)) map.set(color, v.id);
            return map;
          }, new Map<string, number>())
      )
    };
  })();

  // Filter images based on selected color's variant ID
  const filteredImages = (() => {
    if (!product?.images || !selectedColor || !hasMultipleOptions) {
      return product?.images || [];
    }
    
    const variantId = colorToVariantId.get(selectedColor);
    if (!variantId) return product.images;
    
    // Filter images that contain this variant ID in the URL path
    const matchingImages = product.images.filter((img: string) => 
      img.includes(`/${variantId}/`)
    );
    
    // Return filtered images, or all images if no matches found
    return matchingImages.length > 0 ? matchingImages : product.images;
  })();

  // Build the effective variant from selections
  const effectiveVariant = (() => {
    if (variants.length === 1) return variants[0].title;
    if (hasMultipleOptions && selectedColor && selectedSize) {
      return `${selectedColor} / ${selectedSize}`;
    }
    return "";
  })();

  const addToCart = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to add items to cart",
        variant: "destructive"
      });
      return;
    }

    // For Printify products with multiple variants, we need a variant selection
    if (product?.is_printify_product && variants.length > 1 && !effectiveVariant) {
      toast({
        title: "Select options",
        description: "Please select color and size before adding to cart",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('shopping_cart')
      .upsert({
        user_id: user.id,
        product_id: product?.id,
        quantity: quantity,
        variant_info: effectiveVariant ? { variant: effectiveVariant, variantId: variants.find(v => v.title === effectiveVariant)?.id } : null
      }, {
        onConflict: 'user_id,product_id',
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
            onClick={() => navigate('/marketplace')}
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

              {/* Variant Selection - separate Color and Size dropdowns */}
              {product.is_printify_product && variants.length > 1 && hasMultipleOptions && (
                <div className="space-y-4">
                  {/* Color Selection */}
                  {colors.length > 1 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Color</label>
                      <Select value={selectedColor} onValueChange={setSelectedColor}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose color..." />
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

                  {/* Size Selection */}
                  {sizes.length > 1 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Size</label>
                      <Select value={selectedSize} onValueChange={setSelectedSize}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose size..." />
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
      <Footer />
    </div>
  );
};

export default ProductDetail;
