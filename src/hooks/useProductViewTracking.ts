import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackProductView } from "@/lib/analytics";

/**
 * Hook to track product views. Records a view once per session per product.
 * Uses sessionStorage to prevent duplicate views within the same browsing session.
 */
export const useProductViewTracking = (productId: string | undefined, productName?: string) => {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (!productId || hasTrackedRef.current) return;

    // Check if we've already tracked this product in this session
    const viewedKey = `product_viewed_${productId}`;
    const alreadyViewed = sessionStorage.getItem(viewedKey);
    
    if (alreadyViewed) {
      hasTrackedRef.current = true;
      return;
    }

    // Track in Google Analytics
    trackProductView(productId, productName);

    const trackView = async () => {
      try {
        // Get user if logged in
        const { data: { user } } = await supabase.auth.getUser();
        
        // Get or create session ID for anonymous users
        let sessionId = sessionStorage.getItem('anonymous_session_id');
        if (!sessionId) {
          sessionId = crypto.randomUUID();
          sessionStorage.setItem('anonymous_session_id', sessionId);
        }

        await supabase.from('product_views').insert({
          product_id: productId,
          user_id: user?.id || null,
          session_id: sessionId,
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
        });

        // Mark as viewed in this session
        sessionStorage.setItem(viewedKey, 'true');
        hasTrackedRef.current = true;
      } catch (error) {
        // Silent fail - don't interrupt the user experience for analytics
        console.error('Failed to track product view:', error);
      }
    };

    trackView();
  }, [productId, productName]);
};
