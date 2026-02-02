import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import defaultCoinImage from "@/assets/joycoin.png";

const CACHE_KEY = "custom_coin_image_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  imageUrl: string;
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

function setToCache(imageUrl: string): void {
  try {
    const entry: CacheEntry = { imageUrl, timestamp: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore cache errors
  }
}

export function useCustomCoinImage() {
  // Initialize with cached data if available
  const cachedUrl = getFromCache();
  const [imageUrl, setImageUrl] = useState<string | null>(cachedUrl);
  const [loading, setLoading] = useState(!cachedUrl);

  useEffect(() => {
    const fetchCustomCoin = async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "custom_coin_image")
          .maybeSingle();

        const settingValue = data?.setting_value as { url?: string } | null;
        const url = settingValue?.url || defaultCoinImage;
        setImageUrl(url);
        setToCache(url);
      } catch (error) {
        console.error("Failed to load custom coin image:", error);
        const url = defaultCoinImage;
        setImageUrl(url);
        setToCache(url);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomCoin();
  }, []);

  return { imageUrl, loading };
}
