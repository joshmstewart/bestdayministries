import { useState } from "react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ProductGrid } from "@/components/marketplace/ProductGrid";
import { ProductSection } from "@/components/marketplace/ProductSection";
import { UnifiedCartSheet } from "@/components/marketplace/UnifiedCartSheet";
import { FloatingCartButton } from "@/components/marketplace/FloatingCartButton";
import { useShopifyCartStore } from "@/stores/shopifyCartStore";
import { useCartSession } from "@/hooks/useCartSession";

const Marketplace = () => {
  const navigate = useNavigate();
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const shopifyCartItems = useShopifyCartStore(state => state.getTotalItems);
  const { getCartFilter, isAuthenticated, isLoading: cartSessionLoading } = useCartSession();

  // Check which categories have products and get sample images
  const { data: categoryStatus } = useQuery({
    queryKey: ['category-status-with-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          images,
          default_image_index,
          is_printify_product,
          vendor_id,
          vendor:vendors(is_house_vendor)
        `)
        .eq('is_active', true);

      if (error) throw error;
      
      const merchProducts = data?.filter(p => 
        p.is_printify_product === true || 
        (p.vendor as any)?.is_house_vendor === true
      ) || [];
      
      const handmadeProducts = data?.filter(p => 
        p.vendor_id !== null && 
        (p.vendor as any)?.is_house_vendor !== true
      ) || [];
      
      // Get first image from up to 3 products per category
      const getProductImages = (products: typeof data) => {
        return products?.slice(0, 3).map(p => {
          const images = p.images as string[] | null;
          const defaultIndex = p.default_image_index || 0;
          return images?.[defaultIndex] || images?.[0] || null;
        }).filter(Boolean) || [];
      };
      
      return { 
        hasMerch: merchProducts.length > 0, 
        hasHandmade: handmadeProducts.length > 0,
        merchImages: getProductImages(merchProducts),
        handmadeImages: getProductImages(handmadeProducts),
        allImages: getProductImages(data?.slice(0, 3) || [])
      };
    }
  });

  const activeCategoryCount = (categoryStatus?.hasMerch ? 1 : 0) + (categoryStatus?.hasHandmade ? 1 : 0);

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

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      
      <main className="flex-1 pt-14">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 py-16">
          <div className="container mx-auto px-4">
            {/* Become a Vendor link - upper right */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => navigate(isAuthenticated ? '/vendor-dashboard' : '/vendor-auth')}
                className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
              >
                Become a Vendor
              </button>
            </div>
            
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <h1 className="font-heading text-4xl md:text-6xl font-bold text-foreground">
                Joy House Store
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Every purchase supports adults with special needs and their caregivers. Shop handmade treasures crafted by our community artisans, plus official Joy House and Best Day Ever merchandise.
              </p>
              
              {/* Mission callout */}
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 max-w-2xl mx-auto mt-8">
                <h2 className="font-heading text-lg font-semibold text-primary mb-2">More Than a Store</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Joy House Store is where creativity meets community. Our artisans—adults with special needs—pour their hearts into each handcrafted item. When you shop here, you're not just buying a product; you're investing in someone's dignity, independence, and joy. A portion of every sale goes directly back to support our programs and the people who make them special.
                </p>
              </div>
              
              <div className="flex gap-4 justify-center flex-wrap">
                <Button 
                  size="lg"
                  onClick={() => setCartOpen(true)}
                  className="relative"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  View Cart
                  {totalCartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {totalCartCount}
                    </span>
                  )}
                </Button>
                
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/orders')}
                >
                  <Package className="mr-2 h-5 w-5" />
                  Order History
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Products Section */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <Tabs defaultValue="all" className="w-full">
              {activeCategoryCount > 1 && (
                <TabsList className="inline-flex flex-wrap h-auto mx-auto mb-8 gap-2">
                  <TabsTrigger value="all" onClick={() => setSelectedCategory(null)} className="whitespace-nowrap flex items-center gap-2 px-4">
                    {categoryStatus?.allImages && categoryStatus.allImages.length > 0 && (
                      <div className="flex -space-x-2">
                        {categoryStatus.allImages.slice(0, 3).map((img, i) => (
                          <img key={i} src={img} alt="" className="w-6 h-6 rounded-full object-cover border-2 border-background" />
                        ))}
                      </div>
                    )}
                    All Products
                  </TabsTrigger>
                  <TabsTrigger value="handmade" onClick={() => setSelectedCategory('handmade')} className="flex items-center gap-2 px-4">
                    {categoryStatus?.handmadeImages && categoryStatus.handmadeImages.length > 0 && (
                      <div className="flex -space-x-2">
                        {categoryStatus.handmadeImages.slice(0, 3).map((img, i) => (
                          <img key={i} src={img} alt="" className="w-6 h-6 rounded-full object-cover border-2 border-background" />
                        ))}
                      </div>
                    )}
                    Artisan-Made
                  </TabsTrigger>
                  <TabsTrigger value="merch" onClick={() => setSelectedCategory('merch')} className="whitespace-nowrap flex items-center gap-2 px-4">
                    {categoryStatus?.merchImages && categoryStatus.merchImages.length > 0 && (
                      <div className="flex -space-x-2">
                        {categoryStatus.merchImages.slice(0, 3).map((img, i) => (
                          <img key={i} src={img} alt="" className="w-6 h-6 rounded-full object-cover border-2 border-background" />
                        ))}
                      </div>
                    )}
                    Official Merch
                  </TabsTrigger>
                </TabsList>
              )}
              
              <TabsContent value="all">
                <div className="space-y-12">
                  <ProductSection category="handmade" title="By Our Artisans" />
                  <ProductSection category="merch" title="Official Merch" />
                </div>
              </TabsContent>
              
              <TabsContent value="merch">
                <ProductGrid category="merch" />
              </TabsContent>
              
              <TabsContent value="handmade">
                <ProductGrid category="handmade" />
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>

      <FloatingCartButton cartCount={totalCartCount} onClick={() => setCartOpen(true)} />
      <UnifiedCartSheet open={cartOpen} onOpenChange={setCartOpen} />
      <Footer />
    </div>
  );
};

export default Marketplace;
