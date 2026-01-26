import { useCallback, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TimeTrialDuration } from "@/components/cash-register/CashRegisterModeSelect";
import { awardCoinReward } from "@/utils/awardCoinReward";

interface TimeTrialBest {
  duration_seconds: number;
  best_levels: number;
  best_score: number;
}

export function useTimeTrialStats() {
  const { user } = useAuth();
  const [bests, setBests] = useState<Map<number, TimeTrialBest>>(new Map());
  const [loading, setLoading] = useState(true);

  // Load user's best scores
  useEffect(() => {
    const loadBests = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("cash_register_time_trial_bests")
          .select("duration_seconds, best_levels, best_score")
          .eq("user_id", user.id);

        if (!error && data) {
          const bestsMap = new Map<number, TimeTrialBest>();
          data.forEach((b) => {
            bestsMap.set(b.duration_seconds, b);
          });
          setBests(bestsMap);
        }
      } catch (err) {
        console.error("Error loading time trial bests:", err);
      } finally {
        setLoading(false);
      }
    };

    loadBests();
  }, [user]);

  const saveTimeTrialResult = useCallback(
    async (
      duration: TimeTrialDuration,
      levelsCompleted: number,
      score: number
    ): Promise<{ isNewRecord: boolean; previousBest: number | null }> => {
      if (!user) return { isNewRecord: false, previousBest: null };

      const currentBest = bests.get(duration);
      const previousBest = currentBest?.best_levels ?? null;
      const isNewRecord = !currentBest || levelsCompleted > currentBest.best_levels;

      try {
        // Record the individual run
        await supabase.from("cash_register_time_trial_scores").insert({
          user_id: user.id,
          duration_seconds: duration,
          levels_completed: levelsCompleted,
          score: score,
        });

        // Update best if this is a new record
        if (isNewRecord) {
          const { error } = await supabase
            .from("cash_register_time_trial_bests")
            .upsert(
              {
                user_id: user.id,
                duration_seconds: duration,
                best_levels: levelsCompleted,
                best_score: score,
                achieved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: "user_id,duration_seconds",
              }
            );

          if (!error) {
            // Update local state
            setBests((prev) => {
              const newMap = new Map(prev);
              newMap.set(duration, {
                duration_seconds: duration,
                best_levels: levelsCompleted,
                best_score: score,
              });
              return newMap;
            });
          }

          // Award coins for setting a new record
          await awardCoinReward(
            user.id,
            "time_trial_record",
            `New ${duration / 60} minute time trial record: ${levelsCompleted} levels`
          );
        }

        // Award coins for completing a time trial
        await awardCoinReward(
          user.id,
          "time_trial_complete",
          `Completed ${duration / 60} minute time trial`
        );
      } catch (error) {
        console.error("Error saving time trial result:", error);
      }

      return { isNewRecord, previousBest };
    },
    [user, bests]
  );

  const getBestForDuration = useCallback(
    (duration: TimeTrialDuration): TimeTrialBest | null => {
      return bests.get(duration) || null;
    },
    [bests]
  );

  return {
    loading,
    bests,
    saveTimeTrialResult,
    getBestForDuration,
  };
}
