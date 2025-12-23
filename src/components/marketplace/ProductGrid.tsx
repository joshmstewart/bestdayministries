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
      let query = supabase
        .from('products')
        .select(`
          *,
          vendor:vendors(business_name, user_id)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (category === 'merch') {
        // Show Printify products (vendor_id is null AND is_printify_product is true)
        query = query.is('vendor_id', null).eq('is_printify_product', true);
      } else if (category === 'handmade') {
        // Show vendor products (has vendor_id)
        query = query.not('vendor_id', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;
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
