import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

interface DailyScratchCardStatus {
  hasAvailableCard: boolean;
  loading: boolean;
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
  const { user } = useAuth();
  const location = useLocation();
  const [hasAvailableCard, setHasAvailableCard] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setHasAvailableCard(false);
      return;
    }

    const checkCardStatus = async () => {
      try {
        const mstDate = getMSTDate();
        const today = mstDate.toISOString().split('T')[0];

        // Check for unscratched daily card
        const { data: dailyCard } = await supabase
          .from('daily_scratch_cards')
          .select('id, is_scratched')
          .eq('user_id', user.id)
          .eq('date', today)
          .eq('is_bonus_card', false)
          .maybeSingle();

        // Check for unscratched bonus cards
        const { data: bonusCards } = await supabase
          .from('daily_scratch_cards')
          .select('id')
          .eq('user_id', user.id)
          .eq('date', today)
          .eq('is_bonus_card', true)
          .eq('is_scratched', false)
          .limit(1);

        // Has available card if:
        // 1. Daily card exists and is not scratched, OR
        // 2. Daily card is scratched but there are unscratched bonus cards
        const hasDaily = dailyCard && !dailyCard.is_scratched;
        const hasBonus = bonusCards && bonusCards.length > 0;
        
        setHasAvailableCard(hasDaily || hasBonus);
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
  }, [user?.id, location.key]);

  return { hasAvailableCard, loading };
}
