import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TextToSpeech } from "@/components/TextToSpeech";
import { Flame, Gift, Trophy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Milestone {
  id: string;
  days_required: number;
  bonus_coins: number;
  free_sticker_packs: number;
  badge_name: string | null;
  badge_icon: string | null;
  description: string | null;
}

interface UserStreak {
  current_streak: number;
  longest_streak: number;
  next_milestone_days: number | null;
  total_login_days: number;
}

export function StreakMeter() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextMilestone, setNextMilestone] = useState<Milestone | null>(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user) {
      setLoading(false);
      return;
    }
    loadStreakData();

    // Realtime subscription
    const channel = supabase
      .channel(`streak-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_streaks",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadStreakData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAuthenticated, authLoading]);

  const loadStreakData = async () => {
    if (!user) return;

    try {
      // Load milestones and user streak in parallel
      const [milestonesRes, streakRes] = await Promise.all([
        supabase
          .from("streak_milestones")
          .select("*")
          .eq("is_active", true)
          .order("days_required", { ascending: true }),
        supabase
          .from("user_streaks")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (milestonesRes.error) throw milestonesRes.error;

      setMilestones(milestonesRes.data || []);

      if (streakRes.data) {
        setStreak(streakRes.data);
        // Find next milestone
        const next = (milestonesRes.data || []).find(
          (m) => m.days_required > (streakRes.data?.current_streak || 0)
        );
        setNextMilestone(next || null);
      } else {
        // Create initial streak record
        const { data: newStreak } = await supabase
          .from("user_streaks")
          .insert({
            user_id: user.id,
            current_streak: 0,
            longest_streak: 0,
            total_login_days: 0,
          })
          .select()
          .single();

        setStreak(newStreak);
        setNextMilestone(milestonesRes.data?.[0] || null);
      }
    } catch (error) {
      console.error("Error loading streak data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-orange-200/50">
        <CardContent className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated || !streak) {
    return null;
  }

  const currentStreak = streak.current_streak || 0;
  const daysToNext = nextMilestone
    ? nextMilestone.days_required - currentStreak
    : 0;
  const progressToNext = nextMilestone
    ? Math.min(100, ((currentStreak / nextMilestone.days_required) * 100))
    : 100;

  // Get previous milestone for context
  const prevMilestone = milestones.find(
    (m, i) => milestones[i + 1]?.days_required > currentStreak && m.days_required <= currentStreak
  ) || null;

  const progressWithinSegment = nextMilestone && prevMilestone
    ? ((currentStreak - prevMilestone.days_required) / (nextMilestone.days_required - prevMilestone.days_required)) * 100
    : progressToNext;

  return (
    <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-orange-200/50">
      <CardContent className="py-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-full",
              currentStreak > 0 
                ? "bg-gradient-to-br from-orange-400 to-red-500 animate-pulse" 
                : "bg-gray-200 dark:bg-gray-700"
            )}>
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-orange-600">
                  {currentStreak}
                </span>
                <span className="text-sm text-muted-foreground">day streak</span>
              </div>
            </div>
          </div>
          <TextToSpeech
            text={`You have a ${currentStreak} day login streak! ${nextMilestone ? `${daysToNext} more days to unlock ${nextMilestone.badge_name}` : 'You reached all milestones!'}`}
            size="icon"
          />
        </div>

        {/* Progress bar */}
        {nextMilestone && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{prevMilestone ? `${prevMilestone.days_required} days` : "Start"}</span>
              <span className="font-medium text-orange-600">
                {nextMilestone.badge_icon} {nextMilestone.days_required} days
              </span>
            </div>
            <div className="relative">
              <Progress
                value={progressWithinSegment}
                className="h-3 bg-orange-100 dark:bg-orange-900/30"
              />
              {/* Flame indicator on progress */}
              <div
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-500"
                style={{ left: `calc(${Math.min(95, progressWithinSegment)}% - 8px)` }}
              >
                <Flame className="w-4 h-4 text-orange-500 drop-shadow-md" />
              </div>
            </div>
          </div>
        )}

        {/* Next reward preview */}
        {nextMilestone && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/60 dark:bg-gray-800/60">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-purple-500" />
              <span className="text-sm">
                <span className="font-medium">{daysToNext}</span> days to:
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-yellow-600 font-medium">
                +{nextMilestone.bonus_coins} coins
              </span>
              <span className="text-purple-600 font-medium">
                +{nextMilestone.free_sticker_packs} pack{nextMilestone.free_sticker_packs > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* All milestones reached */}
        {!nextMilestone && currentStreak > 0 && (
          <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30">
            <Trophy className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
              All milestones reached! You're a legend!
            </span>
          </div>
        )}

        {/* Milestone dots */}
        <div className="flex justify-between items-center pt-1">
          {milestones.slice(0, 6).map((milestone) => {
            const achieved = currentStreak >= milestone.days_required;
            return (
              <div
                key={milestone.id}
                className={cn(
                  "flex flex-col items-center",
                  achieved ? "opacity-100" : "opacity-40"
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                    achieved
                      ? "bg-gradient-to-br from-orange-400 to-yellow-400 text-white shadow-md"
                      : "bg-gray-200 dark:bg-gray-700"
                  )}
                >
                  {achieved ? "✓" : milestone.days_required}
                </div>
                <span className="text-[10px] mt-0.5 text-muted-foreground">
                  {milestone.badge_icon || "🏆"}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
