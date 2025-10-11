import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useBrewBlastTheme = () => {
  const [hasHalloweenTheme, setHasHalloweenTheme] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkThemeOwnership = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasHalloweenTheme(false);
        setLoading(false);
        return;
      }

      // Check if user has purchased the Halloween theme
      const { data, error } = await supabase
        .from("user_store_purchases")
        .select(`
          id,
          store_items!inner (
            name
          )
        `)
        .eq("user_id", user.id)
        .eq("store_items.name", "Halloween Theme - Brew Blast")
        .limit(1);

      if (error) throw error;
      
      setHasHalloweenTheme(data && data.length > 0);
    } catch (error) {
      console.error("Error checking theme ownership:", error);
      setHasHalloweenTheme(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkThemeOwnership();

    // Set up realtime subscription for purchases
    const channel = supabase
      .channel('theme_purchases')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_store_purchases',
        },
        () => {
          checkThemeOwnership();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { hasHalloweenTheme, loading };
};
