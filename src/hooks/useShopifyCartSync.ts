import { useEffect } from "react";
import { useShopifyCartStore } from "@/stores/shopifyCartStore";

/**
 * Keeps the locally persisted Shopify cart in sync with Shopify.
 * Shopify checkout happens in a new tab, so we re-check the cart on mount and
 * whenever the user returns to this tab. If the Shopify cart is empty (order
 * completed or cart expired), the local cart is cleared.
 */
export function useShopifyCartSync() {
  const syncCart = useShopifyCartStore((state) => state.syncCart);

  useEffect(() => {
    syncCart();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") syncCart();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [syncCart]);
}
