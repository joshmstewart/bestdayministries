import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to preload celebration images for a user's selected avatar.
 * Call this early (e.g., when game starts) so images are cached before victory screen.
 */
export function useCelebrationImagePreloader(userId: string | null) {
  const preloadedUrlsRef = useRef<Set<string>>(new Set());

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
        console.error("Error fetching selected avatar for preload:", error);
        return null;
      }
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
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
        console.error("Error fetching celebration images for preload:", error);
        return [];
      }
      return data;
    },
    enabled: !!selectedAvatar?.avatar_id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Preload all celebration images into browser cache
  useEffect(() => {
    if (!celebrationImages || celebrationImages.length === 0) return;

    celebrationImages.forEach((img) => {
      if (img.image_url && !preloadedUrlsRef.current.has(img.image_url)) {
        preloadedUrlsRef.current.add(img.image_url);
        const image = new Image();
        image.decoding = "async";
        image.src = img.image_url;
      }
    });
  }, [celebrationImages]);

  return {
    isPreloaded: celebrationImages && celebrationImages.length > 0,
    celebrationImages,
    selectedAvatar,
  };
}
