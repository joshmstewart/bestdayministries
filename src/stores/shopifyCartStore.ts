import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem, createStorefrontCheckout, fetchCartQuantity } from '@/lib/shopify';

interface ShopifyCartStore {
  items: CartItem[];
  checkoutUrl: string | null;
  cartId: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  
  // Actions
  addItem: (item: CartItem) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  setLoading: (loading: boolean) => void;
  createCheckout: () => Promise<string | null>;
  syncCart: () => Promise<void>;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}


export const useShopifyCartStore = create<ShopifyCartStore>()(
  persist(
    (set, get) => ({
      items: [],
      checkoutUrl: null,
      cartId: null,
      isLoading: false,
      isSyncing: false,


      addItem: (item) => {
        const { items } = get();
        const existingItem = items.find(i => i.variantId === item.variantId);
        
        if (existingItem) {
          set({
            items: items.map(i =>
              i.variantId === item.variantId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            )
          });
        } else {
          set({ items: [...items, item] });
        }
      },

      updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(variantId);
          return;
        }
        
        set({
          items: get().items.map(item =>
            item.variantId === variantId ? { ...item, quantity } : item
          )
        });
      },

      removeItem: (variantId) => {
        set({
          items: get().items.filter(item => item.variantId !== variantId)
        });
      },

      clearCart: () => {
        set({ items: [], checkoutUrl: null, cartId: null });
      },

      setLoading: (isLoading) => set({ isLoading }),

      createCheckout: async () => {
        const { items, setLoading } = get();
        if (items.length === 0) return null;

        setLoading(true);
        try {
          const { checkoutUrl, cartId } = await createStorefrontCheckout(items);
          set({ checkoutUrl, cartId });
          return checkoutUrl;
        } catch (error) {
          console.error('Failed to create checkout:', error);
          showErrorToastWithCopy(
            error instanceof Error ? error : new Error('Failed to create checkout'),
            'Could not start Shopify checkout'
          );
          return null;
        } finally {
          setLoading(false);
        }
      },

      // Clears the local cart once the Shopify cart has been emptied by a completed checkout
      syncCart: async () => {
        const { cartId, isSyncing, clearCart } = get();
        if (!cartId || isSyncing) return;

        set({ isSyncing: true });
        try {
          const quantity = await fetchCartQuantity(cartId);
          if (quantity === 0) clearCart();
        } finally {
          set({ isSyncing: false });
        }
      },



      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((sum, item) => sum + (parseFloat(item.price.amount) * item.quantity), 0);
      }
    }),
    {
      name: 'shopify-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
