import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Flame, Trophy, Gift, Sparkles } from "lucide-react";
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
        const next = (milestonesRes.data || []).find(
          (m) => m.days_required > (streakRes.data?.current_streak || 0)
        );
        setNextMilestone(next || null);
      } else {
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

  // Don't show anything while loading, not authenticated, no streak data, or streak < 2
  if (authLoading || loading || !isAuthenticated || !streak || (streak.current_streak || 0) < 2) {
    return null;
  }

  const currentStreak = streak.current_streak || 0;
  const daysToNext = nextMilestone
    ? nextMilestone.days_required - currentStreak
    : 0;

  // Get previous milestone for progress calculation
  const prevMilestone = milestones.find(
    (m, i) => milestones[i + 1]?.days_required > currentStreak && m.days_required <= currentStreak
  ) || null;

  const progressWithinSegment = nextMilestone && prevMilestone
    ? ((currentStreak - prevMilestone.days_required) / (nextMilestone.days_required - prevMilestone.days_required)) * 100
    : nextMilestone 
      ? Math.min(100, ((currentStreak / nextMilestone.days_required) * 100))
      : 100;

  // Find achieved milestones
  const achievedMilestones = milestones.filter(m => m.days_required <= currentStreak);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full",
            "bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30",
            "border border-orange-200/50 dark:border-orange-700/50",
            "hover:from-orange-200 hover:to-yellow-200 dark:hover:from-orange-900/50 dark:hover:to-yellow-900/50",
            "transition-all duration-200 hover:scale-105 active:scale-95"
          )}
        >
          <div className="p-1 rounded-full bg-gradient-to-br from-orange-400 to-red-500">
            <Flame className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{currentStreak}</span>
          {nextMilestone && (
            <div className="w-12 h-1.5 bg-orange-200/50 dark:bg-orange-900/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-400 to-yellow-500 rounded-full transition-all"
                style={{ width: `${progressWithinSegment}%` }}
              />
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-to-br from-orange-400 to-red-500">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Daily Streak</h4>
              <p className="text-xs text-muted-foreground">Keep visiting to earn rewards!</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-orange-600">{currentStreak}</p>
              <p className="text-xs text-muted-foreground">Current Streak</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{streak.longest_streak || currentStreak}</p>
              <p className="text-xs text-muted-foreground">Best Streak</p>
            </div>
          </div>

          {/* Next Milestone */}
          {nextMilestone ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Next reward in {daysToNext} day{daysToNext !== 1 ? 's' : ''}</span>
                <span className="font-medium text-orange-600">{nextMilestone.days_required} days</span>
              </div>
              <Progress value={progressWithinSegment} className="h-2 bg-orange-100 dark:bg-orange-900/30" />
              <div className="flex items-center gap-2 text-xs">
                <Gift className="w-3.5 h-3.5 text-yellow-600" />
                <span className="text-yellow-700 dark:text-yellow-400">+{nextMilestone.bonus_coins} coins</span>
                {nextMilestone.free_sticker_packs > 0 && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-purple-600 dark:text-purple-400">+{nextMilestone.free_sticker_packs} sticker pack{nextMilestone.free_sticker_packs > 1 ? 's' : ''}</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-lg">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-300">Legend Status!</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400">All milestones achieved</p>
              </div>
            </div>
          )}

          {/* Upcoming Milestones */}
          {milestones.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Milestones</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {milestones.slice(0, 6).map((milestone) => {
                  const isAchieved = milestone.days_required <= currentStreak;
                  const isNext = milestone.id === nextMilestone?.id;
                  return (
                    <div 
                      key={milestone.id}
                      className={cn(
                        "flex items-center justify-between text-xs p-2 rounded-md",
                        isAchieved && "bg-green-50 dark:bg-green-900/20",
                        isNext && "bg-orange-50 dark:bg-orange-900/20 ring-1 ring-orange-300 dark:ring-orange-700",
                        !isAchieved && !isNext && "bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {isAchieved ? (
                          <Sparkles className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30" />
                        )}
                        <span className={cn(isAchieved && "text-green-700 dark:text-green-400")}>
                          {milestone.days_required} days
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span>+{milestone.bonus_coins}</span>
                        {milestone.free_sticker_packs > 0 && <span>+{milestone.free_sticker_packs}📦</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}