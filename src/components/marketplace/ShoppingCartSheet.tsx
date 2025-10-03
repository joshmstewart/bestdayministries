import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShoppingCartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShoppingCartSheet = ({ open, onOpenChange }: ShoppingCartSheetProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cartItems, isLoading } = useQuery({
    queryKey: ['cart-items'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('shopping_cart')
        .select(`
          *,
          product:products(*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
    enabled: open
  });

  const updateQuantity = async (cartItemId: string, currentQuantity: number, delta: number) => {
    const newQuantity = currentQuantity + delta;
    if (newQuantity < 1) return;

    const { error } = await supabase
      .from('shopping_cart')
      .update({ quantity: newQuantity })
      .eq('id', cartItemId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive"
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['cart-items'] });
    queryClient.invalidateQueries({ queryKey: ['cart-count'] });
  };

  const removeItem = async (cartItemId: string) => {
    const { error } = await supabase
      .from('shopping_cart')
      .delete()
      .eq('id', cartItemId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive"
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['cart-items'] });
    queryClient.invalidateQueries({ queryKey: ['cart-count'] });

    toast({
      title: "Item removed",
      description: "Item has been removed from your cart"
    });
  };

  const total = cartItems?.reduce((sum, item) => {
    const price = typeof item.product.price === 'string' 
      ? parseFloat(item.product.price) 
      : item.product.price;
    return sum + (price * item.quantity);
  }, 0) || 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Shopping Cart</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : !cartItems || cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <p className="text-muted-foreground">Your cart is empty</p>
            <Button onClick={() => onOpenChange(false)}>
              Continue Shopping
            </Button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 -mx-6 px-6 my-6">
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <img
                      src={item.product.images?.[0] || '/placeholder.svg'}
                      alt={item.product.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1 space-y-2">
                      <h4 className="font-semibold line-clamp-1">
                        {item.product.name}
                      </h4>
                      <p className="text-sm text-primary font-bold">
                        ${(typeof item.product.price === 'string' 
                          ? parseFloat(item.product.price) 
                          : item.product.price).toFixed(2)}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 ml-auto text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-primary">${total.toFixed(2)}</span>
              </div>
              <Button className="w-full" size="lg">
                Proceed to Checkout
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
