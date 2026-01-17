import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Image as ImageIcon, User, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { WorkoutImageDetailDialog } from "./WorkoutImageDetailDialog";

interface CurrentAvatarDisplayProps {
  userId: string;
  className?: string;
  isGenerating?: boolean;
  onSelectAvatarClick?: () => void;
}

export const CurrentAvatarDisplay = ({ userId, className, isGenerating = false, onSelectAvatarClick }: CurrentAvatarDisplayProps) => {
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Get user's display name
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile-display-name", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Reset today's workout data mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // Delete today's generated images
      const { error: imgError } = await supabase
        .from("workout_generated_images")
        .delete()
        .eq("user_id", userId)
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString());

      if (imgError) throw imgError;

      // Delete today's workout logs
      const { error: logError } = await supabase
        .from("user_workout_logs")
        .delete()
        .eq("user_id", userId)
        .gte("completed_at", startOfDay.toISOString())
        .lte("completed_at", endOfDay.toISOString());

      if (logError) throw logError;
    },
    onSuccess: () => {
      // Invalidate all relevant queries - must match exact query keys used in components
      queryClient.invalidateQueries({ queryKey: ["workout-image-today"] });
      queryClient.invalidateQueries({ queryKey: ["workout-logs-today"] }); // QuickLogGrid uses this
      queryClient.invalidateQueries({ queryKey: ["workout-logs"] });
      queryClient.invalidateQueries({ queryKey: ["workout-logs-week"] });
      queryClient.invalidateQueries({ queryKey: ["workout-streak-logs"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-workout-goal"] });
      toast.success("Today's workout data reset!");
    },
    onError: (error) => {
      console.error("Reset error:", error);
      toast.error("Failed to reset workout data");
    },
  });

  // Get user's EXPLICITLY selected avatar (not default)
  const { data: hasExplicitSelection, isLoading: loadingAvatar } = useQuery({
    queryKey: ["user-has-explicit-avatar-selection", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_fitness_avatars")
        .select("avatar_id, fitness_avatars(*)")
        .eq("user_id", userId)
        .eq("is_selected", true)
        .maybeSingle();

      if (!error && data?.fitness_avatars) {
        return data.fitness_avatars;
      }
      
      return null; // No explicit selection
    },
    enabled: !!userId,
  });

  // Get today's most recent generated image for this user (prefer activity images so celebrations don't overwrite the workout preview)
  const { data: todayImage, isLoading: loadingImage } = useQuery({
    queryKey: ["workout-image-today", userId, today],
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("workout_generated_images")
        .select("*")
        .eq("user_id", userId)
        .eq("is_test", false) // Exclude admin test images
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const images = data || [];
      // Prefer latest ACTIVITY image (so a later celebration doesn't hide the actual workout image)
      return images.find((img) => img.image_type === "activity") ?? images[0] ?? null;
    },
    enabled: !!userId,
  });

  const userName = userProfile?.display_name || "You";
  const formattedDate = format(new Date(), "MMM d");

  if (loadingAvatar || loadingImage) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-0 flex items-center justify-center aspect-square">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Show generating state when image is being created
  if (isGenerating) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-0 relative">
          <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/30 flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium text-foreground">Creating your image...</p>
            <p className="text-xs text-muted-foreground mt-1">This may take a moment ✨</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If there's a generated image for today BY THIS USER, show it
  if (todayImage?.image_url) {
    // Build display text: "Joshie S Danced" format
    const activityVerb = todayImage.activity_name || "Worked Out";
    const displayTitle = `${userName} ${activityVerb}`;

    return (
      <>
        <Card className={cn("overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all", className)} onClick={() => setShowDetailDialog(true)}>
          <CardContent className="p-0 relative">
            <div className="aspect-square">
              <img
                src={todayImage.image_url}
                alt={todayImage.activity_name || "Today's workout"}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <p className="text-white text-sm font-medium">
                {todayImage.image_type === "celebration" 
                  ? "🏆 Goal Achieved!" 
                  : displayTitle}
              </p>
              <p className="text-white/70 text-xs">{formattedDate}</p>
              {todayImage.location_name && (
                <p className="text-white/70 text-xs">📍 {todayImage.location_name}</p>
              )}
            </div>
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  resetMutation.mutate();
                }}
                disabled={resetMutation.isPending}
                className="bg-red-500/90 hover:bg-red-600 text-white text-xs px-2 py-1 h-auto"
              >
                {resetMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </>
                )}
              </Button>
              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                Today ✨
              </span>
            </div>
          </CardContent>
        </Card>

        <WorkoutImageDetailDialog
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
          image={todayImage}
          userName={userName}
        />
      </>
    );
  }

  // If user hasn't explicitly selected an avatar, show the "Pick Avatar" prompt
  if (!hasExplicitSelection) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-0 relative">
          <div className="aspect-square bg-gradient-to-br from-muted/30 to-muted/60 flex flex-col items-center justify-center p-6">
            {/* Large dashed oval placeholder with user icon inside */}
            <div className="w-[60%] h-[50%] rounded-full border-4 border-dashed border-muted-foreground/30 flex items-center justify-center mb-4">
              <User className="w-1/3 h-1/2 text-muted-foreground/25" strokeWidth={1} />
            </div>
            
            {/* CTA section */}
            <p className="text-base font-semibold text-foreground mb-1 text-center">
              Choose Your Fitness Buddy!
            </p>
            <p className="text-sm text-muted-foreground mb-3 text-center">
              Pick an avatar to generate workout images
            </p>
            <Button 
              onClick={onSelectAvatarClick}
              className="gap-2"
              size="default"
            >
              <Sparkles className="h-4 w-4" />
              Pick Avatar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show the selected avatar's preview image (ready for workout)
  const avatarImageUrl = hasExplicitSelection?.preview_image_url || hasExplicitSelection?.image_url;
  const avatarName = hasExplicitSelection?.name || "Your fitness buddy";

  return (
    <div className={cn("relative aspect-square", className)}>
      {avatarImageUrl ? (
        <img
          src={avatarImageUrl}
          alt={avatarName}
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
          <Sparkles className="h-12 w-12 text-primary mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-muted-foreground">
            {hasExplicitSelection?.name || "Your Avatar"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Log an activity to generate your image!
          </p>
        </div>
      )}
      <div className="absolute top-2 right-2">
        <span className="inline-flex items-center gap-1.5 bg-primary/90 text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-full shadow-md">
          <ImageIcon className="h-3 w-3" />
          Ready for today's workout!
        </span>
      </div>
    </div>
  );
};
