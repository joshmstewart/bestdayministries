import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Image as ImageIcon, User } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CurrentAvatarDisplayProps {
  userId: string;
  className?: string;
  isGenerating?: boolean;
  onSelectAvatarClick?: () => void;
}

export const CurrentAvatarDisplay = ({ userId, className, isGenerating = false, onSelectAvatarClick }: CurrentAvatarDisplayProps) => {
  const today = format(new Date(), "yyyy-MM-dd");

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

  // If user hasn't explicitly selected an avatar, show the "Pick Avatar" prompt
  if (!hasExplicitSelection) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-0 relative">
          <div className="aspect-square bg-gradient-to-br from-muted/30 to-muted/60 flex items-center justify-center p-6">
            {/* Large dashed circle placeholder with user icon inside */}
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="absolute inset-4 rounded-full border-4 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <User className="w-1/2 h-1/2 text-muted-foreground/25" strokeWidth={1} />
              </div>
              
              {/* Centered content overlay */}
              <div className="relative z-10 flex flex-col items-center text-center bg-background/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <Sparkles className="h-10 w-10 text-primary mb-3" />
                <p className="text-base font-semibold text-foreground mb-1">
                  Choose Your Fitness Buddy!
                </p>
                <p className="text-sm text-muted-foreground mb-4">
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
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show the selected avatar (ready for workout)
  const avatarImageUrl = hasExplicitSelection?.image_url || hasExplicitSelection?.preview_image_url;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0 relative">
        <div className="aspect-square bg-gradient-to-br from-primary/10 to-accent/20 flex items-center justify-center">
          {avatarImageUrl ? (
            <img
              src={avatarImageUrl}
              alt={hasExplicitSelection?.name || "Your fitness buddy"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-4">
              <Sparkles className="h-12 w-12 text-primary mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-muted-foreground">
                {hasExplicitSelection?.name || "Your Avatar"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Log an activity to generate your image!
              </p>
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <p className="text-white text-sm font-medium flex items-center gap-1">
            <ImageIcon className="h-3.5 w-3.5" />
            Ready for today's workout!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
