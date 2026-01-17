import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RotateCcw, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, startOfDay, endOfDay } from "date-fns";

interface FitnessDataResetButtonsProps {
  userId: string;
}

export const FitnessDataResetButtons = ({ userId }: FitnessDataResetButtonsProps) => {
  const queryClient = useQueryClient();
  const [resetTodayOpen, setResetTodayOpen] = useState(false);
  const [resetAllOpen, setResetAllOpen] = useState(false);

  // Reset today's fitness data
  const resetTodayMutation = useMutation({
    mutationFn: async () => {
      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();

      // Delete today's workout logs
      await supabase
        .from("user_workout_logs")
        .delete()
        .eq("user_id", userId)
        .gte("completed_at", startOfToday)
        .lte("completed_at", endOfToday);

      // Delete today's generated images
      const { data: todayImages } = await supabase
        .from("workout_generated_images")
        .select("id, image_url")
        .eq("user_id", userId)
        .gte("created_at", startOfToday)
        .lte("created_at", endOfToday);

      if (todayImages && todayImages.length > 0) {
        // Delete from storage
        for (const img of todayImages) {
          const path = img.image_url.split("/workout-images/")[1];
          if (path) {
            await supabase.storage.from("workout-images").remove([path]);
          }
        }
        // Delete from database
        await supabase
          .from("workout_generated_images")
          .delete()
          .eq("user_id", userId)
          .gte("created_at", startOfToday)
          .lte("created_at", endOfToday);
      }
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["workout-images"] });
      queryClient.invalidateQueries({ queryKey: ["workout-weekly-progress"] });
      queryClient.invalidateQueries({ queryKey: ["celebration-generated-this-week"] });
      queryClient.invalidateQueries({ queryKey: ["todays-workout-image"] });
      queryClient.invalidateQueries({ queryKey: ["today-activities"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-goal"] });
      queryClient.invalidateQueries({ queryKey: ["workout-streak"] });
      queryClient.invalidateQueries({ queryKey: ["avatar-news-feed"] });
      toast.success(`Reset today's fitness data (${format(new Date(), "MMM d")})`);
      setResetTodayOpen(false);
    },
    onError: (error) => {
      console.error("Reset today error:", error);
      toast.error("Failed to reset today's data");
    },
  });

  // Reset all fitness data
  const resetAllMutation = useMutation({
    mutationFn: async () => {
      // Delete all workout logs
      await supabase
        .from("user_workout_logs")
        .delete()
        .eq("user_id", userId);

      // Delete all generated images
      const { data: allImages } = await supabase
        .from("workout_generated_images")
        .select("id, image_url")
        .eq("user_id", userId);

      if (allImages && allImages.length > 0) {
        // Delete from storage
        for (const img of allImages) {
          const path = img.image_url.split("/workout-images/")[1];
          if (path) {
            await supabase.storage.from("workout-images").remove([path]);
          }
        }
        // Delete from database
        await supabase
          .from("workout_generated_images")
          .delete()
          .eq("user_id", userId);
      }

      // Delete avatar ownership (but keep free ones)
      await supabase
        .from("user_fitness_avatars")
        .delete()
        .eq("user_id", userId);

      // Delete location pack ownership
      await supabase
        .from("user_workout_location_packs")
        .delete()
        .eq("user_id", userId);
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["workout-images"] });
      queryClient.invalidateQueries({ queryKey: ["workout-weekly-progress"] });
      queryClient.invalidateQueries({ queryKey: ["celebration-generated-this-week"] });
      queryClient.invalidateQueries({ queryKey: ["todays-workout-image"] });
      queryClient.invalidateQueries({ queryKey: ["today-activities"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-goal"] });
      queryClient.invalidateQueries({ queryKey: ["workout-streak"] });
      queryClient.invalidateQueries({ queryKey: ["user-avatars"] });
      queryClient.invalidateQueries({ queryKey: ["user-location-packs"] });
      queryClient.invalidateQueries({ queryKey: ["user-selected-fitness-avatar"] });
      queryClient.invalidateQueries({ queryKey: ["avatar-news-feed"] });
      toast.success("Reset all fitness data");
      setResetAllOpen(false);
    },
    onError: (error) => {
      console.error("Reset all error:", error);
      toast.error("Failed to reset all data");
    },
  });

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setResetTodayOpen(true)}
          className="text-xs gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Today
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setResetAllOpen(true)}
          className="text-xs gap-1.5 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Reset All
        </Button>
      </div>

      {/* Reset Today Confirmation */}
      <AlertDialog open={resetTodayOpen} onOpenChange={setResetTodayOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Today's Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete today's ({format(new Date(), "MMMM d, yyyy")}) workout logs 
              and generated images. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetTodayMutation.mutate()}
              disabled={resetTodayMutation.isPending}
            >
              {resetTodayMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Reset Today
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset All Confirmation */}
      <AlertDialog open={resetAllOpen} onOpenChange={setResetAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset ALL Fitness Data?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will permanently delete:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>All workout logs and streaks</li>
                <li>All generated images</li>
                <li>All avatar purchases/selections</li>
                <li>All location pack purchases</li>
              </ul>
              <p className="font-medium text-destructive">This action cannot be undone!</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetAllMutation.mutate()}
              disabled={resetAllMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {resetAllMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
