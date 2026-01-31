import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

interface DailyScratchCardStatus {
  hasAvailableCard: boolean;
  loading: boolean;
  previewStickerUrl: string | null;
}

// Helper function to get current date in MST (UTC-7)
const getMSTDate = () => {
  const now = new Date();
  const mstOffset = -7 * 60;
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const mstTime = new Date(utc + (mstOffset * 60000));
  return mstTime;
};

export function useDailyScratchCardStatus(): DailyScratchCardStatus {
  const { user, role, loading: authLoading } = useAuth();
  const location = useLocation();
  const [hasAvailableCard, setHasAvailableCard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewStickerUrl, setPreviewStickerUrl] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to finish loading before checking card status
    if (authLoading) {
      return;
    }
    
    if (!user) {
      setLoading(false);
      setHasAvailableCard(false);
      setPreviewStickerUrl(null);
      return;
    }

    const checkCardStatus = async () => {
      try {
        const mstDate = getMSTDate();
        const today = mstDate.toISOString().split('T')[0];

        // Batch queries for efficiency
        const [
          { data: dailyCard },
          { data: bonusCards },
          { data: featuredCollection }
        ] = await Promise.all([
          // Check for daily card
          supabase
            .from('daily_scratch_cards')
            .select('id, is_scratched, collection_id')
            .eq('user_id', user.id)
            .eq('date', today)
            .eq('is_bonus_card', false)
            .maybeSingle(),
          // Check for unscratched bonus cards
          supabase
            .from('daily_scratch_cards')
            .select('id')
            .eq('user_id', user.id)
            .eq('date', today)
            .eq('is_bonus_card', true)
            .eq('is_scratched', false)
            .limit(1),
          // Get featured collection with preview sticker
          supabase
            .from('sticker_collections')
            .select(`
              id,
              preview_sticker_id,
              preview_sticker:stickers!preview_sticker_id(image_url)
            `)
            .eq('is_active', true)
            .eq('is_featured', true)
            .single()
        ]);

        // Determine available card status
        const hasDaily = dailyCard && !dailyCard.is_scratched;
        const hasBonus = bonusCards && bonusCards.length > 0;
        setHasAvailableCard(hasDaily || hasBonus);

        // Get preview sticker URL from featured collection
        if (featuredCollection?.preview_sticker?.image_url) {
          setPreviewStickerUrl(featuredCollection.preview_sticker.image_url);
        } else if (dailyCard?.collection_id) {
          // Fallback: fetch first sticker from the card's collection
          const { data: firstSticker } = await supabase
            .from('stickers')
            .select('image_url')
            .eq('collection_id', dailyCard.collection_id)
            .eq('is_active', true)
            .order('display_order')
            .limit(1)
            .single();
          
          if (firstSticker?.image_url) {
            setPreviewStickerUrl(firstSticker.image_url);
          }
        }
      } catch (error) {
        console.error('Error checking card status:', error);
        setHasAvailableCard(false);
      } finally {
        setLoading(false);
      }
    };

    checkCardStatus();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('daily_scratch_cards_status')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_scratch_cards',
        filter: `user_id=eq.${user.id}`
      }, () => {
        checkCardStatus();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, role, location.key, authLoading]);

  return { hasAvailableCard, loading, previewStickerUrl };
}
