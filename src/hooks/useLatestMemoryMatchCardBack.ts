import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY = "memory_match_card_back_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  imageUrl: string | null;
  timestamp: number;
}

function getFromCache(): string | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const entry: CacheEntry = JSON.parse(cached);
      if (Date.now() - entry.timestamp < CACHE_TTL) {
        return entry.imageUrl;
      }
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

function setToCache(imageUrl: string | null): void {
  try {
    const entry: CacheEntry = { imageUrl, timestamp: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore cache errors
  }
}

export function useLatestMemoryMatchCardBack() {
  // Initialize with cached data if available
  const cachedUrl = getFromCache();
  const [imageUrl, setImageUrl] = useState<string | null>(cachedUrl);
  const [loading, setLoading] = useState(cachedUrl === null);

  useEffect(() => {
    const fetchLatestCardBack = async () => {
      try {
        const { data } = await supabase
          .from("memory_match_packs")
          .select("card_back_url")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data?.card_back_url) {
          setImageUrl(data.card_back_url);
          setToCache(data.card_back_url);
        }
      } catch (error) {
        console.error("Error fetching latest memory match card back:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestCardBack();
  }, []);

  return { imageUrl, loading };
}
