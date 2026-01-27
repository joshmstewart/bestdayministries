import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { showCoinNotification } from "@/utils/coinNotification";

// Global flag to prevent multiple simultaneous checks across component instances
let globalCheckInProgress = false;

// Session-level tracking to prevent re-checks during same browser session
const SESSION_KEY = "daily_login_checked_date";

/**
 * Get today's date in MST timezone using proper timezone handling.
 */
function getMSTDate(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Hook to check and award daily login coins on first load each day.
 * Uses MST timezone for day calculation (same as sticker packs).
 * Calls Edge Function for atomic server-side processing.
 */
export const useDailyLoginReward = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const hasChecked = useRef(false);

  useEffect(() => {
    if (loading || !isAuthenticated || !user || hasChecked.current) return;

    const checkAndAwardDailyLogin = async () => {
      // Check session storage first - if we already checked today, skip
      const todayMST = getMSTDate();
      const lastCheckedDate = sessionStorage.getItem(SESSION_KEY);
      if (lastCheckedDate === todayMST) {
        hasChecked.current = true;
        return;
      }

      // Prevent multiple parallel executions globally
      if (globalCheckInProgress) {
        hasChecked.current = true;
        return;
      }
      globalCheckInProgress = true;
      hasChecked.current = true;

      try {
        // Call the Edge Function for atomic server-side processing
        const { data, error } = await supabase.functions.invoke("claim-daily-login-reward");

        if (error) {
          console.error("Error calling daily login reward function:", error);
          return;
        }

        // Mark this session as checked for today
        sessionStorage.setItem(SESSION_KEY, todayMST);

        // Show notification if reward was granted
        if (data?.success && data?.amount) {
          showCoinNotification(data.amount, "Welcome back! Daily login bonus");
        }
      } catch (error) {
        console.error("Error checking daily login reward:", error);
      } finally {
        globalCheckInProgress = false;
      }
    };

    checkAndAwardDailyLogin();
  }, [loading, isAuthenticated, user]);
};
