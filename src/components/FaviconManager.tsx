import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const FaviconManager = () => {
  useEffect(() => {
    const updateFavicon = async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "mobile_app_icon_url")
          .maybeSingle();

        if (data?.setting_value) {
          // Parse the JSON-stringified value
          const faviconUrl = typeof data.setting_value === 'string' 
            ? JSON.parse(data.setting_value) 
            : data.setting_value;

          // Update the favicon link
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = faviconUrl;
        }
      } catch (error) {
        console.error("Error loading favicon:", error);
        // Fallback to default favicon is already set in index.html
      }
    };

    updateFavicon();
  }, []);

  return null;
};
