import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import defaultCoinImage from "@/assets/joycoin.png";

export function useCustomCoinImage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomCoin = async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "custom_coin_image")
          .maybeSingle();

        const settingValue = data?.setting_value as { url?: string } | null;
        setImageUrl(settingValue?.url || defaultCoinImage);
      } catch (error) {
        console.error("Failed to load custom coin image:", error);
        setImageUrl(defaultCoinImage);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomCoin();
  }, []);

  return { imageUrl, loading };
}
