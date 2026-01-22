import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface GameCelebrationDisplayProps {
  userId: string | null;
  fallbackEmoji?: string;
  className?: string;
}

export function GameCelebrationDisplay({
  userId,
  fallbackEmoji = "🎉",
  className = "",
}: GameCelebrationDisplayProps) {
  const [imageError, setImageError] = useState(false);

  // Reset error state when userId changes
  useEffect(() => {
    setImageError(false);
  }, [userId]);

  // Get user's selected fitness avatar
  const { data: selectedAvatar } = useQuery({
    queryKey: ["user-selected-avatar", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("user_fitness_avatars")
        .select("avatar_id, is_selected, fitness_avatars(*)")
        .eq("user_id", userId)
        .eq("is_selected", true)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching selected avatar:", error);
        return null;
      }
      return data;
    },
    enabled: !!userId,
  });

  // Get celebration images for the avatar
  const { data: celebrationImages } = useQuery({
    queryKey: ["avatar-celebration-images", selectedAvatar?.avatar_id],
    queryFn: async () => {
      if (!selectedAvatar?.avatar_id) return [];
      const { data, error } = await supabase
        .from("fitness_avatar_celebration_images")
        .select("*")
        .eq("avatar_id", selectedAvatar.avatar_id)
        .eq("is_active", true)
        .order("display_order");
      
      if (error) {
        console.error("Error fetching celebration images:", error);
        return [];
      }
      return data;
    },
    enabled: !!selectedAvatar?.avatar_id,
  });

  // Pick a random celebration image
  const randomImage = celebrationImages && celebrationImages.length > 0
    ? celebrationImages[Math.floor(Math.random() * celebrationImages.length)]
    : null;

  // If no avatar selected, no celebration images, or image failed to load, show emoji
  if (!selectedAvatar || !randomImage || imageError) {
    return <div className={`text-6xl ${className}`}>{fallbackEmoji}</div>;
  }

  return (
    <div className={`relative ${className}`}>
      <img
        src={randomImage.image_url}
        alt="Celebration"
        className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-xl shadow-lg"
        onError={() => setImageError(true)}
      />
    </div>
  );
}
