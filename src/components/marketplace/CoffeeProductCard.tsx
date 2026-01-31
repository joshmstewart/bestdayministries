import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Coffee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useCartSession } from "@/hooks/useCartSession";

interface CoffeeProduct {
  id: string;
  name: string;
  description: string | null;
  selling_price: number;
  images: string[] | null;
  is_active: boolean;
}

interface CoffeeProductTier {
  id: string;
  min_quantity: number;
  price_per_unit: number;
}

interface CoffeeProductCardProps {
  product: CoffeeProduct;
}

export const CoffeeProductCard = ({ product }: CoffeeProductCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { getCartInsertData, isLoading: cartSessionLoading } = useCartSession();

  // Fetch tiers for this product
  const { data: tiers } = useQuery({
    queryKey: ['coffee-product-tiers', product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coffee_product_tiers')
        .select('*')
        .eq('product_id', product.id)
        .order('min_quantity', { ascending: true });
      
      if (error) throw error;
      return data as CoffeeProductTier[];
    }
  });

  const addToCart = async () => {
    if (cartSessionLoading) return;
    
    // For now, we'll navigate to a detail page (or show a message)
    // Coffee products need special handling for quantity-based pricing
    toast({
      title: "Coming Soon",
      description: "Coffee ordering will be available soon!",
    });
  };

  const imageUrl = product.images && product.images.length > 0 
    ? product.images[0] 
    : '/placeholder.svg';

  // Get the lowest tier price for display
  const lowestTierPrice = tiers && tiers.length > 0 
    ? Math.min(...tiers.map(t => t.price_per_unit))
    : null;

  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-full flex flex-col border-2"
      onClick={() => navigate(`/store/coffee/${product.id}`)}
    >
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="aspect-square relative overflow-hidden rounded-lg mb-4">
          <img 
            src={imageUrl}
            alt={product.name}
            className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-300 bg-muted/20"
          />
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="gap-1">
              <Coffee className="h-3 w-3" />
              Coffee
            </Badge>
          </div>
        </div>

        <h3 className="font-semibold text-lg mb-2 line-clamp-2">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="mt-auto">
          <p className="text-2xl font-bold text-primary">
            ${Number(product.selling_price).toFixed(2)}
          </p>
          
          {lowestTierPrice && lowestTierPrice < product.selling_price && (
            <p className="text-sm text-primary/80">
              As low as ${lowestTierPrice.toFixed(2)} with bulk pricing
            </p>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/store/coffee/${product.id}`);
          }}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
};
