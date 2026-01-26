import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus, Minus, Loader2, MapPin, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ShippingAddressInput } from "./ShippingAddressInput";

interface ShippingAddress {
  zip: string;
  city?: string;
  state?: string;
  country?: string;
}

interface VendorShippingResult {
  vendor_id: string;
  vendor_name: string;
  subtotal_cents: number;
  shipping_cents: number;
  shipping_method: 'calculated' | 'flat' | 'free';
  service_name?: string;
  carrier?: string;
  estimated_days?: number;
  error?: string;
}

interface ShippingCalculationResult {
  success: boolean;
  shipping_total_cents: number;
  subtotal_cents: number;
  vendor_shipping: VendorShippingResult[];
  requires_calculated_shipping: boolean;
}

interface ShoppingCartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShoppingCartSheet = ({ open, onOpenChange }: ShoppingCartSheetProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [shippingResult, setShippingResult] = useState<ShippingCalculationResult | null>(null);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  const { data: cartItems, isLoading } = useQuery({
    queryKey: ['cart-items'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('shopping_cart')
        .select(`
          *,
          product:products(*, vendors(*))
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
    enabled: open
  });

  // Check if any vendor uses calculated shipping
  const hasCalculatedShippingVendor = useMemo(() => {
    if (!cartItems || cartItems.length === 0) return false;
    return cartItems.some(item => item.product?.vendors?.shipping_mode === 'calculated');
  }, [cartItems]);

  // Shipping constants (for flat rate fallback display)
  const FLAT_SHIPPING_RATE = 6.99;
  const FREE_SHIPPING_THRESHOLD = 35;

  // Calculate vendor subtotals for flat rate display
  const vendorTotals = useMemo(() => {
    if (!cartItems) return {};
    return cartItems.reduce((acc, item) => {
      const vendorId = item.product.vendor_id;
      const price = typeof item.product.price === 'string' 
        ? parseFloat(item.product.price) 
        : item.product.price;
      const itemTotal = price * item.quantity;
      
      if (!acc[vendorId]) {
        acc[vendorId] = { 
          subtotal: 0, 
          vendorName: item.product.vendors?.business_name || 'Vendor',
          shippingMode: item.product.vendors?.shipping_mode || 'flat'
        };
      }
      acc[vendorId].subtotal += itemTotal;
      return acc;
    }, {} as Record<string, { subtotal: number; vendorName: string; shippingMode: string }>);
  }, [cartItems]);

  const subtotal = Object.values(vendorTotals).reduce((sum, v) => sum + v.subtotal, 0);

  // Use calculated shipping if available, otherwise flat rate estimate
  const shippingTotal = shippingResult?.success 
    ? shippingResult.shipping_total_cents / 100
    : Object.values(vendorTotals).reduce((sum, v) => 
        sum + (v.subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE), 0);

  const total = subtotal + shippingTotal;

  // Reset shipping when cart changes
  useEffect(() => {
    if (cartItems) {
      setShippingResult(null);
    }
  }, [cartItems?.length]);

  const calculateShipping = async (address: ShippingAddress) => {
    setIsCalculatingShipping(true);
    setShippingAddress(address);
    setIsEditingAddress(false);

    try {
      const { data, error } = await supabase.functions.invoke("calculate-shipping-rates", {
        body: { shipping_address: address }
      });

      if (error) throw error;

      if (data?.success) {
        setShippingResult(data as ShippingCalculationResult);
        toast({
          title: "Shipping calculated",
          description: `Shipping to ${address.zip}: $${(data.shipping_total_cents / 100).toFixed(2)}`,
        });
      } else {
        throw new Error(data?.error || "Failed to calculate shipping");
      }
    } catch (err) {
      console.error("Shipping calculation error:", err);
      toast({
        title: "Shipping calculation failed",
        description: "Using flat rate shipping. You can try again.",
        variant: "destructive"
      });
      // Keep flat rate as fallback
      setShippingResult(null);
    } finally {
      setIsCalculatingShipping(false);
    }
  };

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

    // Reset shipping calculation when cart changes
    setShippingResult(null);
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

    // Reset shipping calculation when cart changes
    setShippingResult(null);
    queryClient.invalidateQueries({ queryKey: ['cart-items'] });
    queryClient.invalidateQueries({ queryKey: ['cart-count'] });

    toast({
      title: "Item removed",
      description: "Item has been removed from your cart"
    });
  };

  const handleCheckout = async () => {
    // If vendor has calculated shipping but no address entered, prompt for address
    if (hasCalculatedShippingVendor && !shippingAddress) {
      toast({
        title: "Shipping address required",
        description: "Please enter your ZIP code to calculate shipping before checkout.",
        variant: "destructive"
      });
      return;
    }

    setIsCheckingOut(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Login required",
          description: "Please log in to complete your purchase",
          variant: "destructive"
        });
        setIsCheckingOut(false);
        return;
      }

      // Pass shipping info to checkout
      const { data, error } = await supabase.functions.invoke("create-marketplace-checkout", {
        body: shippingResult?.success ? {
          shipping_address: shippingAddress,
          calculated_shipping: shippingResult.vendor_shipping
        } : {}
      });

      if (error) {
        console.error("Checkout error:", error);
        toast({
          title: "Checkout failed",
          description: error.message || "Unable to start checkout. Please try again.",
          variant: "destructive"
        });
        setIsCheckingOut(false);
        return;
      }

      if (data?.url) {
        // Open Stripe checkout in new tab
        window.open(data.url, "_blank");
        onOpenChange(false);
      } else {
        toast({
          title: "Checkout failed",
          description: data?.error || "Unable to create checkout session",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast({
        title: "Checkout failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Determine if we need to show address input
  const needsAddressInput = hasCalculatedShippingVendor && (!shippingAddress || isEditingAddress);
  const hasValidShipping = !hasCalculatedShippingVendor || shippingResult?.success;

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
              {/* Shipping Address Input for calculated shipping vendors */}
              {hasCalculatedShippingVendor && (
                <div className="space-y-2">
                  {needsAddressInput ? (
                    <ShippingAddressInput
                      onAddressSubmit={calculateShipping}
                      isLoading={isCalculatingShipping}
                      initialAddress={shippingAddress}
                    />
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>Shipping to: <strong>{shippingAddress?.zip}</strong></span>
                        {shippingAddress?.city && <span className="text-muted-foreground">({shippingAddress.city})</span>}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setIsEditingAddress(true)}
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Change
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Shipping
                    {shippingTotal === 0 && <span className="ml-1 text-primary">(Free)</span>}
                    {hasCalculatedShippingVendor && !shippingResult?.success && (
                      <span className="ml-1 text-accent-foreground/70">(estimate)</span>
                    )}
                  </span>
                  <span>{shippingTotal > 0 ? `$${shippingTotal.toFixed(2)}` : 'FREE'}</span>
                </div>

                {/* Show per-vendor shipping breakdown if calculated */}
                {shippingResult?.success && shippingResult.vendor_shipping.length > 1 && (
                  <div className="pl-4 space-y-1 text-xs text-muted-foreground">
                    {shippingResult.vendor_shipping.map((vs) => (
                      <div key={vs.vendor_id} className="flex justify-between">
                        <span>{vs.vendor_name}: {vs.service_name}</span>
                        <span>${(vs.shipping_cents / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {shippingTotal > 0 && !shippingResult?.success && (
                  <p className="text-xs text-muted-foreground">
                    Free shipping on orders $35+ per vendor
                  </p>
                )}
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total (before tax):</span>
                <span className="text-primary">${total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Sales tax will be calculated at checkout
              </p>
              <Button
                className="w-full" 
                size="lg"
                onClick={handleCheckout}
                disabled={isCheckingOut || (hasCalculatedShippingVendor && !hasValidShipping)}
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : hasCalculatedShippingVendor && !hasValidShipping ? (
                  "Enter ZIP to continue"
                ) : (
                  "Proceed to Checkout"
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
