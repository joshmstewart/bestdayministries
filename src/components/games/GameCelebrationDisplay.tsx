import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef } from "react";

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
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const hasSelectedImage = useRef(false);

  // Reset state when userId changes
  useEffect(() => {
    setImageError(false);
    setSelectedImageUrl(null);
    hasSelectedImage.current = false;
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

  // Pick a random celebration image ONCE when data loads
  useEffect(() => {
    if (celebrationImages && celebrationImages.length > 0 && !hasSelectedImage.current) {
      const randomImage = celebrationImages[Math.floor(Math.random() * celebrationImages.length)];
      setSelectedImageUrl(randomImage.image_url);
      hasSelectedImage.current = true;
    }
  }, [celebrationImages]);

  // If no avatar selected, no celebration images, or image failed to load, show emoji
  if (!selectedAvatar || !selectedImageUrl || imageError) {
    return (
      <div className={`flex justify-center ${className}`}>
        <div className="text-8xl">{fallbackEmoji}</div>
      </div>
    );
  }

  return (
    <div className={`flex justify-center ${className}`}>
      <img
        src={selectedImageUrl}
        alt="Celebration"
        className="w-56 h-56 sm:w-64 sm:h-64 object-cover rounded-2xl shadow-xl"
        onError={() => setImageError(true)}
      />
    </div>
  );
}