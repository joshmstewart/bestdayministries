import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, Coins } from "lucide-react";
import { startOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";

interface WeeklyGoalCardProps {
  userId: string;
  className?: string;
}

export const WeeklyGoalCard = ({ userId, className }: WeeklyGoalCardProps) => {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });

  // Fetch user's goal
  const { data: goal } = useQuery({
    queryKey: ["workout-goal", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_workout_goals")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (error) throw error;
      return data || { weekly_activity_goal: 5, coin_reward: 50 };
    },
  });

  // Fetch this week's completed workouts
  const { data: completedCount = 0 } = useQuery({
    queryKey: ["workout-logs-week", userId, weekStart.toISOString()],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_workout_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("completed_at", weekStart.toISOString())
        .lte("completed_at", weekEnd.toISOString());
      
      if (error) throw error;
      return count || 0;
    },
  });

  const weeklyGoal = goal?.weekly_activity_goal || 5;
  const coinReward = goal?.coin_reward || 50;
  const progress = Math.min((completedCount / weeklyGoal) * 100, 100);
  const isGoalMet = completedCount >= weeklyGoal;
  const remaining = Math.max(0, weeklyGoal - completedCount);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0 h-full">
        <div className={cn(
          "p-4 h-full transition-colors flex flex-col",
          isGoalMet 
            ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-white" 
            : "bg-soft-ribbon"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className={cn("h-5 w-5", isGoalMet ? "text-white" : "text-primary-foreground")} />
              <span className="font-semibold text-primary-foreground">Weekly Goal</span>
            </div>
            {isGoalMet && (
              <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
                <Trophy className="h-4 w-4" />
                <span className="text-sm font-medium">Complete!</span>
              </div>
            )}
          </div>

          <div className="flex items-end gap-2 mb-3">
            <span className={cn("text-4xl font-bold", isGoalMet ? "text-white" : "text-primary-foreground")}>{completedCount}</span>
            <span className={cn("text-lg mb-1", isGoalMet ? "text-white/80" : "text-primary-foreground/70")}>
              / {weeklyGoal}
            </span>
          </div>

          <Progress 
            value={progress} 
            className={cn("h-3", isGoalMet ? "[&>div]:bg-white/80" : "[&>div]:bg-primary-foreground")} 
          />

          <div className={cn(
            "flex items-center justify-between mt-auto pt-3 text-sm",
            isGoalMet ? "text-white/90" : "text-primary-foreground/80"
          )}>
            {isGoalMet ? (
              <div className="flex items-center gap-1">
                <Coins className="h-4 w-4" />
                <span>You earned {coinReward} coins!</span>
              </div>
            ) : (
              <span>{remaining} more to earn {coinReward} coins</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
