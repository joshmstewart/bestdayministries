import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface ProductCardProps {
  product: any;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addToCart = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to add items to cart",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('shopping_cart')
      .upsert({
        user_id: user.id,
        product_id: product.id,
        quantity: 1
      }, {
        onConflict: 'user_id,product_id',
        ignoreDuplicates: false
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive"
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['cart-count'] });
    queryClient.invalidateQueries({ queryKey: ['cart-items'] });

    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`
    });
  };

  const imageUrl = product.images && product.images.length > 0 
    ? product.images[0] 
    : '/placeholder.svg';

  return (
    <Card className="group hover:shadow-lg transition-all duration-300">
      <CardContent className="p-4">
        <div className="aspect-square relative overflow-hidden rounded-lg mb-4">
          <img 
            src={imageUrl}
            alt={product.name}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
          {product.is_printify && (
            <Badge className="absolute top-2 right-2" variant="secondary">
              <Package className="w-3 h-3 mr-1" />
              Print on Demand
            </Badge>
          )}
        </div>

        <h3 className="font-semibold text-lg mb-2 line-clamp-2">
          {product.name}
        </h3>

        {product.vendor && (
          <p className="text-sm text-muted-foreground mb-2">
            by {product.vendor.business_name}
          </p>
        )}

        <p className="text-2xl font-bold text-primary">
          ${parseFloat(product.price).toFixed(2)}
        </p>

        {product.inventory_count <= 5 && product.inventory_count > 0 && (
          <p className="text-sm text-amber-600 mt-2">
            Only {product.inventory_count} left!
          </p>
        )}

        {product.inventory_count === 0 && (
          <Badge variant="destructive" className="mt-2">
            Out of Stock
          </Badge>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full" 
          onClick={addToCart}
          disabled={product.inventory_count === 0}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
};
