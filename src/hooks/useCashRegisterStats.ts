import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useCashRegisterStats() {
  const { user } = useAuth();

  const saveGameResult = useCallback(async (score: number, level: number) => {
    if (!user) return;

    const currentMonthYear = new Date().toISOString().slice(0, 7);

    try {
      // Get existing stats
      const { data: existing } = await supabase
        .from("cash_register_user_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        // Update existing stats
        const isNewMonth = existing.current_month_year !== currentMonthYear;
        const newMonthScore = isNewMonth ? score : Math.max(existing.current_month_score || 0, score);

        await supabase
          .from("cash_register_user_stats")
          .update({
            high_score: Math.max(existing.high_score, score),
            total_games_played: existing.total_games_played + 1,
            total_levels_completed: existing.total_levels_completed + level,
            best_level: Math.max(existing.best_level, level),
            current_month_score: newMonthScore,
            current_month_year: currentMonthYear,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      } else {
        // Insert new stats
        await supabase
          .from("cash_register_user_stats")
          .insert({
            user_id: user.id,
            high_score: score,
            total_games_played: 1,
            total_levels_completed: level,
            best_level: level,
            current_month_score: score,
            current_month_year: currentMonthYear,
          });
      }
    } catch (error) {
      console.error("Error saving game result:", error);
    }
  }, [user]);

  return { saveGameResult };
}
