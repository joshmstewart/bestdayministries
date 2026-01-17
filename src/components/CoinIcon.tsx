import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import defaultCoinImage from "@/assets/joycoin.png";

interface CoinIconProps {
  className?: string;
  size?: number;
}

// Cache the custom coin URL to avoid repeated fetches
let cachedCoinUrl: string | null = null;
let cachePromise: Promise<string | null> | null = null;
let cacheVersion = 0;

const fetchCoinUrl = async (): Promise<string | null> => {
  if (cachedCoinUrl !== null) return cachedCoinUrl;
  
  if (cachePromise) return cachePromise;
  
  cachePromise = (async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "custom_coin_image")
        .maybeSingle();
      
      const settingValue = data?.setting_value as { url?: string } | null;
      cachedCoinUrl = settingValue?.url || null;
      return cachedCoinUrl;
    } catch (error) {
      console.error("Failed to load custom coin image:", error);
      return null;
    }
  })();
  
  return cachePromise;
};

// Call this when the coin image is updated in admin
export const invalidateCoinCache = () => {
  cachedCoinUrl = null;
  cachePromise = null;
  cacheVersion++;
};

// Get the current cache version for reactive updates
export const getCacheVersion = () => cacheVersion;

export const CoinIcon = ({ className = "", size = 16 }: CoinIconProps) => {
  const [coinUrl, setCoinUrl] = useState<string>(defaultCoinImage);
  const [version, setVersion] = useState(cacheVersion);
  
  useEffect(() => {
    // Check if cache was invalidated
    if (version !== cacheVersion) {
      setVersion(cacheVersion);
    }
    
    fetchCoinUrl().then((url) => {
      if (url) setCoinUrl(url);
      else setCoinUrl(defaultCoinImage);
    });
  }, [version, cacheVersion]);
  
  // Also listen for cache invalidation
  useEffect(() => {
    const interval = setInterval(() => {
      if (version !== cacheVersion) {
        setVersion(cacheVersion);
        fetchCoinUrl().then((url) => {
          if (url) setCoinUrl(url);
          else setCoinUrl(defaultCoinImage);
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [version]);
  
  return (
    <img 
      src={coinUrl} 
      alt="Coin" 
      className={className}
      style={{ width: size, height: size }}
    />
  );
};

export default CoinIcon;
