import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CART_SESSION_KEY = 'joy_house_cart_session';

/**
 * Hook to manage cart session for both authenticated and guest users.
 * - For authenticated users: uses user_id
 * - For guests: generates and stores a session_id in localStorage
 */
export function useCartSession() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Generate or retrieve session ID for guests
  const getOrCreateSessionId = useCallback(() => {
    let stored = localStorage.getItem(CART_SESSION_KEY);
    if (!stored) {
      stored = `guest_${crypto.randomUUID()}`;
      localStorage.setItem(CART_SESSION_KEY, stored);
    }
    return stored;
  }, []);

  // Clear guest session (e.g., after successful checkout or login)
  const clearGuestSession = useCallback(() => {
    localStorage.removeItem(CART_SESSION_KEY);
    setSessionId(null);
  }, []);

  // Migrate guest cart to user cart after login
  const migrateGuestCartToUser = useCallback(async (newUserId: string) => {
    const guestSessionId = localStorage.getItem(CART_SESSION_KEY);
    if (!guestSessionId) return;

    try {
      // Get guest cart items
      const { data: guestItems, error: fetchError } = await supabase
        .from('shopping_cart')
        .select('product_id, quantity, variant_info')
        .eq('session_id', guestSessionId);

      if (fetchError || !guestItems?.length) {
        clearGuestSession();
        return;
      }

      // Merge with user's existing cart
      for (const item of guestItems) {
        await supabase
          .from('shopping_cart')
          .upsert({
            user_id: newUserId,
            product_id: item.product_id,
            quantity: item.quantity,
            variant_info: item.variant_info,
          }, {
            onConflict: 'user_id,product_id',
            ignoreDuplicates: false
          });
      }

      // Delete guest cart items
      await supabase
        .from('shopping_cart')
        .delete()
        .eq('session_id', guestSessionId);

      clearGuestSession();
    } catch (error) {
      console.error('Failed to migrate guest cart:', error);
    }
  }, [clearGuestSession]);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserId(user.id);
        setIsAuthenticated(true);
        // Migrate any guest cart items
        await migrateGuestCartToUser(user.id);
      } else {
        setUserId(null);
        setIsAuthenticated(false);
        setSessionId(getOrCreateSessionId());
      }
      
      setIsLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUserId(session.user.id);
        setIsAuthenticated(true);
        await migrateGuestCartToUser(session.user.id);
        setSessionId(null);
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        setIsAuthenticated(false);
        setSessionId(getOrCreateSessionId());
      }
    });

    return () => subscription.unsubscribe();
  }, [getOrCreateSessionId, migrateGuestCartToUser]);

  // Build the filter for cart queries
  const getCartFilter = useCallback(() => {
    if (userId) {
      return { user_id: userId };
    }
    if (sessionId) {
      return { session_id: sessionId };
    }
    return null;
  }, [userId, sessionId]);

  // Build the insert data for cart items
  const getCartInsertData = useCallback((productId: string, quantity: number, variantInfo?: any) => {
    const base = {
      product_id: productId,
      quantity,
      variant_info: variantInfo || null,
    };

    if (userId) {
      return { ...base, user_id: userId };
    }
    if (sessionId) {
      return { ...base, session_id: sessionId };
    }
    return null;
  }, [userId, sessionId]);

  return {
    userId,
    sessionId,
    isLoading,
    isAuthenticated,
    getCartFilter,
    getCartInsertData,
    clearGuestSession,
    migrateGuestCartToUser,
  };
}
