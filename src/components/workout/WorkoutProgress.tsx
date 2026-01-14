import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, Flame } from "lucide-react";
import { startOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";

interface WorkoutProgressProps {
  userId: string;
  className?: string;
}

export const WorkoutProgress = ({ userId, className }: WorkoutProgressProps) => {
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

  return (
    <Card className={cn("bg-gradient-to-r from-primary/10 to-accent/10", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          Weekly Goal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className={cn("h-6 w-6", isGoalMet ? "text-orange-500" : "text-muted-foreground")} />
              <span className="text-2xl font-bold">{completedCount}</span>
              <span className="text-muted-foreground">/ {weeklyGoal} activities</span>
            </div>
            {isGoalMet && (
              <div className="flex items-center gap-1 text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1 rounded-full">
                <Trophy className="h-4 w-4" />
                <span className="text-sm font-medium">Goal met!</span>
              </div>
            )}
          </div>
          
          <Progress value={progress} className="h-3" />
          
          <p className="text-sm text-muted-foreground">
            {isGoalMet 
              ? `🎉 You earned ${coinReward} coins this week!`
              : `Complete ${weeklyGoal - completedCount} more to earn ${coinReward} coins!`
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
