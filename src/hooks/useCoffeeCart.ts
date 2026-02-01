import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCartSession } from "@/hooks/useCartSession";

interface CoffeeCartItem {
  productId: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
  tierQuantity: number; // Number of units in the selected tier (e.g., 1, 3, 6)
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

    const variantInfo = {
      type: 'coffee',
      price_per_unit: item.pricePerUnit,
      product_name: item.productName,
    };

    const filter = getCartFilter();
    if (!filter) {
      toast({
        title: "Error",
        description: "Unable to add to cart. Please try again.",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Check if item already exists in cart (using coffee_product_id, not product_id)
      let existingQuery = supabase
        .from('shopping_cart')
        .select('id, quantity')
        .eq('coffee_product_id', item.productId);

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
            tier_quantity: item.tierQuantity,
            unit_price: item.pricePerUnit,
            variant_info: variantInfo
          })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        // Insert new item with coffee_product_id (not product_id)
        // Include tier_quantity and unit_price for checkout flow
        const insertData: any = {
          coffee_product_id: item.productId,
          quantity: item.quantity,
          tier_quantity: item.tierQuantity,
          unit_price: item.pricePerUnit,
          variant_info: variantInfo,
        };

        if (filter && 'user_id' in filter) {
          insertData.user_id = filter.user_id;
        } else if (filter && 'session_id' in filter) {
          insertData.session_id = filter.session_id;
        }

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
