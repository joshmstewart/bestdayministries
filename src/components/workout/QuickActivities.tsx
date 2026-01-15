import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { cn } from "@/lib/utils";
import { showErrorToastWithCopy } from "@/lib/errorToast";

interface QuickActivitiesProps {
  userId?: string;
}

export const QuickActivities = ({ userId }: QuickActivitiesProps) => {
  const queryClient = useQueryClient();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
  const today = format(new Date(), "yyyy-MM-dd");

  // Fetch activities
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["workout-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_activities")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch today's logged activities
  const { data: todayLogs = [] } = useQuery({
    queryKey: ["workout-logs-today", userId, today],
    queryFn: async () => {
      if (!userId) return [];
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      const { data, error } = await supabase
        .from("user_workout_logs")
        .select("activity_id")
        .eq("user_id", userId)
        .eq("workout_type", "activity")
        .gte("completed_at", startOfDay.toISOString())
        .lte("completed_at", endOfDay.toISOString());
      
      if (error) throw error;
      return data.map(log => log.activity_id);
    },
    enabled: !!userId,
  });

  const logActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      if (!userId) throw new Error("Must be logged in");
      const { error } = await supabase
        .from("user_workout_logs")
        .insert({
          user_id: userId,
          workout_type: "activity",
          activity_id: activityId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-logs"] });
      toast.success("Activity logged! 🎉");
    },
    onError: (error) => {
      showErrorToastWithCopy("Failed to log activity", error);
    },
  });

  if (!userId) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Please log in to track your activities.</p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No activities available yet.</p>
      </Card>
    );
  }

  // Group activities by category
  const groupedActivities = activities.reduce((acc, activity) => {
    const cat = activity.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(activity);
    return acc;
  }, {} as Record<string, typeof activities>);

  const categoryLabels: Record<string, string> = {
    walking: "🚶 Walking & Running",
    play: "⚽ Sports & Play",
    home: "🏠 Home Exercise",
    general: "💪 General",
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground text-center">
        Tap an activity to log it for today. You can log each activity once per day.
      </p>

      {Object.entries(groupedActivities).map(([category, categoryActivities]) => (
        <div key={category}>
          <h3 className="text-sm font-medium mb-3 text-muted-foreground">
            {categoryLabels[category] || category}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {categoryActivities.map((activity) => {
              const isLoggedToday = todayLogs.includes(activity.id);
              return (
                <Button
                  key={activity.id}
                  variant="outline"
                  className={cn(
                    "h-auto py-4 px-4 justify-start gap-3 transition-all",
                    isLoggedToday && "ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20"
                  )}
                  onClick={() => !isLoggedToday && logActivityMutation.mutate(activity.id)}
                  disabled={isLoggedToday || logActivityMutation.isPending}
                >
                  <span className="text-2xl">{activity.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{activity.name}</div>
                    {activity.description && (
                      <div className="text-xs text-muted-foreground">{activity.description}</div>
                    )}
                  </div>
                  {isLoggedToday && (
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
