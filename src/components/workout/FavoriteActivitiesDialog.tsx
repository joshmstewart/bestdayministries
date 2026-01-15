import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { showErrorToastWithCopy } from "@/lib/errorToast";

interface FavoriteActivitiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export const FavoriteActivitiesDialog = ({
  open,
  onOpenChange,
  userId,
}: FavoriteActivitiesDialogProps) => {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch all activities
  const { data: allActivities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ["workout-activities-all"],
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

  // Fetch user's current favorites
  const { data: currentFavorites = [], isLoading: loadingFavorites } = useQuery({
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

  // Initialize selected from current favorites
  useEffect(() => {
    if (currentFavorites.length > 0) {
      setSelectedIds(currentFavorites);
    }
  }, [currentFavorites]);

  const saveMutation = useMutation({
    mutationFn: async (activityIds: string[]) => {
      // Delete all current favorites
      const { error: deleteError } = await supabase
        .from("user_favorite_activities")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      // Insert new favorites with order
      if (activityIds.length > 0) {
        const inserts = activityIds.map((id, index) => ({
          user_id: userId,
          activity_id: id,
          display_order: index,
        }));

        const { error: insertError } = await supabase
          .from("user_favorite_activities")
          .insert(inserts);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-favorite-activities"] });
      toast.success("Favorites saved!");
      onOpenChange(false);
    },
    onError: (error) => {
      showErrorToastWithCopy("Failed to save favorites", error);
    },
  });

  const toggleActivity = (activityId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(activityId)) {
        return prev.filter((id) => id !== activityId);
      }
      if (prev.length >= 12) {
        toast.error("Maximum 12 favorites allowed");
        return prev;
      }
      return [...prev, activityId];
    });
  };

  const isLoading = loadingActivities || loadingFavorites;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose Your Favorites</DialogTitle>
          <DialogDescription>
            Select up to 12 activities for your Quick Log ({selectedIds.length}/12)
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            <div className="grid grid-cols-3 gap-2">
              {allActivities.map((activity) => {
                const isSelected = selectedIds.includes(activity.id);
                return (
                  <Button
                    key={activity.id}
                    variant="ghost"
                    className={cn(
                      "h-auto flex-col gap-1 py-3 px-2 relative transition-all",
                      isSelected
                        ? "bg-primary/20 ring-2 ring-primary"
                        : "hover:bg-muted"
                    )}
                    onClick={() => toggleActivity(activity.id)}
                  >
                    <span className="text-2xl">{activity.icon}</span>
                    <span className="text-xs font-medium text-center leading-tight truncate w-full">
                      {activity.name}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="absolute top-1 right-1 h-4 w-4 text-primary" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={() => saveMutation.mutate(selectedIds)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save Favorites"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
