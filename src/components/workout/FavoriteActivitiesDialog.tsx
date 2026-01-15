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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { showErrorToastWithCopy } from "@/lib/errorToast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FavoriteActivitiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const CATEGORY_OPTIONS = [
  { value: "walking", label: "🚶 Walking & Running" },
  { value: "play", label: "⚽ Sports & Play" },
  { value: "home", label: "🏠 Home Exercise" },
  { value: "general", label: "💪 General" },
];

const EMOJI_OPTIONS = ["🏃", "🚶", "🏋️", "💪", "🧘", "🎾", "⚽", "🏊", "🚴", "🧗", "🥊", "🕺", "🎯", "⭐", "🌟", "❤️"];

export const FavoriteActivitiesDialog = ({
  open,
  onOpenChange,
  userId,
}: FavoriteActivitiesDialogProps) => {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customIcon, setCustomIcon] = useState("⭐");
  const [customCategory, setCustomCategory] = useState("general");

  // Fetch all activities (admin + user's custom)
  const { data: allActivities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ["workout-activities-all", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_activities")
        .select("*")
        .or(`user_id.is.null,user_id.eq.${userId}`)
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
      queryClient.invalidateQueries({ queryKey: ["quick-log-activities"] });
      toast.success("Favorites saved!");
      onOpenChange(false);
    },
    onError: (error) => {
      showErrorToastWithCopy("Failed to save favorites", error);
    },
  });

  const createCustomMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("workout_activities")
        .insert({
          name: customName.trim(),
          description: customDescription.trim() || null,
          icon: customIcon,
          category: customCategory,
          user_id: userId,
          is_active: true,
          display_order: 100,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newActivity) => {
      queryClient.invalidateQueries({ queryKey: ["workout-activities-all"] });
      setSelectedIds((prev) => [...prev, newActivity.id]);
      setCustomName("");
      setCustomDescription("");
      setCustomIcon("⭐");
      setCustomCategory("general");
      setShowAddCustom(false);
      toast.success("Custom activity created!");
    },
    onError: (error) => {
      showErrorToastWithCopy("Failed to create activity", error);
    },
  });

  const deleteCustomMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from("workout_activities")
        .delete()
        .eq("id", activityId)
        .eq("user_id", userId);
      if (error) throw error;
      return activityId;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["workout-activities-all"] });
      queryClient.invalidateQueries({ queryKey: ["user-favorite-activities"] });
      setSelectedIds((prev) => prev.filter((id) => id !== deletedId));
      toast.success("Activity deleted");
    },
    onError: (error) => {
      showErrorToastWithCopy("Failed to delete activity", error);
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

  // Group activities by category
  const groupedActivities = allActivities.reduce((acc, activity) => {
    const cat = activity.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(activity);
    return acc;
  }, {} as Record<string, typeof allActivities>);

  const categoryOrder = ["walking", "play", "home", "general"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
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
          <ScrollArea className="h-[50vh] pr-4 -mr-4">
            <div className="space-y-4">
              {/* Add Custom Activity Section */}
              {showAddCustom ? (
                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">New Custom Activity</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddCustom(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                  <div className="grid gap-3">
                    <div className="flex gap-2">
                      <Select value={customIcon} onValueChange={setCustomIcon}>
                        <SelectTrigger className="w-16">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EMOJI_OPTIONS.map((e) => (
                            <SelectItem key={e} value={e}>
                              {e}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Activity name"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    <Input
                      placeholder="Description (optional)"
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                    />
                    <Select value={customCategory} onValueChange={setCustomCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => createCustomMutation.mutate()}
                      disabled={!customName.trim() || createCustomMutation.isPending}
                    >
                      {createCustomMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Add Activity
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAddCustom(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Custom Activity
                </Button>
              )}

              {/* Activity Categories */}
              {categoryOrder.map((category) => {
                const catActivities = groupedActivities[category];
                if (!catActivities || catActivities.length === 0) return null;
                
                const catLabel = CATEGORY_OPTIONS.find(c => c.value === category)?.label || category;
                
                return (
                  <div key={category}>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      {catLabel}
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {catActivities.map((activity) => {
                        const isSelected = selectedIds.includes(activity.id);
                        const isCustom = activity.user_id === userId;
                        return (
                          <div key={activity.id} className="relative group">
                            <Button
                              variant="ghost"
                              className={cn(
                                "h-auto w-full flex-col gap-1 py-3 px-2 relative transition-all",
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
                              {isCustom && (
                                <span className="absolute top-1 left-1 text-[10px] text-muted-foreground">✨</span>
                              )}
                            </Button>
                            {isCustom && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute -top-1 -right-1 h-6 w-6 bg-background border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteCustomMutation.mutate(activity.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
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
