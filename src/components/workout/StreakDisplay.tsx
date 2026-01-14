import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Trophy } from "lucide-react";
import { startOfWeek, subWeeks, format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

interface StreakDisplayProps {
  userId: string;
  className?: string;
}

export const StreakDisplay = ({ userId, className }: StreakDisplayProps) => {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  
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

  const { data: weeklyGoalCompletions = [] } = useQuery({
    queryKey: ["workout-weekly-streak", userId],
    queryFn: async () => {
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

  const calculateWeekStreak = () => {
    const weeksData = new Map<string, Set<string>>();
    
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
    let checkWeek = subWeeks(weekStart, 1);
    
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
  
  const thisWeekDays = new Set<string>();
  thisWeekLogs.forEach(log => {
    thisWeekDays.add(format(new Date(log.completed_at), "yyyy-MM-dd"));
  });

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
    };
  });

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0 flex flex-col h-full">
        {/* Streak Section - Sunburst */}
        <div className="p-4 bg-gradient-sunburst text-white">
          <div className="flex items-center gap-3">
            <div className="relative bg-white/20 rounded-full p-2">
              <Flame className={cn(
                "h-8 w-8 text-white transition-all",
                weekStreak > 0 ? "animate-pulse" : "opacity-70"
              )} />
              {weekStreak >= 4 && (
                <Trophy className="h-4 w-4 absolute -top-1 -right-1 text-yellow-300" />
              )}
            </div>
            <div>
              <div className="text-3xl font-bold">{weekStreak}</div>
              <div className="text-sm text-white/80">week streak</div>
            </div>
          </div>
        </div>
        
        {/* Mini week calendar - White */}
        <div className="flex justify-between p-3 bg-white mt-auto">
          {weekDays.map((day, i) => (
            <div 
              key={i}
              className={cn(
                "flex flex-col items-center gap-1",
                day.isToday && "font-bold"
              )}
            >
              <span className="text-xs text-muted-foreground">{day.dayLabel}</span>
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                day.hasActivity 
                  ? "bg-primary text-primary-foreground" 
                  : day.isToday 
                    ? "border-2 border-dashed border-primary" 
                    : "bg-muted"
              )}>
                {day.hasActivity ? "✓" : format(day.date, "d")}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
