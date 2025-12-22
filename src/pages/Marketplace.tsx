import { useState, useEffect } from "react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Store, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ProductGrid } from "@/components/marketplace/ProductGrid";
import { ShopifyProductGrid } from "@/components/marketplace/ShopifyProductGrid";
import { UnifiedCartSheet } from "@/components/marketplace/UnifiedCartSheet";
import { useShopifyCartStore } from "@/stores/shopifyCartStore";

const Marketplace = () => {
  const navigate = useNavigate();
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const shopifyCartItems = useShopifyCartStore(state => state.getTotalItems);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  // Fetch cart count
  const { data: cartCount } = useQuery({
    queryKey: ['cart-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      
      const { data, error } = await supabase
        .from('shopping_cart')
        .select('quantity')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    }
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
                JoyHouse Store
              </h1>
              <p className="text-xl text-muted-foreground">
                Shop official JoyHouse and Best Day Ever merch, plus handmade items from our community
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
                <TabsTrigger value="merch" onClick={() => setSelectedCategory('merch')} className="whitespace-nowrap">
                  Official Merch
                </TabsTrigger>
                <TabsTrigger value="handmade" onClick={() => setSelectedCategory('handmade')}>
                  Handmade
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                <div className="space-y-12">
                  <div>
                    <h2 className="text-2xl font-semibold mb-6">Official Merch</h2>
                    <ShopifyProductGrid />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold mb-6">Handmade by Community</h2>
                    <ProductGrid category="handmade" />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="merch">
                <ShopifyProductGrid />
              </TabsContent>
              
              <TabsContent value="handmade">
                <ProductGrid category="handmade" />
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>

      <UnifiedCartSheet open={cartOpen} onOpenChange={setCartOpen} />
      <Footer />
    </div>
  );
};

export default Marketplace;
