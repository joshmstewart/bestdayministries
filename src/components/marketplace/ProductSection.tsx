import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductGrid } from "./ProductGrid";

interface ProductSectionProps {
  category: string;
  title: string;
}

export const ProductSection = ({ category, title }: ProductSectionProps) => {
  // Check if there are any products in this category
  const { data: hasProducts, isLoading } = useQuery({
    queryKey: ['products-count', category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          is_printify_product,
          vendor_id,
          vendor:vendors(is_house_vendor)
        `)
        .eq('is_active', true);

      if (error) throw error;
      
      // Filter based on category
      if (category === 'merch') {
        const filtered = data?.filter(p => 
          p.is_printify_product === true || 
          (p.vendor as any)?.is_house_vendor === true
        ) || [];
        return filtered.length > 0;
      } else if (category === 'handmade') {
        const filtered = data?.filter(p => 
          p.vendor_id !== null && 
          (p.vendor as any)?.is_house_vendor !== true
        ) || [];
        return filtered.length > 0;
      }
      
      return (data?.length || 0) > 0;
    }
  });

  // Don't render anything if loading or no products
  if (isLoading || !hasProducts) {
    return null;
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">{title}</h2>
      <ProductGrid category={category} />
    </div>
  );
};
