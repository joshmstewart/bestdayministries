import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, Timer, Gift, Loader2 } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { TimeTrialDuration } from "./CashRegisterModeSelect";
import { awardCoinReward } from "@/utils/awardCoinReward";
import { toast } from "sonner";

interface LeaderboardEntry {
  user_id: string;
  best_levels: number;
  best_score: number;
  display_name: string;
  avatar_number: number;
}

const DURATIONS: { value: TimeTrialDuration; label: string }[] = [
  { value: 60, label: "1 Min" },
  { value: 120, label: "2 Min" },
  { value: 300, label: "5 Min" },
];

export function TimeTrialLeaderboard() {
  const { user, isAdmin } = useAuth();
  const [selectedDuration, setSelectedDuration] = useState<TimeTrialDuration>(60);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState(false);

  useEffect(() => {
    loadLeaderboard(selectedDuration);
  }, [selectedDuration]);

  const loadLeaderboard = async (duration: TimeTrialDuration) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cash_register_time_trial_bests")
        .select("user_id, best_levels, best_score")
        .eq("duration_seconds", duration)
        .gt("best_levels", 0)
        .order("best_levels", { ascending: false })
        .order("best_score", { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = data.map((d) => d.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_number")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        const entriesWithProfiles = data.map((d) => ({
          ...d,
          display_name: profileMap.get(d.user_id)?.display_name || "Anonymous",
          avatar_number: profileMap.get(d.user_id)?.avatar_number || 1,
        }));

        setEntries(entriesWithProfiles);
      } else {
        setEntries([]);
      }
    } catch (error) {
      console.error("Error loading time trial leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const awardMonthlyRewards = async () => {
    if (!isAdmin) return;
    
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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return (
          <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-muted-foreground">
            {rank}
          </span>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4 text-orange-500" />
            Time Trial Leaderboard
          </CardTitle>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={awardMonthlyRewards}
              disabled={awarding}
              title="Award coins to top performers for current month"
            >
              {awarding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Gift className="h-4 w-4 mr-1" />
              )}
              Award Monthly
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={selectedDuration.toString()}
          onValueChange={(v) => setSelectedDuration(parseInt(v) as TimeTrialDuration)}
        >
          <TabsList className="grid w-full grid-cols-3 mb-4">
            {DURATIONS.map((d) => (
              <TabsTrigger key={d.value} value={d.value.toString()}>
                {d.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {DURATIONS.map((d) => (
            <TabsContent key={d.value} value={d.value.toString()}>
              {loading ? (
                <div className="text-center text-sm text-muted-foreground py-4">
                  Loading...
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-4">
                  No scores yet. Be the first!
                </div>
              ) : (
                <div className="space-y-2">
                  {entries.map((entry, index) => (
                    <div
                      key={entry.user_id}
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        entry.user_id === user?.id
                          ? "bg-primary/10 border border-primary/20"
                          : "bg-muted/50"
                      }`}
                    >
                      <div className="flex-shrink-0 w-6 flex justify-center">
                        {getRankIcon(index + 1)}
                      </div>
                      <AvatarDisplay
                        avatarNumber={entry.avatar_number}
                        displayName={entry.display_name}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {entry.display_name}
                          {entry.user_id === user?.id && (
                            <span className="text-xs text-primary ml-1">(You)</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-1" title="Levels Completed">
                          <Trophy className="h-3.5 w-3.5 text-primary" />
                          <span className="font-semibold">{entry.best_levels}</span>
                        </div>
                        <div
                          className="flex items-center gap-1 text-muted-foreground"
                          title="Score"
                        >
                          <span className="text-xs">({entry.best_score})</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
