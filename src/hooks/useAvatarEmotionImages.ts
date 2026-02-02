import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AvatarEmotionImageMap {
  [emotionTypeId: string]: {
    url: string;
    cropScale: number;
  };
}

interface CachedAvatarData {
  avatarId: string;
  imagesByEmotionTypeId: AvatarEmotionImageMap;
  imagesByEmotionName: Record<string, { url: string; cropScale: number }>;
  timestamp: number;
}

const CACHE_KEY = "avatar_emotion_images_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getFromCache(avatarId: string): CachedAvatarData | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const entry: CachedAvatarData = JSON.parse(cached);
      // Check if cache is for same avatar and not expired
      if (entry.avatarId === avatarId && Date.now() - entry.timestamp < CACHE_TTL) {
        return entry;
      }
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

function setToCache(data: CachedAvatarData): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore cache errors
  }
}

/**
 * Hook to load ALL approved avatar emotion images for the user's selected avatar.
 * Returns a map keyed by emotion_type_id for efficient lookup.
 * Uses sessionStorage caching with 5-minute TTL for instant repeat loads.
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

        // Check cache first for instant repeat loads
        const cached = getFromCache(userAvatar.avatar_id);
        if (cached) {
          setImagesByEmotionTypeId(cached.imagesByEmotionTypeId);
          setImagesByEmotionName(cached.imagesByEmotionName);
          setLoading(false);
          return;
        }

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
        
        // Cache the results
        setToCache({
          avatarId: userAvatar.avatar_id,
          imagesByEmotionTypeId: mapById,
          imagesByEmotionName: mapByName,
          timestamp: Date.now(),
        });
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
