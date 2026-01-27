import { useState, useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Minus, Plus, Trash2, ExternalLink, Loader2, Store, Package, MapPin, Edit2 } from "lucide-react";
import { FreeShippingProgress } from "./FreeShippingProgress";
import { ShippingAddressInput } from "./ShippingAddressInput";
import { useShopifyCartStore } from "@/stores/shopifyCartStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCartSession } from "@/hooks/useCartSession";

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

interface UnifiedCartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UnifiedCartSheet = ({ open, onOpenChange }: UnifiedCartSheetProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCheckingOutHandmade, setIsCheckingOutHandmade] = useState(false);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [shippingResult, setShippingResult] = useState<ShippingCalculationResult | null>(null);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const { getCartFilter, isAuthenticated, sessionId, isLoading: cartSessionLoading } = useCartSession();
  
  // Shopify cart state
  const { 
    items: shopifyItems, 
    isLoading: shopifyLoading, 
    updateQuantity: updateShopifyQuantity, 
    removeItem: removeShopifyItem, 
    createCheckout: createShopifyCheckout,
    getTotalItems: getShopifyTotalItems,
    getTotalPrice: getShopifyTotalPrice 
  } = useShopifyCartStore();

  // Database cart items (both handmade and house vendor merch)
  const { data: cartItems, isLoading: cartLoading } = useQuery({
    queryKey: ['cart-items', getCartFilter()],
    queryFn: async () => {
      const filter = getCartFilter();
      if (!filter) return [];

      let query = supabase
        .from('shopping_cart')
        .select(`
          *,
          product:products(*, vendors(*))
        `);
      
      if ('user_id' in filter) {
        query = query.eq('user_id', filter.user_id);
      } else if ('session_id' in filter) {
        query = query.eq('session_id', filter.session_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open && !cartSessionLoading
  });

  // All database cart items (both house vendor merch and handmade)
  const allCartItems = cartItems || [];

  // Shipping constants (fallback only)
  const FLAT_SHIPPING_RATE = 6.99;

  // Calculate totals by vendor for shipping (including vendor-specific thresholds and flat-rate amounts)
  const vendorTotals = allCartItems.reduce((acc, item) => {
    const vendorId = item.product.vendor_id;
    const price = typeof item.product.price === 'string' 
      ? parseFloat(item.product.price) 
      : item.product.price;
    const itemTotal = price * item.quantity;
    
    if (!acc[vendorId]) {
      const vendorThreshold = item.product.vendors?.free_shipping_threshold;
      const vendorFlatRateCentsRaw = item.product.vendors?.flat_rate_amount_cents;
      const vendorFlatRateCents =
        vendorFlatRateCentsRaw != null
          ? Number(vendorFlatRateCentsRaw)
          : Math.round(FLAT_SHIPPING_RATE * 100);
      acc[vendorId] = { 
        subtotal: 0, 
        vendorName: item.product.vendors?.business_name || 'Vendor',
        // IMPORTANT: only treat free shipping as enabled if vendor explicitly configured a threshold
        freeShippingThreshold: vendorThreshold != null ? Number(vendorThreshold) : null,
        disableFreeShipping: !!item.product.vendors?.disable_free_shipping,
        shippingMode: item.product.vendors?.shipping_mode || 'flat',
        flatRateCents: vendorFlatRateCents,
      };
    }
    acc[vendorId].subtotal += itemTotal;
    return acc;
  }, {} as Record<string, { subtotal: number; vendorName: string; freeShippingThreshold: number | null; disableFreeShipping: boolean; shippingMode: string; flatRateCents: number }>);

  const cartSubtotal = Object.values(vendorTotals).reduce((sum, v) => sum + v.subtotal, 0);

  // Check if any vendor uses calculated shipping AND hasn't met their free shipping threshold
  const hasCalculatedShippingVendor = useMemo(() => {
    if (!allCartItems || allCartItems.length === 0) return false;
    return Object.values(vendorTotals).some(vendor => {
      if (vendor.shippingMode !== 'calculated') return false;
      // If they have a threshold and it's met, no need for calculated shipping
      const hasThreshold = !vendor.disableFreeShipping && vendor.freeShippingThreshold != null && vendor.freeShippingThreshold > 0;
      const thresholdMet = hasThreshold && vendor.freeShippingThreshold != null && vendor.subtotal >= vendor.freeShippingThreshold;
      return !thresholdMet; // Only requires calculation if threshold NOT met
    });
  }, [allCartItems, vendorTotals]);

  const getVendorShippingDisplay = (vendorId: string): { label: string; isPending: boolean } => {
    const vendor = vendorTotals[vendorId];
    if (!vendor) return { label: 'Pending', isPending: true };

    // Check if vendor has a free shipping threshold and if it's met (applies to ALL shipping modes)
    const hasThreshold = !vendor.disableFreeShipping && vendor.freeShippingThreshold != null && vendor.freeShippingThreshold > 0;
    const thresholdMet = hasThreshold && vendor.freeShippingThreshold != null && vendor.subtotal >= vendor.freeShippingThreshold;
    
    // If threshold is met, always show FREE (bypasses dynamic calculation)
    if (thresholdMet) {
      return { label: 'FREE', isPending: false };
    }

    // If we have a calculated result, trust it for ALL vendors (flat/free/calculated)
    if (shippingResult?.success) {
      const vs = shippingResult.vendor_shipping.find(v => v.vendor_id === vendorId);
      if (vs) {
        if (vs.shipping_cents === 0) return { label: 'FREE', isPending: false };
        return { label: `$${(vs.shipping_cents / 100).toFixed(2)}`, isPending: false };
      }
    }

    // Calculated vendors require ZIP first (but only if threshold not met)
    if (vendor.shippingMode === 'calculated') {
      return { label: 'Pending', isPending: true };
    }

    // Flat vendors can show known shipping immediately
    return { label: `$${(vendor.flatRateCents / 100).toFixed(2)}`, isPending: false };
  };
  
  const hasAnyConfiguredFreeShipping = useMemo(() => {
    return Object.values(vendorTotals).some((v) =>
      !v.disableFreeShipping &&
      v.freeShippingThreshold != null &&
      v.freeShippingThreshold > 0
    );
  }, [vendorTotals]);

  // Use calculated shipping if available; when dynamic shipping is enabled and not calculated yet, show pending (no estimate)
  const shippingTotal: number | null = shippingResult?.success
    ? shippingResult.shipping_total_cents / 100
    : hasCalculatedShippingVendor
      ? null
      : Object.values(vendorTotals).reduce((sum, v) => {
          // Check if threshold is met (applies to all shipping modes)
          const hasThreshold = !v.disableFreeShipping && v.freeShippingThreshold != null && v.freeShippingThreshold > 0;
          const thresholdMet = hasThreshold && v.freeShippingThreshold != null && v.subtotal >= v.freeShippingThreshold;
          if (thresholdMet) return sum; // Free shipping for this vendor
          return sum + (v.flatRateCents / 100);
        }, 0);
  
  const cartTotal: number | null = shippingTotal == null ? null : cartSubtotal + shippingTotal;

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
      setShippingResult(null);
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  // Determine if we need to show address input
  const needsAddressInput = hasCalculatedShippingVendor && (!shippingAddress || isEditingAddress);
  const hasValidShipping = !hasCalculatedShippingVendor || shippingResult?.success;

  const shopifyTotalItems = getShopifyTotalItems();
  const shopifyTotalPrice = getShopifyTotalPrice();
  const cartItemCount = allCartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalItems = shopifyTotalItems + cartItemCount;

  const updateHandmadeQuantity = async (cartItemId: string, currentQuantity: number, delta: number) => {
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

  const removeHandmadeItem = async (cartItemId: string) => {
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
  };

  const handleShopifyCheckout = async () => {
    const checkoutUrl = await createShopifyCheckout();
    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank');
    }
  };

  const handleHandmadeCheckout = async () => {
    // If vendor has calculated shipping but no address entered, prompt for address
    if (hasCalculatedShippingVendor && !shippingAddress) {
      toast({
        title: "Shipping address required",
        description: "Please enter your ZIP code to calculate shipping before checkout.",
        variant: "destructive"
      });
      return;
    }

    setIsCheckingOutHandmade(true);
    
    try {
      // Build body with shipping info if available
      let body: Record<string, any> = {};
      
      if (!isAuthenticated) {
        body.session_id = sessionId;
      }
      
      if (shippingResult?.success) {
        body.shipping_address = shippingAddress;
        body.calculated_shipping = shippingResult.vendor_shipping;
      }
      
      const { data, error } = await supabase.functions.invoke("create-marketplace-checkout", { body });

      if (error) {
        // Try to parse a more user-friendly error message
        let errorDescription = error.message || "Unable to start checkout. Please try again.";
        
        // Check for vendor Stripe setup issues
        if (errorDescription.includes("has not completed Stripe setup") || 
            errorDescription.includes("cannot receive payments")) {
          errorDescription = `${errorDescription} Please remove their items from your cart or try again later.`;
        }
        
        toast({
          title: "Checkout failed",
          description: errorDescription,
          variant: "destructive"
        });
        setIsCheckingOutHandmade(false);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        // Handle error returned in data
        let errorDescription = data?.error || "Unable to create checkout session";
        
        if (errorDescription.includes("has not completed Stripe setup") || 
            errorDescription.includes("cannot receive payments")) {
          errorDescription = `${errorDescription} Please remove their items from your cart or try again later.`;
        }
        
        toast({
          title: "Checkout failed",
          description: errorDescription,
          variant: "destructive"
        });
      }
    } catch (err) {
      toast({
        title: "Checkout failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsCheckingOutHandmade(false);
    }
  };

  const isLoading = shopifyLoading || cartLoading;
  const isEmpty = shopifyItems.length === 0 && allCartItems.length === 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>Shopping Cart</SheetTitle>
          <SheetDescription>
            {totalItems === 0 ? "Your cart is empty" : `${totalItems} item${totalItems !== 1 ? 's' : ''} in your cart`}
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex flex-col flex-1 pt-6 min-h-0">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isEmpty ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Your cart is empty</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                {/* Shopify Items Section */}
                {shopifyItems.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Store className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">Shopify Merch</h3>
                    </div>
                    
                    <div className="space-y-3">
                      {shopifyItems.map((item) => (
                        <div key={item.variantId} className="flex gap-3 p-3 border rounded-lg bg-card">
                          <div className="w-16 h-16 bg-muted rounded-md overflow-hidden flex-shrink-0">
                            {item.product.node.images?.edges?.[0]?.node && (
                              <img
                                src={item.product.node.images.edges[0].node.url}
                                alt={item.product.node.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate text-sm">{item.product.node.title}</h4>
                            {item.variantTitle !== "Default Title" && (
                              <p className="text-xs text-muted-foreground">
                                {item.variantTitle}
                              </p>
                            )}
                            <p className="font-semibold text-sm text-primary">
                              ${parseFloat(item.price.amount).toFixed(2)}
                            </p>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => removeShopifyItem(item.variantId)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateShopifyQuantity(item.variantId, item.quantity - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center text-sm">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateShopifyQuantity(item.variantId, item.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal ({shopifyTotalItems} items)</span>
                        <span className="font-semibold">${shopifyTotalPrice.toFixed(2)}</span>
                      </div>
                      <Button 
                        onClick={handleShopifyCheckout}
                        className="w-full" 
                        disabled={shopifyLoading}
                      >
                        {shopifyLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Checkout Shopify Items
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Separator if both sections have items */}
                {shopifyItems.length > 0 && allCartItems.length > 0 && (
                  <Separator />
                )}

                {/* Store Items Section - grouped by vendor */}
                {allCartItems.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">Store Items</h3>
                    </div>

                    {/* Group items by vendor */}
                    {Object.entries(vendorTotals).map(([vendorId, vendor], index) => {
                      const vendorItems = allCartItems.filter(item => item.product.vendor_id === vendorId);
                      // Show progress bar for ANY vendor with a configured threshold (including calculated shipping)
                      const showFreeShippingProgress =
                        !vendor.disableFreeShipping &&
                        vendor.freeShippingThreshold != null &&
                        vendor.freeShippingThreshold > 0;
                        const vendorShipping = getVendorShippingDisplay(vendorId);

                      return (
                        <div 
                          key={vendorId} 
                          className="rounded-xl border-2 border-border bg-muted/30 p-4 space-y-3"
                        >
                          {/* Vendor name header with strong visual identity */}
                          <div className="flex items-center gap-2 pb-2 border-b border-border">
                            <Store className="h-5 w-5 text-primary" />
                            <span className="font-semibold text-base">{vendor.vendorName}</span>
                          </div>
                          
                          {/* Vendor's items */}
                          <div className="space-y-2">
                            {vendorItems.map((item) => (
                              <div key={item.id} className="flex gap-3 p-3 border rounded-lg bg-card">
                                <img
                                  src={item.product.images?.[0] || '/placeholder.svg'}
                                  alt={item.product.name}
                                  className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                                />
                                
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium truncate text-sm">{item.product.name}</h4>
                                  <p className="font-semibold text-sm text-primary">
                                    ${(typeof item.product.price === 'string' 
                                      ? parseFloat(item.product.price) 
                                      : item.product.price).toFixed(2)}
                                  </p>
                                </div>
                                
                                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                    onClick={() => removeHandmadeItem(item.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                  
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => updateHandmadeQuantity(item.id, item.quantity, -1)}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => updateHandmadeQuantity(item.id, item.quantity, 1)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Vendor's shipping progress */}
                          {showFreeShippingProgress && (
                            <FreeShippingProgress 
                              currentSubtotal={vendor.subtotal} 
                              threshold={vendor.freeShippingThreshold}
                            />
                          )}

                          {/* Vendor shipping line with visual separator */}
                          <div className="flex justify-between items-center text-sm pt-3 mt-2 border-t border-border/50">
                            <span className="text-muted-foreground font-medium">Shipping</span>
                            <span
                              className={
                                vendorShipping.isPending
                                  ? "text-accent-foreground font-semibold italic"
                                  : vendorShipping.label === 'FREE'
                                    ? "text-primary font-semibold"
                                    : "font-semibold"
                              }
                            >
                              {vendorShipping.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    
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

                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>${cartSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>
                          Shipping
                          {shippingTotal === 0 && <span className="ml-1 text-primary">(Free)</span>}
                          {shippingTotal == null && (
                            <span className="ml-1 text-muted-foreground">(pending)</span>
                          )}
                        </span>
                        <span className={shippingTotal == null ? "text-accent-foreground font-medium italic" : ""}>
                          {shippingTotal == null
                            ? 'Pending'
                            : shippingTotal > 0
                              ? `$${shippingTotal.toFixed(2)}`
                              : 'FREE'
                          }
                        </span>
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

                      {shippingTotal != null && shippingTotal > 0 && !shippingResult?.success && hasAnyConfiguredFreeShipping && (
                        <p className="text-xs text-muted-foreground">
                          Free shipping may apply on qualifying orders (per vendor)
                        </p>
                      )}
                      <div className="flex justify-between font-semibold pt-1 border-t">
                        <span>{cartTotal == null ? 'Total (pending shipping)' : 'Total (before tax)'}</span>
                        <span>{cartTotal == null ? '—' : `$${cartTotal.toFixed(2)}`}</span>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Sales tax will be calculated at checkout
                      </p>
                      <Button 
                        onClick={handleHandmadeCheckout}
                        className="w-full" 
                        disabled={isCheckingOutHandmade || (hasCalculatedShippingVendor && !hasValidShipping)}
                      >
                        {isCheckingOutHandmade ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
