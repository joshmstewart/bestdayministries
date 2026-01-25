import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, TrendingUp, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VendorThemePreset } from "@/lib/vendorThemePresets";

interface CartInsightsProps {
  vendorId: string;
  theme?: VendorThemePreset;
}

interface ProductCartData {
  productId: string;
  productName: string;
  imageUrl: string | null;
  totalQuantity: number;
  cartCount: number;
}

export const CartInsights = ({ vendorId, theme }: CartInsightsProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['vendor-cart-insights', vendorId],
    queryFn: async () => {
      // Get all products for this vendor
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, images, default_image_url')
        .eq('vendor_id', vendorId)
        .eq('is_active', true);

      if (productsError) throw productsError;
      if (!products || products.length === 0) {
        return { totalItems: 0, totalCarts: 0, productData: [] };
      }

      const productIds = products.map(p => p.id);

      // Get cart items for these products
      const { data: cartItems, error: cartError } = await supabase
        .from('shopping_cart')
        .select('product_id, quantity, user_id, session_id')
        .in('product_id', productIds);

      if (cartError) throw cartError;

      // Aggregate data
      const productMap = new Map<string, { quantity: number; carts: Set<string> }>();
      
      cartItems?.forEach(item => {
        const cartKey = item.user_id || item.session_id || 'unknown';
        const existing = productMap.get(item.product_id) || { quantity: 0, carts: new Set() };
        existing.quantity += item.quantity;
        existing.carts.add(cartKey);
        productMap.set(item.product_id, existing);
      });

      // Build product data with names
      const productData: ProductCartData[] = [];
      let totalItems = 0;
      const allCarts = new Set<string>();

      products.forEach(product => {
        const stats = productMap.get(product.id);
        if (stats && stats.quantity > 0) {
          const images = product.images as string[] | null;
          productData.push({
            productId: product.id,
            productName: product.name,
            imageUrl: (product as any).default_image_url || images?.[0] || null,
            totalQuantity: stats.quantity,
            cartCount: stats.carts.size
          });
          totalItems += stats.quantity;
          stats.carts.forEach(c => allCarts.add(c));
        }
      });

      // Sort by quantity descending
      productData.sort((a, b) => b.totalQuantity - a.totalQuantity);

      return {
        totalItems,
        totalCarts: allCarts.size,
        productData
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const { totalItems = 0, totalCarts = 0, productData = [] } = data || {};

  return (
    <Card 
      className="border-2"
      style={theme ? { 
        backgroundColor: theme.cardBg,
        borderColor: theme.cardBorder,
        boxShadow: theme.cardGlow
      } : undefined}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" style={theme ? { color: theme.accent } : undefined} />
          Cart Insights
        </CardTitle>
        <CardDescription>
          See how many of your items are in customer carts right now
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-primary" style={theme ? { color: theme.accent } : undefined}>{totalItems}</div>
            <div className="text-sm text-muted-foreground">Items in Carts</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-primary" style={theme ? { color: theme.accent } : undefined}>{totalCarts}</div>
            <div className="text-sm text-muted-foreground">Active Carts</div>
          </div>
        </div>

        {/* Per-Product Breakdown */}
        {productData.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              By Product
            </h4>
            <ScrollArea className="h-48">
              <div className="space-y-2 pr-4">
                {productData.map((product) => (
                  <div 
                    key={product.productId} 
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.productName}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.cartCount} cart{product.cartCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-semibold">{product.totalQuantity}</span>
                      <span className="text-xs text-muted-foreground ml-1">qty</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No items in customer carts yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
