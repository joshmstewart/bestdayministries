import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to track tab/button clicks for analytics.
 * Records clicks silently without interrupting user experience.
 */
export function useTabClickTracking() {
  const { user } = useAuth();

  const trackTabClick = useCallback(async (tabName: string, pageUrl: string = window.location.pathname) => {
    try {
      // Get or create session ID
      const storedData = localStorage.getItem("page_tracking_session");
      let sessionId: string | null = null;
      
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          sessionId = parsed.sessionId;
        } catch {
          // Ignore parse errors
        }
      }

      await supabase.from("tab_click_tracking").insert({
        user_id: user?.id || null,
        tab_name: tabName,
        page_url: pageUrl,
        session_id: sessionId,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      // Silent fail - don't disrupt user experience for analytics
      console.debug("Tab tracking error:", error);
    }
  }, [user?.id]);

  return { trackTabClick };
}
