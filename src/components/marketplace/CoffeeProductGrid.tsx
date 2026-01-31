import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CoffeeProductCard } from "./CoffeeProductCard";
import { Skeleton } from "@/components/ui/skeleton";

interface CoffeeProductGridProps {
  sortBy?: string;
  searchQuery?: string;
}

export const CoffeeProductGrid = ({ sortBy = "newest", searchQuery = "" }: CoffeeProductGridProps) => {
  const { data: products, isLoading } = useQuery({
    queryKey: ['coffee-products', sortBy, searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coffee_products')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      let filteredProducts = data || [];
      
      // Apply search filter
      if (searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase().trim();
        filteredProducts = filteredProducts.filter(p => 
          p.name?.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower)
        );
      }
      
      // Sort products
      const sortedProducts = [...filteredProducts].sort((a, b) => {
        switch (sortBy) {
          case 'newest':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'oldest':
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case 'price-low':
            return (a.selling_price || 0) - (b.selling_price || 0);
          case 'price-high':
            return (b.selling_price || 0) - (a.selling_price || 0);
          case 'name-az':
            return (a.name || '').localeCompare(b.name || '');
          case 'name-za':
            return (b.name || '').localeCompare(a.name || '');
          default:
            return (a.display_order || 0) - (b.display_order || 0);
        }
      });
      
      return sortedProducts;
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
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
        <p className="text-muted-foreground text-lg">No coffee products found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <CoffeeProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
