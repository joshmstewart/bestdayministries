import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { awardCoinReward } from "@/utils/awardCoinReward";

type TimeTrialDuration = 60 | 120 | 300;

const DURATIONS: { value: TimeTrialDuration; label: string }[] = [
  { value: 60, label: "1 Min" },
  { value: 120, label: "2 Min" },
  { value: 300, label: "5 Min" },
];

export const CashRegisterRewardsManager = () => {
  const [awarding, setAwarding] = useState(false);

  const awardMonthlyRewards = async () => {
    const currentMonth = new Date().toISOString().slice(0, 7); // "2026-01"
    setAwarding(true);
    
    try {
      let totalAwarded = 0;
      
      // Process each duration
      for (const duration of DURATIONS) {
        // Get top 10 for this duration
        const { data: topPlayers, error } = await supabase
          .from("cash_register_time_trial_bests")
          .select("user_id, best_levels, best_score")
          .eq("duration_seconds", duration.value)
          .gt("best_levels", 0)
          .order("best_levels", { ascending: false })
          .order("best_score", { ascending: false })
          .limit(10);

        if (error) throw error;
        if (!topPlayers || topPlayers.length === 0) continue;

        // Award each player based on rank
        for (let i = 0; i < topPlayers.length; i++) {
          const player = topPlayers[i];
          const rank = i + 1;
          
          // Check if already awarded for this month/duration
          const { data: existing } = await supabase
            .from("cash_register_leaderboard_rewards")
            .select("id")
            .eq("user_id", player.user_id)
            .eq("reward_month", currentMonth)
            .eq("duration_seconds", duration.value)
            .maybeSingle();

          if (existing) continue; // Already awarded

          let coinsAwarded = 0;
          const rewardKeys: string[] = [];

          // Top 3 gets all three rewards
          if (rank <= 3) {
            rewardKeys.push("time_trial_top_3", "time_trial_top_5", "time_trial_top_10");
          } else if (rank <= 5) {
            // Ranks 4-5 get top 5 and top 10
            rewardKeys.push("time_trial_top_5", "time_trial_top_10");
          } else {
            // Ranks 6-10 get top 10 only
            rewardKeys.push("time_trial_top_10");
          }

          // Award each reward
          for (const key of rewardKeys) {
            const awarded = await awardCoinReward(
              player.user_id,
              key,
              `${duration.label} Time Trial - Rank #${rank} (${currentMonth})`
            );
            coinsAwarded += awarded;
          }

          // Record the award
          if (coinsAwarded > 0) {
            await supabase.from("cash_register_leaderboard_rewards").insert({
              user_id: player.user_id,
              reward_month: currentMonth,
              duration_seconds: duration.value,
              rank,
              coins_awarded: coinsAwarded,
            });
            totalAwarded++;
          }
        }
      }

      if (totalAwarded > 0) {
        toast.success(`Monthly rewards awarded to ${totalAwarded} players!`);
      } else {
        toast.info("No new rewards to award (already processed or no players)");
      }
    } catch (error) {
      console.error("Error awarding monthly rewards:", error);
      toast.error("Failed to award monthly rewards");
    } finally {
      setAwarding(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Monthly Leaderboard Rewards
          </CardTitle>
          <CardDescription>
            Award coins to top performers in Time Trial mode for the current month.
            Top 3 receive all tier rewards, ranks 4-5 get Top 5 + Top 10 rewards, 
            ranks 6-10 get Top 10 rewards only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={awardMonthlyRewards}
            disabled={awarding}
            className="w-full sm:w-auto"
          >
            {awarding ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Gift className="h-4 w-4 mr-2" />
            )}
            Award Monthly Rewards
          </Button>
          <p className="text-sm text-muted-foreground mt-3">
            This will check all three durations (1 min, 2 min, 5 min) and award coins 
            to the top 10 players in each. Players who have already been awarded for 
            this month will be skipped.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
