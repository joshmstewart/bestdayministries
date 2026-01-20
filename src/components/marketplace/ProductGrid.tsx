import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "./ProductCard";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductGridProps {
  category?: string | null;
  sortBy?: string;
  searchQuery?: string;
  categoryFilters?: string[];
}

export const ProductGrid = ({ category, sortBy = "newest", searchQuery = "", categoryFilters = [] }: ProductGridProps) => {
  const { data: products, isLoading } = useQuery({
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
      
      // Get view counts for popularity sorting
      let viewCountsMap: Record<string, number> = {};
      if (sortBy === 'popular') {
        const productIds = vendorReadyProducts.map(p => p.id);
        if (productIds.length > 0) {
          const { data: viewData } = await supabase
            .from('product_views')
            .select('product_id')
            .in('product_id', productIds);
          
          // Count views per product
          viewData?.forEach(view => {
            viewCountsMap[view.product_id] = (viewCountsMap[view.product_id] || 0) + 1;
          });
        }
      }
      
      // Sort products based on sortBy option
      const sortedProducts = [...vendorReadyProducts].sort((a, b) => {
        switch (sortBy) {
          case 'popular':
            return (viewCountsMap[b.id] || 0) - (viewCountsMap[a.id] || 0);
          case 'newest':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'oldest':
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case 'price-low':
            return (a.price || 0) - (b.price || 0);
          case 'price-high':
            return (b.price || 0) - (a.price || 0);
          case 'name-az':
            return (a.name || '').localeCompare(b.name || '');
          case 'name-za':
            return (b.name || '').localeCompare(a.name || '');
          default:
            return 0;
        }
      });
      
      return sortedProducts;
    }
  });

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

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No products found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
