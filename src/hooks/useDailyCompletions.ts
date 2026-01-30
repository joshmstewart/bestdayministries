import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DailyCompletions {
  mood: boolean;
  fortune: boolean;
  "daily-five": boolean;
}

// Get MST date string (YYYY-MM-DD format)
const getMSTDate = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
};

export function useDailyCompletions() {
  const { user, isAuthenticated } = useAuth();
  const [completions, setCompletions] = useState<DailyCompletions>({
    mood: false,
    fortune: false,
    "daily-five": false,
  });
  const [loading, setLoading] = useState(true);

  const checkCompletions = useCallback(async () => {
    if (!user || !isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const today = getMSTDate();

      // Check all three in parallel
      const [moodResult, fortuneResult, wordleResult] = await Promise.all([
        // Mood: check mood_entries for today
        supabase
          .from("mood_entries")
          .select("id")
          .eq("user_id", user.id)
          .eq("entry_date", today)
          .maybeSingle(),
        
        // Fortune: check daily_fortune_views for today
        supabase
          .from("daily_fortune_views")
          .select("id")
          .eq("user_id", user.id)
          .eq("view_date", today)
          .maybeSingle(),
        
        // Daily Five: use the edge function to get game state
        supabase.functions.invoke("get-wordle-state", {}).catch(() => ({ data: null })),
      ]);

      setCompletions({
        mood: !!moodResult.data,
        fortune: !!fortuneResult.data,
        "daily-five": wordleResult.data?.gameOver === true,
      });
    } catch (error) {
      console.error("Error checking daily completions:", error);
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    checkCompletions();
  }, [checkCompletions]);

  // Allow manual refresh after completing an activity
  const refresh = useCallback(() => {
    checkCompletions();
  }, [checkCompletions]);

  return { completions, loading, refresh };
}
