import { useState } from "react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Package, Store, Lock, ArrowUpDown, Filter, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ProductGrid } from "@/components/marketplace/ProductGrid";
import { ProductSection } from "@/components/marketplace/ProductSection";
import { CoffeeProductGrid } from "@/components/marketplace/CoffeeProductGrid";
import { UnifiedCartSheet } from "@/components/marketplace/UnifiedCartSheet";
import { FloatingCartButton } from "@/components/marketplace/FloatingCartButton";
import { useShopifyCartStore } from "@/stores/shopifyCartStore";
import { useCartSession } from "@/hooks/useCartSession";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Marketplace = () => {
  const navigate = useNavigate();
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);

  // Fetch available categories
  const { data: availableCategories } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .eq('is_active', true)
        .not('category', 'is', null);
      
      if (error) throw error;
      
      // Get unique categories and trim whitespace
      const uniqueCategories = [...new Set(data?.map(p => p.category?.trim()).filter(Boolean))] as string[];
      return uniqueCategories.sort();
    }
  });

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const clearCategoryFilters = () => {
    setSelectedCategories([]);
  };
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
      const [productsRes, coffeeRes] = await Promise.all([
        supabase
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
          .eq('is_active', true),
        supabase
          .from('coffee_products')
          .select('id')
          .eq('is_active', true)
          .limit(1)
      ]);

      if (productsRes.error) throw productsRes.error;
      const data = productsRes.data;
      
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
        hasCoffee: (coffeeRes.data?.length || 0) > 0,
        merchImages: getProductImages(merchProducts),
        handmadeImages: getProductImages(handmadeProducts),
        allImages: getProductImages(data?.slice(0, 3) || [])
      };
    }
  });

  const activeCategoryCount = (categoryStatus?.hasMerch ? 1 : 0) + (categoryStatus?.hasHandmade ? 1 : 0) + (categoryStatus?.hasCoffee ? 1 : 0);

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
        {/* Hero Section - Compact */}
        <section className="bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 py-6">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Title and tagline */}
              <div className="flex-1">
                <div className="flex items-center gap-4 flex-wrap">
                  <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
                    Joy House Store
                  </h1>
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    A joyful gift shop celebrating ability, belonging, and purpose
                  </span>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <Button 
                  onClick={() => setCartOpen(true)}
                  className="relative"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Cart
                  {totalCartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-accent text-accent-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                      {totalCartCount}
                    </span>
                  )}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => navigate('/orders')}
                >
                  <Package className="mr-2 h-4 w-4" />
                  Orders
                </Button>
                
                {isVendor ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/vendor-dashboard')}
                    className="text-primary"
                  >
                    <Store className="h-4 w-4 mr-1" />
                    Dashboard
                  </Button>
                ) : (
                  <button
                    onClick={() => navigate(isAuthenticated ? '/vendor-dashboard' : '/vendor-auth')}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
                  >
                    Become a Vendor
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Products Section */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <Tabs defaultValue="all" className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                {activeCategoryCount > 1 && (
                  <TabsList className="inline-flex flex-wrap h-auto gap-2 bg-muted/50 p-1.5 rounded-lg">
                    <TabsTrigger 
                      value="all" 
                      onClick={() => setSelectedCategory(null)} 
                      className="whitespace-nowrap px-6 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted"
                    >
                      All Products
                    </TabsTrigger>
                    {categoryStatus?.hasHandmade && (
                      <TabsTrigger 
                        value="handmade" 
                        onClick={() => setSelectedCategory('handmade')} 
                        className="whitespace-nowrap px-6 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted"
                      >
                        Artisan-Made
                      </TabsTrigger>
                    )}
                    {categoryStatus?.hasMerch && (
                      <TabsTrigger 
                        value="merch" 
                        onClick={() => setSelectedCategory('merch')} 
                        className="whitespace-nowrap px-6 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted"
                      >
                        Official Merch
                      </TabsTrigger>
                    )}
                    {categoryStatus?.hasCoffee && (
                      <TabsTrigger 
                        value="coffee" 
                        onClick={() => setSelectedCategory('coffee')} 
                        className="whitespace-nowrap px-6 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted"
                      >
                        Coffee
                      </TabsTrigger>
                    )}
                  </TabsList>
                )}
                
                {/* Search and Filter Controls */}
                <div className="flex items-center gap-2 sm:ml-auto">
                  {/* Search Popover */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="relative">
                        <Search className="h-4 w-4" />
                        {searchQuery && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3 bg-background border z-50" align="end">
                      <div className="space-y-2">
                        <span className="text-sm font-medium">Search Products</span>
                        <div className="relative">
                          <Input 
                            placeholder="Search by name or tags..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pr-8"
                          />
                          {searchQuery && (
                            <button 
                              onClick={() => setSearchQuery("")}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  {/* Category Multi-Select Popover */}
                  <Popover open={categoryFilterOpen} onOpenChange={setCategoryFilterOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="relative">
                        <Filter className="h-4 w-4" />
                        {selectedCategories.length > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
                            {selectedCategories.length}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3 bg-background border z-50" align="end">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b">
                          <span className="text-sm font-medium">Filter by Category</span>
                          {selectedCategories.length > 0 && (
                            <button 
                              onClick={clearCategoryFilters}
                              className="text-xs text-primary hover:underline"
                            >
                              Clear all
                            </button>
                          )}
                        </div>
                        {availableCategories?.map((category) => (
                          <label 
                            key={category} 
                            className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-muted cursor-pointer"
                          >
                            <Checkbox 
                              checked={selectedCategories.includes(category)}
                              onCheckedChange={() => toggleCategory(category)}
                            />
                            <span className="text-sm">{category}</span>
                          </label>
                        ))}
                        {(!availableCategories || availableCategories.length === 0) && (
                          <p className="text-sm text-muted-foreground py-2">No categories available</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  {/* Sort Select */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popular">Most Popular</SelectItem>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="name-az">Name: A to Z</SelectItem>
                      <SelectItem value="name-za">Name: Z to A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Selected Category Badges */}
              {selectedCategories.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-4 mb-2">
                  <span className="text-sm text-muted-foreground">Filtering:</span>
                  {selectedCategories.map((category) => (
                    <Badge 
                      key={category} 
                      variant="secondary" 
                      className="gap-1 cursor-pointer hover:bg-destructive/20"
                      onClick={() => toggleCategory(category)}
                    >
                      {category}
                      <X className="h-3 w-3" />
                    </Badge>
                  ))}
                  <button 
                    onClick={clearCategoryFilters}
                    className="text-xs text-primary hover:underline ml-2"
                  >
                    Clear all
                  </button>
                </div>
              )}
              
              <TabsContent value="all">
                <ProductGrid category={null} sortBy={sortBy} searchQuery={searchQuery} categoryFilters={selectedCategories} />
              </TabsContent>
              
              <TabsContent value="merch">
                <ProductGrid category="merch" sortBy={sortBy} searchQuery={searchQuery} categoryFilters={selectedCategories} />
              </TabsContent>
              
              <TabsContent value="handmade">
                <ProductGrid category="handmade" sortBy={sortBy} searchQuery={searchQuery} categoryFilters={selectedCategories} />
              </TabsContent>
              
              <TabsContent value="coffee">
                <CoffeeProductGrid sortBy={sortBy} searchQuery={searchQuery} />
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
