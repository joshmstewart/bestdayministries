import { useQuery } from "@tanstack/react-query";
import { fetchShopifyProducts } from "@/lib/shopify";
import { ShopifyProductCard } from "./ShopifyProductCard";
import { Skeleton } from "@/components/ui/skeleton";

export const ShopifyProductGrid = () => {
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['shopify-products'],
    queryFn: () => fetchShopifyProducts(50),
    staleTime: 1000 * 60 * 5, // 5 minutes
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

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">Failed to load products</p>
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
        <ShopifyProductCard key={product.node.id} product={product} />
      ))}
    </div>
  );
};
