import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useLatestMemoryMatchCardBack() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestCardBack = async () => {
      try {
        const { data } = await supabase
          .from("memory_match_packs")
          .select("card_back_url")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data?.card_back_url) {
          setImageUrl(data.card_back_url);
        }
      } catch (error) {
        console.error("Error fetching latest memory match card back:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestCardBack();
  }, []);

  return { imageUrl, loading };
}
