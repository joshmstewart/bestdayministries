import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

// Map color names to CSS colors
const colorNameToCSS: Record<string, string> = {
  'white': '#FFFFFF',
  'black': '#000000',
  'red': '#EF4444',
  'blue': '#3B82F6',
  'navy': '#1E3A5A',
  'navy blue': '#1E3A5A',
  'green': '#22C55E',
  'yellow': '#EAB308',
  'orange': '#F97316',
  'purple': '#A855F7',
  'pink': '#EC4899',
  'light pink': '#F9A8D4',
  'gray': '#6B7280',
  'grey': '#6B7280',
  'light gray': '#D1D5DB',
  'light grey': '#D1D5DB',
  'dark gray': '#374151',
  'dark grey': '#374151',
  'sport grey': '#9CA3AF',
  'sport gray': '#9CA3AF',
  'heather gray': '#9CA3AF',
  'heather grey': '#9CA3AF',
  'charcoal': '#374151',
  'brown': '#92400E',
  'tan': '#D2B48C',
  'beige': '#F5F5DC',
  'cream': '#FFFDD0',
  'natural': '#FAF0E6',
  'sand': '#C2B280',
  'maroon': '#7F1D1D',
  'burgundy': '#800020',
  'forest green': '#166534',
  'olive': '#808000',
  'teal': '#14B8A6',
  'turquoise': '#40E0D0',
  'light blue': '#93C5FD',
  'sky blue': '#7DD3FC',
  'royal blue': '#1D4ED8',
  'ash': '#B2BEB5',
  'gold': '#FFD700',
  'silver': '#C0C0C0',
  'coral': '#FF7F50',
  'salmon': '#FA8072',
  'mint': '#98FF98',
  'lavender': '#E6E6FA',
  'violet': '#8B5CF6',
  'indigo': '#4F46E5',
  'cyan': '#06B6D4',
  'aqua': '#00FFFF',
  'magenta': '#FF00FF',
  'rose': '#F43F5E',
  'slate': '#64748B',
  'stone': '#78716C',
  'zinc': '#71717A',
};

const getColorCSS = (colorName: string): string => {
  const lower = colorName.toLowerCase().trim();
  if (colorNameToCSS[lower]) return colorNameToCSS[lower];
  
  // Try partial matches
  for (const [name, css] of Object.entries(colorNameToCSS)) {
    if (lower.includes(name) || name.includes(lower)) return css;
  }
  
  // Fallback to a neutral gray
  return '#9CA3AF';
};

interface ProductCardProps {
  product: any;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

    const { error } = await supabase
      .from('shopping_cart')
      .upsert({
        user_id: user.id,
        product_id: product.id,
        quantity: 1
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
      description: `${product.name} has been added to your cart`
    });
  };

  const defaultIndex = product.default_image_index || 0;
  const imageUrl = product.images && product.images.length > 0 
    ? product.images[Math.min(defaultIndex, product.images.length - 1)] 
    : '/placeholder.svg';

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => navigate(`/store/product/${product.id}`)}>
      <CardContent className="p-4">
        <div className="aspect-square relative overflow-hidden rounded-lg mb-4">
          <img 
            src={imageUrl}
            alt={product.name}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
          {product.printify_variant_ids && (() => {
            // Extract unique colors from variant titles (keys are "Size / Color" or "Color / Size")
            const variantTitles = Object.keys(product.printify_variant_ids as Record<string, any>);
            const colors = new Set<string>();
            const sizePatterns = /^(xs|s|m|l|xl|xxl|2xl|3xl|4xl|5xl|6xl|one size|\d+oz|\d+″|\d+x\d+|\d+)$/i;
            
            variantTitles.forEach((title: string) => {
              const parts = title.split(' / ');
              if (parts.length >= 2) {
                const colorPart = sizePatterns.test(parts[0].trim()) ? parts[1] : parts[0];
                if (colorPart) colors.add(colorPart.trim());
              }
            });
            
            const colorArray = Array.from(colors);
            if (colorArray.length <= 1) return null;
            
            return (
              <div className="absolute top-2 right-2 flex flex-wrap gap-1 max-w-[120px] justify-end">
                {colorArray.slice(0, 6).map((color) => (
                  <div
                    key={color}
                    className="w-5 h-5 rounded-full border-2 border-background shadow-sm"
                    style={{ backgroundColor: getColorCSS(color) }}
                    title={color}
                  />
                ))}
                {colorArray.length > 6 && (
                  <div className="w-5 h-5 rounded-full bg-muted border-2 border-background shadow-sm flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                    +{colorArray.length - 6}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        <h3 className="font-semibold text-lg mb-2 line-clamp-2">
          {product.name}
        </h3>

        {product.vendor && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/vendors/${product.vendor_id}`);
            }}
            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 mb-2 group"
          >
            <Store className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
            by {product.vendor.business_name}
          </button>
        )}

        <p className="text-2xl font-bold text-primary">
          ${Number(product.price).toFixed(2)}
        </p>

        {product.inventory_count <= 5 && product.inventory_count > 0 && (
          <p className="text-sm text-amber-600 mt-2">
            Only {product.inventory_count} left!
          </p>
        )}

        {product.inventory_count === 0 && (
          <Badge variant="destructive" className="mt-2">
            Out of Stock
          </Badge>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full" 
          onClick={(e) => {
            e.stopPropagation();
            // For Printify products with variants, navigate to detail page
            if (product.is_printify_product && product.printify_variant_ids && Object.keys(product.printify_variant_ids).length > 0) {
              navigate(`/store/product/${product.id}`);
            } else {
              addToCart();
            }
          }}
          disabled={product.inventory_count === 0}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {product.is_printify_product && product.printify_variant_ids && Object.keys(product.printify_variant_ids).length > 0 
            ? 'Select Options' 
            : 'Add to Cart'}
        </Button>
      </CardFooter>
    </Card>
  );
};
