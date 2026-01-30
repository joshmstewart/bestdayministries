import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Flame, Trophy } from "lucide-react";

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

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border border-orange-200/50">
      {/* Flame + streak count */}
      <div className="flex items-center gap-1.5">
        <div className="p-1.5 rounded-full bg-gradient-to-br from-orange-400 to-red-500">
          <Flame className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-bold text-orange-600">{currentStreak}</span>
      </div>

      {/* Progress bar + next reward */}
      {nextMilestone && (
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 relative">
            <Progress
              value={progressWithinSegment}
              className="h-2 bg-orange-100 dark:bg-orange-900/30"
            />
          </div>
          <div className="flex items-center gap-1 text-xs whitespace-nowrap">
            <span className="text-muted-foreground">{daysToNext}d →</span>
            <span className="text-yellow-600 font-medium">+{nextMilestone.bonus_coins}</span>
            <span className="text-purple-600 font-medium">+{nextMilestone.free_sticker_packs}📦</span>
          </div>
        </div>
      )}

      {/* All milestones reached */}
      {!nextMilestone && (
        <div className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-yellow-600" />
          <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Legend!</span>
        </div>
      )}
    </div>
  );
}
