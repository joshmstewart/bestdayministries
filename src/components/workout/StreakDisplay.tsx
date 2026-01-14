import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Trophy, Play } from "lucide-react";
import { startOfWeek, endOfWeek, subWeeks, subDays, format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

interface StreakDisplayProps {
  userId: string;
  className?: string;
  onShowVideos?: () => void;
}

export const StreakDisplay = ({ userId, className, onShowVideos }: StreakDisplayProps) => {
  // Fetch logs from the current week
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 }); // Sunday
  
  const { data: thisWeekLogs = [] } = useQuery({
    queryKey: ["workout-week-logs", userId, format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_workout_logs")
        .select("completed_at")
        .eq("user_id", userId)
        .gte("completed_at", weekStart.toISOString())
        .order("completed_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch weekly goal completions for streak calculation
  const { data: weeklyGoalCompletions = [] } = useQuery({
    queryKey: ["workout-weekly-streak", userId],
    queryFn: async () => {
      // Get logs from the past 12 weeks to calculate streak
      const twelveWeeksAgo = subWeeks(new Date(), 12);
      const { data, error } = await supabase
        .from("user_workout_logs")
        .select("completed_at")
        .eq("user_id", userId)
        .gte("completed_at", twelveWeeksAgo.toISOString())
        .order("completed_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch user's weekly goal
  const { data: goalData } = useQuery({
    queryKey: ["workout-goal", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_workout_goals")
        .select("weekly_activity_goal")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const weeklyGoal = goalData?.weekly_activity_goal ?? 5;

  // Calculate week streak (consecutive weeks meeting goal)
  const calculateWeekStreak = () => {
    const weeksData = new Map<string, Set<string>>();
    
    // Group logs by week
    weeklyGoalCompletions.forEach(log => {
      const logDate = new Date(log.completed_at);
      const logWeekStart = startOfWeek(logDate, { weekStartsOn: 0 });
      const weekKey = format(logWeekStart, "yyyy-MM-dd");
      const dayKey = format(logDate, "yyyy-MM-dd");
      
      if (!weeksData.has(weekKey)) {
        weeksData.set(weekKey, new Set());
      }
      weeksData.get(weekKey)!.add(dayKey);
    });

    let streak = 0;
    let checkWeek = subWeeks(weekStart, 1); // Start from last week (current week is in progress)
    
    while (true) {
      const weekKey = format(checkWeek, "yyyy-MM-dd");
      const weekDays = weeksData.get(weekKey);
      
      if (weekDays && weekDays.size >= weeklyGoal) {
        streak++;
        checkWeek = subWeeks(checkWeek, 1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  const weekStreak = calculateWeekStreak();
  
  // Get unique days this week with activity
  const thisWeekDays = new Set<string>();
  thisWeekLogs.forEach(log => {
    thisWeekDays.add(format(new Date(log.completed_at), "yyyy-MM-dd"));
  });

  // Generate days of the current week for the mini calendar
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateStr = format(date, "yyyy-MM-dd");
    const hasActivity = thisWeekDays.has(dateStr);
    const today = new Date();
    
    return {
      date,
      dayLabel: format(date, "EEE")[0],
      hasActivity,
      isToday: isSameDay(date, today),
      isPast: date < today && !isSameDay(date, today),
    };
  });

  return (
    <Card className={cn("overflow-hidden h-full flex flex-col", className)}>
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="bg-gradient-to-br from-orange-500 to-red-500 p-4 text-white flex-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Flame className={cn(
                  "h-10 w-10 transition-all",
                  weekStreak > 0 ? "animate-pulse" : "opacity-50"
                )} />
                {weekStreak >= 4 && (
                  <Trophy className="h-4 w-4 absolute -top-1 -right-1 text-yellow-300" />
                )}
              </div>
              <div>
                <div className="text-3xl font-bold">{weekStreak}</div>
                <div className="text-sm opacity-90">week streak</div>
              </div>
            </div>
            
            {onShowVideos && (
              <Button 
                size="sm" 
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={onShowVideos}
              >
                <Play className="h-4 w-4 mr-1" />
                Videos
              </Button>
            )}
          </div>
          
          {/* Mini week calendar inline */}
          <div className="flex justify-between">
            {weekDays.map((day, i) => (
              <div 
                key={i}
                className={cn(
                  "flex flex-col items-center gap-1",
                  day.isToday && "font-bold"
                )}
              >
                <span className="text-xs text-white/70">{day.dayLabel}</span>
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs",
                  day.hasActivity 
                    ? "bg-white text-orange-600" 
                    : day.isToday 
                      ? "border-2 border-dashed border-white/60" 
                      : "bg-white/20"
                )}>
                  {day.hasActivity ? "✓" : format(day.date, "d")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
