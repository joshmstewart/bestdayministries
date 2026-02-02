import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AvatarEmotionImageMap {
  [emotionTypeId: string]: {
    url: string;
    cropScale: number;
  };
}

/**
 * Hook to load ALL approved avatar emotion images for the user's selected avatar.
 * Returns a map keyed by emotion_type_id for efficient lookup.
 */
export const useAvatarEmotionImages = (userId: string | undefined) => {
  const [imagesByEmotionTypeId, setImagesByEmotionTypeId] = useState<AvatarEmotionImageMap>({});
  const [imagesByEmotionName, setImagesByEmotionName] = useState<Record<string, { url: string; cropScale: number }>>({});
  const [loading, setLoading] = useState(false);
  const [hasAvatar, setHasAvatar] = useState(false);

  useEffect(() => {
    const loadAvatarEmotionImages = async () => {
      if (!userId) {
        setImagesByEmotionTypeId({});
        setImagesByEmotionName({});
        setHasAvatar(false);
        return;
      }

      setLoading(true);
      try {
        // Get user's selected avatar
        const { data: userAvatar, error: avatarError } = await supabase
          .from("user_fitness_avatars")
          .select("avatar_id")
          .eq("user_id", userId)
          .eq("is_selected", true)
          .maybeSingle();

        if (avatarError) {
          console.error("Error fetching selected avatar:", avatarError);
          setImagesByEmotionTypeId({});
          setImagesByEmotionName({});
          setHasAvatar(false);
          return;
        }

        if (!userAvatar?.avatar_id) {
          setImagesByEmotionTypeId({});
          setImagesByEmotionName({});
          setHasAvatar(false);
          return;
        }

        setHasAvatar(true);

        // Get all approved emotion images for this avatar
        const { data: emotionImages, error: emotionImagesError } = await supabase
          .from("avatar_emotion_images")
          .select("emotion_type_id, image_url, crop_scale")
          .eq("avatar_id", userAvatar.avatar_id)
          .eq("is_approved", true);

        if (emotionImagesError) {
          console.error("Error fetching avatar emotion images:", emotionImagesError);
          setImagesByEmotionTypeId({});
          setImagesByEmotionName({});
          return;
        }

        // Get emotion types to map emotion_type_id to name
        const { data: emotionTypes } = await supabase
          .from("emotion_types")
          .select("id, name");

        const emotionIdToName: Record<string, string> = {};
        emotionTypes?.forEach(e => {
          emotionIdToName[e.id] = e.name;
        });

        const mapById: AvatarEmotionImageMap = {};
        const mapByName: Record<string, { url: string; cropScale: number }> = {};

        (emotionImages || []).forEach((img) => {
          if (!img.image_url) return;
          const imageData = {
            url: img.image_url,
            cropScale: (img.crop_scale as number) || 1.0,
          };
          mapById[img.emotion_type_id] = imageData;
          
          // Also map by name for easy lookup
          const emotionName = emotionIdToName[img.emotion_type_id];
          if (emotionName) {
            mapByName[emotionName] = imageData;
          }
        });

        setImagesByEmotionTypeId(mapById);
        setImagesByEmotionName(mapByName);
      } catch (e) {
        console.error("Error loading avatar emotion images:", e);
        setImagesByEmotionTypeId({});
        setImagesByEmotionName({});
      } finally {
        setLoading(false);
      }
    };

    loadAvatarEmotionImages();
  }, [userId]);

  return {
    imagesByEmotionTypeId,
    imagesByEmotionName,
    loading,
    hasAvatar,
  };
};
