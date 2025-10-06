import { useState } from "react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Store, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ProductGrid } from "@/components/marketplace/ProductGrid";
import { ShoppingCartSheet } from "@/components/marketplace/ShoppingCartSheet";

const Marketplace = () => {
  const navigate = useNavigate();
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      
      <main className="flex-1 pt-14">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <h1 className="font-heading text-4xl md:text-6xl font-bold text-foreground">
                Best Day Ever Marketplace
              </h1>
              <p className="text-xl text-muted-foreground">
                Shop handmade items from our community and official Best Day Ever merch
              </p>
              
              <div className="flex gap-4 justify-center flex-wrap">
                <Button 
                  size="lg"
                  onClick={() => setCartOpen(true)}
                  className="relative"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Cart
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {cartCount}
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
                
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/vendor-dashboard')}
                >
                  <Store className="mr-2 h-5 w-5" />
                  Become a Vendor
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Products Section */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
                <TabsTrigger value="all" onClick={() => setSelectedCategory(null)}>
                  All Products
                </TabsTrigger>
                <TabsTrigger value="merch" onClick={() => setSelectedCategory('merch')}>
                  Official Merch
                </TabsTrigger>
                <TabsTrigger value="handmade" onClick={() => setSelectedCategory('handmade')}>
                  Handmade
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                <ProductGrid category={selectedCategory} />
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

      <ShoppingCartSheet open={cartOpen} onOpenChange={setCartOpen} />
      <Footer />
    </div>
  );
};

export default Marketplace;
