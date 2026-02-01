import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCartSession } from "@/hooks/useCartSession";

interface CoffeeCartItem {
  productId: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
}

export function useCoffeeCart() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getCartInsertData, getCartFilter, isLoading: cartSessionLoading } = useCartSession();

  const addToCart = async (item: CoffeeCartItem) => {
    if (cartSessionLoading) {
      toast({
        title: "Please wait",
        description: "Loading cart session...",
        variant: "destructive",
      });
      return false;
    }

    const insertData = getCartInsertData(item.productId, item.quantity, {
      type: 'coffee',
      price_per_unit: item.pricePerUnit,
      product_name: item.productName,
    });

    if (!insertData) {
      toast({
        title: "Error",
        description: "Unable to add to cart. Please try again.",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Check if item already exists in cart
      const filter = getCartFilter();
      if (!filter) throw new Error("No cart filter available");

      let existingQuery = supabase
        .from('shopping_cart')
        .select('id, quantity')
        .eq('product_id', item.productId);

      if ('user_id' in filter) {
        existingQuery = existingQuery.eq('user_id', filter.user_id);
      } else if ('session_id' in filter) {
        existingQuery = existingQuery.eq('session_id', filter.session_id);
      }

      const { data: existingItems } = await existingQuery;

      if (existingItems && existingItems.length > 0) {
        // Update existing item
        const existingItem = existingItems[0];
        const newQuantity = existingItem.quantity + item.quantity;
        
        const { error } = await supabase
          .from('shopping_cart')
          .update({ 
            quantity: newQuantity,
            variant_info: {
              type: 'coffee',
              price_per_unit: item.pricePerUnit,
              product_name: item.productName,
            }
          })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        // Insert new item
        const { error } = await supabase
          .from('shopping_cart')
          .insert(insertData);

        if (error) throw error;
      }

      // Invalidate cart queries
      queryClient.invalidateQueries({ queryKey: ['cart-count'] });
      queryClient.invalidateQueries({ queryKey: ['cart-items'] });

      toast({
        title: "Added to cart",
        description: `${item.quantity}x ${item.productName} added to your cart`,
      });

      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  return { addToCart, isLoading: cartSessionLoading };
}
