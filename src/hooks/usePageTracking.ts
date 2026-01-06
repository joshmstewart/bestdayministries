import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Generate or retrieve session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem("page_tracking_session");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("page_tracking_session", sessionId);
  }
  return sessionId;
};

export function usePageTracking() {
  const location = useLocation();
  const { user } = useAuth();
  const lastTrackedPath = useRef<string>("");

  useEffect(() => {
    // Avoid tracking the same path multiple times in a row
    const currentPath = location.pathname + location.search;
    if (currentPath === lastTrackedPath.current) return;
    lastTrackedPath.current = currentPath;

    const trackPageVisit = async () => {
      try {
        const sessionId = getSessionId();
        
        await supabase.from("page_visits").insert({
          page_url: location.pathname,
          page_title: document.title,
          user_id: user?.id || null,
          session_id: sessionId,
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
        });
      } catch (error) {
        // Silently fail - don't disrupt user experience for analytics
        console.debug("Page tracking error:", error);
      }
    };

    // Small delay to ensure page title is updated
    const timeout = setTimeout(trackPageVisit, 100);
    return () => clearTimeout(timeout);
  }, [location.pathname, location.search, user?.id]);
}