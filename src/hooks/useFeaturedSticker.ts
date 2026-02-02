import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FeaturedStickerData {
  imageUrl: string | null;
  collectionName: string | null;
}

const CACHE_KEY = "featured_sticker_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: FeaturedStickerData;
  timestamp: number;
}

function getFromCache(): FeaturedStickerData | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const entry: CacheEntry = JSON.parse(cached);
      if (Date.now() - entry.timestamp < CACHE_TTL) {
        return entry.data;
      }
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

function setToCache(data: FeaturedStickerData): void {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore cache errors
  }
}

export function useFeaturedSticker() {
  // Initialize with cached data if available
  const cachedData = getFromCache();
  const [data, setData] = useState<FeaturedStickerData>(
    cachedData || { imageUrl: null, collectionName: null }
  );
  const [loading, setLoading] = useState(!cachedData);

  useEffect(() => {
    // If we have cached data, still fetch in background to update
    const fetchFeaturedSticker = async () => {
      try {
        const { data: featuredCollection } = await supabase
          .from('sticker_collections')
          .select(`
            id,
            name,
            preview_sticker_id,
            preview_sticker:stickers!preview_sticker_id(image_url)
          `)
          .eq('is_active', true)
          .eq('is_featured', true)
          .single();

        if (featuredCollection?.preview_sticker?.image_url) {
          const newData = {
            imageUrl: featuredCollection.preview_sticker.image_url,
            collectionName: featuredCollection.name
          };
          setData(newData);
          setToCache(newData);
        }
      } catch (error) {
        console.error("Error fetching featured sticker:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedSticker();
  }, []);

  return { ...data, loading };
}
