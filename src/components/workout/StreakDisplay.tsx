import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Trophy, Calendar } from "lucide-react";
import { startOfWeek, endOfWeek, subDays, format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

interface StreakDisplayProps {
  userId: string;
  className?: string;
}

export const StreakDisplay = ({ userId, className }: StreakDisplayProps) => {
  // Fetch last 7 days of logs to calculate streak
  const { data: recentLogs = [] } = useQuery({
    queryKey: ["workout-streak-logs", userId],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7);
      const { data, error } = await supabase
        .from("user_workout_logs")
        .select("completed_at")
        .eq("user_id", userId)
        .gte("completed_at", sevenDaysAgo.toISOString())
        .order("completed_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate streak
  const calculateStreak = () => {
    const uniqueDays = new Set<string>();
    recentLogs.forEach(log => {
      const day = format(new Date(log.completed_at), "yyyy-MM-dd");
      uniqueDays.add(day);
    });

    let streak = 0;
    let checkDate = new Date();
    
    // Check if today has activity
    const todayStr = format(checkDate, "yyyy-MM-dd");
    if (!uniqueDays.has(todayStr)) {
      // Check yesterday
      checkDate = subDays(checkDate, 1);
    }
    
    while (uniqueDays.has(format(checkDate, "yyyy-MM-dd"))) {
      streak++;
      checkDate = subDays(checkDate, 1);
    }
    
    return streak;
  };

  const streak = calculateStreak();
  const hasActivityToday = recentLogs.some(log => 
    isSameDay(new Date(log.completed_at), new Date())
  );

  // Generate last 7 days for the mini calendar
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const hasActivity = recentLogs.some(log => 
      format(new Date(log.completed_at), "yyyy-MM-dd") === dateStr
    );
    return {
      date,
      dayLabel: format(date, "EEE")[0],
      hasActivity,
      isToday: isSameDay(date, new Date()),
    };
  });

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="bg-gradient-to-br from-orange-500 to-red-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Flame className={cn(
                  "h-12 w-12 transition-all",
                  streak > 0 ? "animate-pulse" : "opacity-50"
                )} />
                {streak >= 7 && (
                  <Trophy className="h-5 w-5 absolute -top-1 -right-1 text-yellow-300" />
                )}
              </div>
              <div>
                <div className="text-4xl font-bold">{streak}</div>
                <div className="text-sm opacity-90">day streak</div>
              </div>
            </div>
            
            <div className="text-right">
              {hasActivityToday ? (
                <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
                  <span className="text-lg">✓</span>
                  <span className="text-sm font-medium">Done today!</span>
                </div>
              ) : (
                <div className="text-sm opacity-75">
                  Keep going!
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Mini week calendar */}
        <div className="p-3 bg-muted/50 flex justify-between">
          {last7Days.map((day, i) => (
            <div 
              key={i}
              className={cn(
                "flex flex-col items-center gap-1",
                day.isToday && "font-bold"
              )}
            >
              <span className="text-xs text-muted-foreground">{day.dayLabel}</span>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm",
                day.hasActivity 
                  ? "bg-primary text-primary-foreground" 
                  : day.isToday 
                    ? "border-2 border-dashed border-primary" 
                    : "bg-muted"
              )}>
                {day.hasActivity ? "🔥" : format(day.date, "d")}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
