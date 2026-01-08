import React from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import defaultCoinImage from "@/assets/joycoin.png";

// Cache the custom coin URL
let cachedCoinUrl: string | null = null;

const getCoinUrl = async (): Promise<string> => {
  if (cachedCoinUrl !== null) return cachedCoinUrl;
  
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "custom_coin_image")
      .maybeSingle();
    
    const settingValue = data?.setting_value as { url?: string } | null;
    cachedCoinUrl = settingValue?.url || defaultCoinImage;
    return cachedCoinUrl;
  } catch (error) {
    console.error("Failed to load custom coin image:", error);
    return defaultCoinImage;
  }
};

// Call this when the coin image is updated in admin
export const invalidateCoinNotificationCache = () => {
  cachedCoinUrl = null;
};

/**
 * Centralized utility for showing coin earned notifications
 * Use this whenever coins are awarded to ensure consistent UI
 */
export const showCoinNotification = async (amount: number, reason?: string) => {
  const coinUrl = await getCoinUrl();
  
  toast({
    title: `+${amount} JoyCoins!`,
    description: React.createElement('div', { className: 'flex items-center gap-2' },
      React.createElement('img', { src: coinUrl, alt: 'Coin', className: 'w-5 h-5' }),
      React.createElement('span', null, reason || 'Coins added to your balance')
    ),
  });
};
