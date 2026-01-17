import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CurrentAvatarDisplayProps {
  userId: string;
  className?: string;
}

export const CurrentAvatarDisplay = ({ userId, className }: CurrentAvatarDisplayProps) => {
  const today = format(new Date(), "yyyy-MM-dd");

  // Get user's selected avatar
  const { data: selectedAvatar, isLoading: loadingAvatar } = useQuery({
    queryKey: ["user-selected-fitness-avatar", userId],
    queryFn: async () => {
      // First, check if user has explicitly selected an avatar
      const { data, error } = await supabase
        .from("user_fitness_avatars")
        .select("avatar_id, fitness_avatars(*)")
        .eq("user_id", userId)
        .eq("is_selected", true)
        .maybeSingle();

      if (!error && data?.fitness_avatars) {
        return data.fitness_avatars;
      }
      
      // If no selection, get the first free avatar as default
      const { data: freeAvatar, error: freeError } = await supabase
        .from("fitness_avatars")
        .select("*")
        .eq("is_active", true)
        .eq("is_free", true)
        .order("display_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (freeError) throw freeError;
      return freeAvatar;
    },
    enabled: !!userId,
  });

  // Get today's most recent generated image for this user (must be their own REAL image, not test)
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
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  if (loadingAvatar || loadingImage) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-0 flex items-center justify-center aspect-square">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // If there's a generated image for today BY THIS USER, show it
  if (todayImage?.image_url) {
    return (
      <Card className={cn("overflow-hidden", className)}>
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
                : todayImage.activity_name}
            </p>
            {todayImage.location_name && (
              <p className="text-white/70 text-xs">📍 {todayImage.location_name}</p>
            )}
          </div>
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
            Today ✨
          </div>
        </CardContent>
      </Card>
    );
  }

  // Otherwise show the default avatar image or preview
  const avatarImageUrl = selectedAvatar?.image_url || selectedAvatar?.preview_image_url;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0 relative">
        <div className="aspect-square bg-gradient-to-br from-primary/10 to-accent/20 flex items-center justify-center">
          {avatarImageUrl ? (
            <img
              src={avatarImageUrl}
              alt={selectedAvatar?.name || "Your fitness buddy"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-4">
              <Sparkles className="h-12 w-12 text-primary mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-muted-foreground">
                {selectedAvatar?.name || "Select an Avatar"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Log an activity to generate your image!
              </p>
            </div>
          )}
        </div>
        {selectedAvatar && !todayImage && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
            <p className="text-white text-sm font-medium flex items-center gap-1">
              <ImageIcon className="h-3.5 w-3.5" />
              Ready for today's workout!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
