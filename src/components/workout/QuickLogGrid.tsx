import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Settings2, Zap, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { showErrorToastWithCopy } from "@/lib/errorToast";
import { FavoriteActivitiesDialog } from "./FavoriteActivitiesDialog";
import { useWorkoutImageGeneration } from "@/hooks/useWorkoutImageGeneration";

interface QuickLogGridProps {
  userId: string;
  onLog?: () => void;
  onGeneratingChange?: (isGenerating: boolean) => void;
}

export const QuickLogGrid = ({ userId, onLog, onGeneratingChange }: QuickLogGridProps) => {
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [showFavoritesDialog, setShowFavoritesDialog] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<{ id: string; name: string } | null>(null);
  
  // Image generation hook
  const { selectedAvatar, generateActivityImage, isGenerating } = useWorkoutImageGeneration(userId);

  // Notify parent of generating state changes
  useEffect(() => {
    onGeneratingChange?.(isGenerating);
  }, [isGenerating, onGeneratingChange]);

  // Fetch user's favorite activity IDs
  const { data: favoriteIds = [] } = useQuery({
    queryKey: ["user-favorite-activities", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_favorite_activities")
        .select("activity_id")
        .eq("user_id", userId)
        .order("display_order");

      if (error) throw error;
      return data.map((f) => f.activity_id);
    },
    enabled: !!userId,
  });

  // Fetch activities - either favorites or default top 12
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["workout-activities", favoriteIds],
    queryFn: async () => {
      if (favoriteIds.length > 0) {
        // Fetch favorite activities in order
        const { data, error } = await supabase
          .from("workout_activities")
          .select("*")
          .in("id", favoriteIds)
          .eq("is_active", true);

        if (error) throw error;
        
        // Sort by the order in favoriteIds
        return (data || []).sort(
          (a, b) => favoriteIds.indexOf(a.id) - favoriteIds.indexOf(b.id)
        );
      } else {
        // Default: top 12 by display_order
        const { data, error } = await supabase
          .from("workout_activities")
          .select("*")
          .eq("is_active", true)
          .order("display_order")
          .limit(12);

        if (error) throw error;
        return data;
      }
    },
  });

  // Fetch today's logged activities
  const { data: todayLogs = [] } = useQuery({
    queryKey: ["workout-logs-today", userId, today],
    queryFn: async () => {
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
  });

  const logActivityMutation = useMutation({
    mutationFn: async (activity: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from("user_workout_logs")
        .insert({
          user_id: userId,
          workout_type: "activity",
          activity_id: activity.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      return { logId: data.id, activityName: activity.name };
    },
    onSuccess: async ({ logId, activityName }) => {
      // Fire confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff6b35', '#ffa726', '#ffcc02'],
      });
      
      queryClient.invalidateQueries({ queryKey: ["workout-logs"] });
      queryClient.invalidateQueries({ queryKey: ["workout-logs-today"] });
      queryClient.invalidateQueries({ queryKey: ["workout-logs-week"] });
      queryClient.invalidateQueries({ queryKey: ["workout-streak-logs"] });
      queryClient.invalidateQueries({ queryKey: ["workout-image-today"] });
      toast.success("Activity logged! 🎉");
      setSelectedActivity(null);
      onLog?.();
      
      // Generate AI image if user has an avatar selected
      if (selectedAvatar?.id) {
        toast.info("✨ Generating your workout image...", { duration: 3000 });
        await generateActivityImage(activityName, logId);
      }
    },
    onError: (error) => {
      showErrorToastWithCopy("Failed to log activity", error);
      setSelectedActivity(null);
    },
  });

  const handleActivityClick = (activity: { id: string; name: string }) => {
    if (selectedActivity?.id === activity.id) {
      // Deselect if clicking the same activity
      setSelectedActivity(null);
    } else {
      setSelectedActivity(activity);
    }
  };

  const handleSubmit = () => {
    if (selectedActivity) {
      logActivityMutation.mutate(selectedActivity);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-yellow-500" />
              Quick Log
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFavoritesDialog(true)}
              title="Customize favorites"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {activities.map((activity) => {
              const isLoggedToday = todayLogs.includes(activity.id);
              const isSelected = selectedActivity?.id === activity.id;
              return (
                <Button
                  key={activity.id}
                  variant="ghost"
                  className={cn(
                    "h-auto flex-col gap-1 py-3 px-2 relative transition-all",
                    isLoggedToday
                      ? "bg-green-100 dark:bg-green-900/30 ring-2 ring-green-500"
                      : isSelected
                      ? "bg-primary/20 ring-2 ring-primary"
                      : "hover:bg-primary/10"
                  )}
                  onClick={() => !isLoggedToday && handleActivityClick({ id: activity.id, name: activity.name })}
                  disabled={isLoggedToday || logActivityMutation.isPending}
                >
                  <span className="text-3xl">{activity.icon}</span>
                  <span className="text-xs font-medium text-center leading-tight truncate w-full">
                    {activity.name}
                  </span>
                  {isLoggedToday && (
                    <CheckCircle2 className="absolute top-1 right-1 h-4 w-4 text-green-500" />
                  )}
                  {isSelected && !isLoggedToday && (
                    <div className="absolute top-1 right-1 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                      <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </Button>
              );
            })}
          </div>
          
          {/* Submit Button */}
          {selectedActivity && (
            <Button
              className="w-full mt-4 gap-2"
              onClick={handleSubmit}
              disabled={logActivityMutation.isPending}
            >
              {logActivityMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Logging...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Log {selectedActivity.name}
                </>
              )}
            </Button>
          )}
          
          <p className="text-xs text-muted-foreground text-center mt-3">
            {selectedActivity 
              ? "Tap again to deselect, or press the button above to log"
              : "Tap to select • Once per day per activity"}
          </p>
        </CardContent>
      </Card>

      <FavoriteActivitiesDialog
        open={showFavoritesDialog}
        onOpenChange={setShowFavoritesDialog}
        userId={userId}
      />
    </>
  );
};
