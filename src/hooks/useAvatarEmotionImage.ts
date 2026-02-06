import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AvatarEmotionImage {
  id: string;
  avatar_id: string;
  emotion_type_id: string;
  image_url: string | null;
  is_approved: boolean | null;
  crop_scale: number | null;
  crop_x: number | null;
  crop_y: number | null;
}

/**
 * Hook to get the user's selected avatar emotion image for a given emotion.
 * Returns the approved image if available, otherwise falls back to emoji.
 */
export const useAvatarEmotionImage = (userId: string | undefined, emotionName: string | undefined) => {
  // First get user's selected fitness avatar
  const { data: selectedAvatar } = useQuery({
    queryKey: ["user-selected-fitness-avatar", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_fitness_avatars")
        .select("avatar_id, fitness_avatars(*)")
        .eq("user_id", userId!)
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

  // Then get the emotion type ID from the name
  const { data: emotionType } = useQuery({
    queryKey: ["emotion-type-by-name", emotionName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emotion_types")
        .select("id, name, emoji")
        .eq("name", emotionName!)
        .maybeSingle();

      if (error) {
        console.error("Error fetching emotion type:", error);
        return null;
      }
      return data;
    },
    enabled: !!emotionName,
  });

  // Finally get the avatar emotion image
  const { data: avatarEmotionImage, isLoading } = useQuery({
    queryKey: ["avatar-emotion-image", selectedAvatar?.avatar_id, emotionType?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avatar_emotion_images")
        .select("id, avatar_id, emotion_type_id, image_url, is_approved, crop_scale, crop_x, crop_y")
        .eq("avatar_id", selectedAvatar!.avatar_id)
        .eq("emotion_type_id", emotionType!.id)
        .eq("is_approved", true)
        .maybeSingle();

      if (error) {
        console.error("Error fetching avatar emotion image:", error);
        return null;
      }
      return data as AvatarEmotionImage | null;
    },
    enabled: !!selectedAvatar?.avatar_id && !!emotionType?.id,
  });

  return {
    imageUrl: avatarEmotionImage?.image_url || null,
    cropScale: (avatarEmotionImage?.crop_scale as number) || 1.0,
    cropX: (avatarEmotionImage?.crop_x as number) || 0,
    cropY: (avatarEmotionImage?.crop_y as number) || 0,
    hasAvatar: !!selectedAvatar?.avatar_id,
    avatarName: (selectedAvatar?.fitness_avatars as any)?.name || null,
    isLoading,
    emotionEmoji: emotionType?.emoji || null,
  };
};
