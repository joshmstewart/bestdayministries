import { useState } from "react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package, Store, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ProductGrid } from "@/components/marketplace/ProductGrid";
import { ProductSection } from "@/components/marketplace/ProductSection";
import { UnifiedCartSheet } from "@/components/marketplace/UnifiedCartSheet";
import { FloatingCartButton } from "@/components/marketplace/FloatingCartButton";
import { useShopifyCartStore } from "@/stores/shopifyCartStore";
import { useCartSession } from "@/hooks/useCartSession";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Marketplace = () => {
  const navigate = useNavigate();
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const shopifyCartItems = useShopifyCartStore(state => state.getTotalItems);
  const { getCartFilter, isAuthenticated, isLoading: cartSessionLoading } = useCartSession();

  // Check store access mode, stripe mode, and user role
  const { data: accessCheck, isLoading: accessLoading } = useQuery({
    queryKey: ['store-access-check'],
    queryFn: async () => {
      // Get access mode and stripe mode settings (via backend function so non-admins can read them)
      const { data: accessRows, error: settingsError } = await supabase.rpc(
        'get_marketplace_access_settings'
      );

      if (settingsError) throw settingsError;

      const accessRow = Array.isArray(accessRows) ? accessRows[0] : (accessRows as any);
      const accessMode = accessRow?.store_access_mode || 'open';
      const stripeMode = accessRow?.marketplace_stripe_mode || 'live';

      // Get current user and role
      const { data: { user } } = await supabase.auth.getUser();
      let userRole: string | null = null;
      
      if (user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        userRole = roleData?.role || null;
      }
      
      const isAdmin = userRole === 'admin' || userRole === 'owner';
      
      // Determine access - automatically restrict if stripe mode is "test"
      let hasAccess = true;
      let restrictionReason: 'test_mode' | 'admins_only' | 'authenticated' | null = null;
      
      if (stripeMode === 'test' && !isAdmin) {
        hasAccess = false;
        restrictionReason = 'test_mode';
      } else if (accessMode === 'admins_only' && !isAdmin) {
        hasAccess = false;
        restrictionReason = 'admins_only';
      } else if (accessMode === 'authenticated' && !user) {
        hasAccess = false;
        restrictionReason = 'authenticated';
      }
      
      return { hasAccess, accessMode, stripeMode, isAdmin, isAuthenticated: !!user, restrictionReason };
    }
  });

  // Check if user has vendor access (owned vendor OR accepted team member)
  const { data: vendorAccess } = useQuery({
    queryKey: ['vendor-access'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { hasAccess: false };

      const [{ data: owned }, { data: team }] = await Promise.all([
        supabase.from('vendors').select('id').eq('user_id', user.id).limit(1),
        supabase
          .from('vendor_team_members')
          .select('id')
          .eq('user_id', user.id)
          .not('accepted_at', 'is', null)
          .limit(1),
      ]);

      return { hasAccess: (owned?.length ?? 0) > 0 || (team?.length ?? 0) > 0 };
    },
    enabled: isAuthenticated,
  });

  const isVendor = !!vendorAccess?.hasAccess;

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
          default_image_url,
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
          // Use default_image_url if available
          return (p as any).default_image_url || images?.[defaultIndex] || images?.[0] || null;
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

  // Show loading state while checking access
  if (accessLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <UnifiedHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-muted" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show access denied message if user doesn't have access
  if (accessCheck && !accessCheck.hasAccess) {
    return (
      <div className="min-h-screen flex flex-col">
        <UnifiedHeader />
        <main className="flex-1 flex items-center justify-center mt-16 py-40">
          <Card className="max-w-md mx-4">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>Store Currently Unavailable</CardTitle>
              <CardDescription>
                {accessCheck.restrictionReason === 'test_mode'
                  ? "The store is temporarily down for maintenance. Please check back later."
                  : accessCheck.restrictionReason === 'admins_only' 
                    ? "The store is currently in maintenance mode. Please check back later."
                    : "Please sign in to access the store."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              {!accessCheck.isAuthenticated && (
                <Button onClick={() => navigate('/auth')}>
                  Sign In
                </Button>
              )}
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 py-16">
          <div className="container mx-auto px-4">
            {/* Vendor link - upper right */}
            <div className="flex justify-end mb-4">
              {isVendor ? (
                <button
                  onClick={() => navigate('/vendor-dashboard')}
                  className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  <Store className="h-4 w-4" />
                  Vendor Dashboard
                </button>
              ) : (
                <button
                  onClick={() => navigate(isAuthenticated ? '/vendor-dashboard' : '/vendor-auth')}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
                >
                  Become a Vendor
                </button>
              )}
            </div>
            
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <h1 className="font-heading text-4xl md:text-6xl font-bold text-foreground">
                Joy House Store
              </h1>
              
              {/* Mission callout */}
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 max-w-2xl mx-auto">
                <h2 className="font-heading text-lg font-semibold text-primary mb-2">More Than a Shop</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Joy House Store is a joyful gift shop where adults with special needs create and sell art and goods—celebrating ability, belonging, and purpose.
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
                <TabsList className="inline-flex flex-wrap h-auto mx-auto mb-8 gap-2 bg-muted/50 p-1.5 rounded-lg">
                  <TabsTrigger 
                    value="all" 
                    onClick={() => setSelectedCategory(null)} 
                    className="whitespace-nowrap px-6 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted"
                  >
                    All Products
                  </TabsTrigger>
                  <TabsTrigger 
                    value="handmade" 
                    onClick={() => setSelectedCategory('handmade')} 
                    className="whitespace-nowrap px-6 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted"
                  >
                    Artisan-Made
                  </TabsTrigger>
                  <TabsTrigger 
                    value="merch" 
                    onClick={() => setSelectedCategory('merch')} 
                    className="whitespace-nowrap px-6 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted"
                  >
                    Official Merch
                  </TabsTrigger>
                </TabsList>
              )}
              
              <TabsContent value="all">
                <ProductGrid category={null} />
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
