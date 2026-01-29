import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackPageView } from "@/lib/analytics";

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// Generate or retrieve session ID with 30-minute inactivity timeout
const getSessionId = (): string => {
  const now = Date.now();
  const storedData = localStorage.getItem("page_tracking_session");
  
  if (storedData) {
    try {
      const { sessionId, lastActivity } = JSON.parse(storedData);
      const timeSinceLastActivity = now - lastActivity;
      
      // If within timeout window, update last activity and return existing session
      if (timeSinceLastActivity < SESSION_TIMEOUT_MS) {
        localStorage.setItem("page_tracking_session", JSON.stringify({
          sessionId,
          lastActivity: now
        }));
        return sessionId;
      }
    } catch {
      // Invalid stored data, will create new session
    }
  }
  
  // Create new session (first visit or session expired)
  const newSessionId = crypto.randomUUID();
  localStorage.setItem("page_tracking_session", JSON.stringify({
    sessionId: newSessionId,
    lastActivity: now
  }));
  return newSessionId;
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

    // Track in Google Analytics
    trackPageView(location.pathname, document.title);

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