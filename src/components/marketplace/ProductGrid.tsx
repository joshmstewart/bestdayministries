import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "./ProductCard";
import { CoffeeProductCard } from "./CoffeeProductCard";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductGridProps {
  category?: string | null;
  sortBy?: string;
  searchQuery?: string;
  categoryFilters?: string[];
}

// Type for unified product display
interface UnifiedProduct {
  id: string;
  name: string;
  price: number;
  created_at: string;
  type: 'regular' | 'coffee';
  data: any;
}

export const ProductGrid = ({ category, sortBy = "newest", searchQuery = "", categoryFilters = [] }: ProductGridProps) => {
  // Fetch regular products
  const { data: regularProducts, isLoading: regularLoading } = useQuery({
    queryKey: ['products', category, sortBy, searchQuery, categoryFilters],
    queryFn: async () => {
      const query = supabase
        .from('products')
        .select(`
          *,
          vendor:vendors(business_name, user_id, is_house_vendor, stripe_charges_enabled)
        `)
        .eq('is_active', true);

      const { data, error } = await query;
      if (error) throw error;
      
      // Filter out products from vendors who haven't completed Stripe setup
      // House vendors and Printify products don't need Stripe Connect
      let vendorReadyProducts = data?.filter(p => {
        const vendor = p.vendor as any;
        if (!vendor) return false;
        // House vendors don't need Stripe Connect (platform handles payments)
        if (vendor.is_house_vendor) return true;
        // Printify products are fulfilled by platform
        if (p.is_printify_product) return true;
        // Regular vendors must have Stripe enabled
        return vendor.stripe_charges_enabled === true;
      }) || [];
      
      // Filter based on category tab (merch vs handmade)
      if (category === 'merch') {
        vendorReadyProducts = vendorReadyProducts.filter(p => 
          p.is_printify_product === true || 
          (p.vendor as any)?.is_house_vendor === true
        );
      } else if (category === 'handmade') {
        vendorReadyProducts = vendorReadyProducts.filter(p => 
          p.vendor_id !== null && 
          (p.vendor as any)?.is_house_vendor !== true
        );
      }
      
      // Apply search filter (name and tags)
      if (searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase().trim();
        vendorReadyProducts = vendorReadyProducts.filter(p => {
          const nameMatch = p.name?.toLowerCase().includes(searchLower);
          const tagsArray = p.tags as string[] | null;
          const tagsMatch = tagsArray?.some(tag => tag?.toLowerCase().includes(searchLower));
          return nameMatch || tagsMatch;
        });
      }
      
      // Apply category filters (product category, not tab category)
      if (categoryFilters.length > 0) {
        vendorReadyProducts = vendorReadyProducts.filter(p => {
          const productCategory = p.category?.trim();
          return productCategory && categoryFilters.includes(productCategory);
        });
      }
      
      return vendorReadyProducts;
    }
  });

  // Fetch coffee products only when showing All Products (category is null)
  const { data: coffeeProducts, isLoading: coffeeLoading } = useQuery({
    queryKey: ['coffee-products-for-all', searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coffee_products')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      
      let filtered = data || [];
      
      // Apply search filter
      if (searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(p => 
          p.name?.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower)
        );
      }
      
      return filtered;
    },
    enabled: category === null // Only fetch when showing All Products
  });

  const isLoading = regularLoading || (category === null && coffeeLoading);

  // Combine and sort products
  const combinedProducts = (() => {
    const unified: UnifiedProduct[] = [];
    
    // Add regular products
    regularProducts?.forEach(p => {
      unified.push({
        id: p.id,
        name: p.name || '',
        price: p.price || 0,
        created_at: p.created_at,
        type: 'regular',
        data: p
      });
    });
    
    // Add coffee products only for All Products tab
    if (category === null && coffeeProducts) {
      coffeeProducts.forEach(p => {
        unified.push({
          id: p.id,
          name: p.name || '',
          price: p.selling_price || 0,
          created_at: p.created_at,
          type: 'coffee',
          data: p
        });
      });
    }
    
    // Sort combined products
    return unified.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name-az':
          return a.name.localeCompare(b.name);
        case 'name-za':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });
  })();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (combinedProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No products found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {combinedProducts.map((product) => (
        product.type === 'coffee' 
          ? <CoffeeProductCard key={`coffee-${product.id}`} product={product.data} />
          : <ProductCard key={product.id} product={product.data} />
      ))}
    </div>
  );
};
