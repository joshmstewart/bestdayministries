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
        
        // Daily Five: check wordle_attempts directly for completed status
        // This is faster and more reliable than the edge function
        (async () => {
          // First get today's word
          const { data: dailyWord } = await supabase
            .from("wordle_daily_words")
            .select("id")
            .eq("word_date", today)
            .maybeSingle();
          
          if (!dailyWord) return { data: null };
          
          // Then check if user has a completed attempt
          const { data: attempt } = await supabase
            .from("wordle_attempts")
            .select("status")
            .eq("user_id", user.id)
            .eq("daily_word_id", dailyWord.id)
            .maybeSingle();
          
          return { 
            data: { 
              gameOver: attempt?.status === "won" || attempt?.status === "lost" 
            } 
          };
        })()
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
