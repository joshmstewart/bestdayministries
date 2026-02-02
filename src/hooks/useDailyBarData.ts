import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DailyBarData {
  // Icons
  icons: DailyBarIcon[];
  // Completions
  completions: {
    mood: boolean;
    fortune: boolean;
    "daily-five": boolean;
  };
  // Scratch card status
  hasAvailableCard: boolean;
  previewStickerUrl: string | null;
  // Settings
  canSeeFeature: (featureKey: string) => boolean;
  // Combined state
  loading: boolean;
  refresh: () => void;
}

interface DailyBarIcon {
  id: string;
  item_key: string;
  icon_url: string | null;
  label: string;
  display_order: number;
  is_active: boolean;
}

interface DailyEngagementSetting {
  feature_key: string;
  is_enabled: boolean;
  visible_to_roles: string[];
}

// Get MST date string (YYYY-MM-DD format)
const getMSTDate = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
};

/**
 * Combined hook for all DailyBar data - loads everything in parallel
 * for faster initial render. Replaces 4 separate hooks.
 */
export function useDailyBarData(): DailyBarData {
  const { user, role, isAuthenticated, loading: authLoading } = useAuth();
  
  // Combined state
  const [icons, setIcons] = useState<DailyBarIcon[]>([]);
  const [settings, setSettings] = useState<DailyEngagementSetting[]>([]);
  const [completions, setCompletions] = useState({
    mood: false,
    fortune: false,
    "daily-five": false,
  });
  const [hasAvailableCard, setHasAvailableCard] = useState(false);
  const [previewStickerUrl, setPreviewStickerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    if (authLoading) return;
    
    if (!user || !isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const today = getMSTDate();

    try {
      // Run ALL queries in parallel - this is the key optimization
      const [
        iconsResult,
        settingsResult,
        moodResult,
        fortuneResult,
        dailyWordResult,
        dailyCardResult,
        bonusCardsResult,
        featuredCollectionResult,
      ] = await Promise.all([
        // 1. Icons
        supabase
          .from("daily_bar_icons")
          .select("*")
          .eq("is_active", true)
          .order("display_order"),
        
        // 2. Settings
        supabase
          .from("daily_engagement_settings")
          .select("feature_key, is_enabled, visible_to_roles"),
        
        // 3. Mood completion
        supabase
          .from("mood_entries")
          .select("id")
          .eq("user_id", user.id)
          .eq("entry_date", today)
          .maybeSingle(),
        
        // 4. Fortune completion
        supabase
          .from("daily_fortune_views")
          .select("id")
          .eq("user_id", user.id)
          .eq("view_date", today)
          .maybeSingle(),
        
        // 5. Daily word (for Daily Five check)
        supabase
          .from("wordle_daily_words")
          .select("id")
          .eq("word_date", today)
          .maybeSingle(),
        
        // 6. Daily scratch card
        supabase
          .from("daily_scratch_cards")
          .select("id, is_scratched, collection_id")
          .eq("user_id", user.id)
          .eq("date", today)
          .eq("is_bonus_card", false)
          .maybeSingle(),
        
        // 7. Bonus cards
        supabase
          .from("daily_scratch_cards")
          .select("id")
          .eq("user_id", user.id)
          .eq("date", today)
          .eq("is_bonus_card", true)
          .eq("is_scratched", false)
          .limit(1),
        
        // 8. Featured collection for preview sticker
        supabase
          .from("sticker_collections")
          .select(`
            id,
            preview_sticker_id,
            preview_sticker:stickers!preview_sticker_id(image_url)
          `)
          .eq("is_active", true)
          .eq("is_featured", true)
          .maybeSingle(),
      ]);

      // Process icons
      setIcons(iconsResult.data || []);
      
      // Process settings
      setSettings(settingsResult.data || []);

      // Process Daily Five completion - needs secondary query only if word exists
      let dailyFiveComplete = false;
      if (dailyWordResult.data?.id) {
        const { data: attempt } = await supabase
          .from("wordle_attempts")
          .select("status")
          .eq("user_id", user.id)
          .eq("daily_word_id", dailyWordResult.data.id)
          .maybeSingle();
        
        dailyFiveComplete = attempt?.status === "won" || attempt?.status === "lost";
      }

      setCompletions({
        mood: !!moodResult.data,
        fortune: !!fortuneResult.data,
        "daily-five": dailyFiveComplete,
      });

      // Process scratch card status
      let effectiveDailyCard = dailyCardResult.data;
      
      // Only generate card if none exists (lazy generation)
      if (!effectiveDailyCard) {
        const { data: newCardId } = await supabase
          .rpc('generate_daily_scratch_card', { _user_id: user.id });

        if (newCardId) {
          const { data: generatedCard } = await supabase
            .from('daily_scratch_cards')
            .select('id, is_scratched, collection_id')
            .eq('id', newCardId)
            .maybeSingle();
          effectiveDailyCard = generatedCard;
        }
      }

      const hasDaily = effectiveDailyCard && !effectiveDailyCard.is_scratched;
      const hasBonus = bonusCardsResult.data && bonusCardsResult.data.length > 0;
      setHasAvailableCard(hasDaily || hasBonus);

      // Get preview sticker URL
      if (featuredCollectionResult.data?.preview_sticker?.image_url) {
        setPreviewStickerUrl(featuredCollectionResult.data.preview_sticker.image_url);
      } else if (effectiveDailyCard?.collection_id) {
        const { data: firstSticker } = await supabase
          .from('stickers')
          .select('image_url')
          .eq('collection_id', effectiveDailyCard.collection_id)
          .eq('is_active', true)
          .order('display_order')
          .limit(1)
          .single();
        
        if (firstSticker?.image_url) {
          setPreviewStickerUrl(firstSticker.image_url);
        }
      }
    } catch (error) {
      console.error("Error loading daily bar data:", error);
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated, authLoading]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Subscribe to scratch card updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('daily_bar_scratch_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_scratch_cards',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchAllData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchAllData]);

  // Memoized canSeeFeature function
  const canSeeFeature = useCallback((featureKey: string): boolean => {
    if (!isAuthenticated || !role) return false;
    
    const setting = settings.find(s => s.feature_key === featureKey);
    if (!setting) return true;
    
    if (!setting.is_enabled) return false;
    if (role === 'admin' || role === 'owner') return true;
    
    return setting.visible_to_roles?.includes(role) ?? false;
  }, [settings, isAuthenticated, role]);

  return {
    icons,
    completions,
    hasAvailableCard,
    previewStickerUrl,
    canSeeFeature,
    loading: loading || authLoading,
    refresh: fetchAllData,
  };
}
