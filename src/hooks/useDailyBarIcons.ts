import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DailyBarIcon {
  id: string;
  item_key: string;
  icon_url: string | null;
  label: string;
  display_order: number;
  is_active: boolean;
}

export function useDailyBarIcons() {
  const [icons, setIcons] = useState<DailyBarIcon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIcons = async () => {
      try {
        const { data, error } = await supabase
          .from("daily_bar_icons")
          .select("*")
          .eq("is_active", true)
          .order("display_order");

        if (error) throw error;
        setIcons(data || []);
      } catch (error) {
        console.error("Error fetching daily bar icons:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchIcons();
  }, []);

  return { icons, loading };
}
