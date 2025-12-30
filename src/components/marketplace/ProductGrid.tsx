import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "./ProductCard";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductGridProps {
  category?: string | null;
}

export const ProductGrid = ({ category }: ProductGridProps) => {
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', category],
    queryFn: async () => {
      const query = supabase
        .from('products')
        .select(`
          *,
          vendor:vendors(business_name, user_id, is_house_vendor)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      
      // Filter based on category
      if (category === 'merch') {
        // Show Printify products OR products from house vendor
        return data?.filter(p => 
          p.is_printify_product === true || 
          (p.vendor as any)?.is_house_vendor === true
        ) || [];
      } else if (category === 'handmade') {
        // Show vendor products that are NOT from house vendor
        return data?.filter(p => 
          p.vendor_id !== null && 
          (p.vendor as any)?.is_house_vendor !== true
        ) || [];
      }
      
      return data;
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
