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
let hasFetched = false;

const fetchCoinUrl = async (forceRefresh = false): Promise<string | null> => {
  // If we've already fetched and have a cached value (or confirmed null), return it
  if (hasFetched && !forceRefresh && cachedCoinUrl !== null) return cachedCoinUrl;
  
  // If a fetch is already in progress, wait for it
  if (cachePromise && !forceRefresh) return cachePromise;
  
  cachePromise = (async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "custom_coin_image")
        .maybeSingle();
      
      const settingValue = data?.setting_value as { url?: string } | null;
      cachedCoinUrl = settingValue?.url || null;
      hasFetched = true;
      return cachedCoinUrl;
    } catch (error) {
      console.error("Failed to load custom coin image:", error);
      hasFetched = true;
      return null;
    }
  })();
  
  return cachePromise;
};

// Call this when the coin image is updated in admin
export const invalidateCoinCache = () => {
  cachedCoinUrl = null;
  cachePromise = null;
  hasFetched = false;
  cacheVersion++;
};

// Get the current cache version for reactive updates
export const getCacheVersion = () => cacheVersion;

export const CoinIcon = ({ className = "", size = 16 }: CoinIconProps) => {
  const [coinUrl, setCoinUrl] = useState<string | null>(
    // Use cached value immediately if available, otherwise null (don't show default yet)
    hasFetched ? (cachedCoinUrl || defaultCoinImage) : null
  );
  const [version, setVersion] = useState(cacheVersion);
  
  useEffect(() => {
    let isMounted = true;
    
    // If we already have a cached value, use it immediately
    if (hasFetched && cachedCoinUrl !== null) {
      setCoinUrl(cachedCoinUrl || defaultCoinImage);
      return;
    }
    
    // Otherwise fetch fresh
    fetchCoinUrl(true).then((url) => {
      if (isMounted) {
        setCoinUrl(url || defaultCoinImage);
      }
    });
    
    return () => { isMounted = false; };
  }, []);
  
  // Also listen for cache invalidation
  useEffect(() => {
    const interval = setInterval(() => {
      if (version !== cacheVersion) {
        setVersion(cacheVersion);
        fetchCoinUrl(true).then((url) => {
          setCoinUrl(url || defaultCoinImage);
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [version]);
  
  // Don't render anything until we know which coin to show
  if (coinUrl === null) {
    return (
      <div 
        className={className}
        style={{ width: size, height: size }}
      />
    );
  }
  
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
