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
              <p className="text-xl text-muted-foreground">
                Shop handmade items from our community, plus official Joy House and Best Day Ever merch
              </p>
              
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
              <TabsList className="inline-flex flex-wrap h-auto mx-auto mb-8">
                <TabsTrigger value="all" onClick={() => setSelectedCategory(null)} className="whitespace-nowrap">
                  All Products
                </TabsTrigger>
                <TabsTrigger value="handmade" onClick={() => setSelectedCategory('handmade')}>
                  Artisan-Made
                </TabsTrigger>
                <TabsTrigger value="merch" onClick={() => setSelectedCategory('merch')} className="whitespace-nowrap">
                  Official Merch
                </TabsTrigger>
              </TabsList>
              
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
