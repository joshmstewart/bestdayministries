import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { awardCoinReward } from "@/utils/awardCoinReward";

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

interface DailyEngagementBonusProps {
  allCompleted: boolean;
}

interface DailyEngagementBonusResult {
  bonusClaimed: boolean;
  checking: boolean;
  showCelebration: boolean;
  setShowCelebration: (show: boolean) => void;
  coinsAwarded: number;
}

export function useDailyEngagementBonus({ allCompleted }: DailyEngagementBonusProps): DailyEngagementBonusResult {
  const { user } = useAuth();
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [coinsAmount, setCoinsAmount] = useState(50); // Default fallback
  const claimingRef = useRef(false);

  // Fetch actual reward amount from settings
  useEffect(() => {
    const fetchRewardAmount = async () => {
      try {
        const { data } = await supabase
          .from("coin_rewards_settings")
          .select("coins_amount")
          .eq("reward_key", "daily_engagement_complete")
          .eq("is_active", true)
          .maybeSingle();
        
        if (data?.coins_amount) {
          setCoinsAmount(data.coins_amount);
        }
      } catch (error) {
        console.error("Error fetching reward amount:", error);
      }
    };
    fetchRewardAmount();
  }, []);

  // Check if bonus was already claimed today
  const checkBonusClaimed = useCallback(async () => {
    if (!user) {
      setChecking(false);
      return;
    }

    try {
      const today = getMSTDate();
      const { data } = await supabase
        .from("daily_engagement_completions")
        .select("id")
        .eq("user_id", user.id)
        .eq("completion_date", today)
        .maybeSingle();

      setBonusClaimed(!!data);
    } catch (error) {
      console.error("Error checking daily engagement bonus:", error);
    } finally {
      setChecking(false);
    }
  }, [user]);

  // Claim the bonus when all items are completed
  const claimBonus = useCallback(async () => {
    if (!user || bonusClaimed || claimingRef.current) return;

    claimingRef.current = true;
    const today = getMSTDate();

    try {
      // Insert completion record (will fail if already exists due to unique constraint)
      const { error: insertError } = await supabase
        .from("daily_engagement_completions")
        .insert({
          user_id: user.id,
          completion_date: today,
          coins_awarded: coinsAmount,
        });

      if (insertError) {
        // Already claimed today (unique constraint violation)
        if (insertError.code === "23505") {
          setBonusClaimed(true);
          return;
        }
        throw insertError;
      }

      // Award the coins
      await awardCoinReward(user.id, "daily_engagement_complete", "🎉 All Daily Activities Complete!");
      setBonusClaimed(true);
      
      // Trigger celebration
      setShowCelebration(true);
    } catch (error) {
      console.error("Error claiming daily engagement bonus:", error);
    } finally {
      claimingRef.current = false;
    }
  }, [user, bonusClaimed, coinsAmount]);

  // Check on mount
  useEffect(() => {
    checkBonusClaimed();
  }, [checkBonusClaimed]);

  // Claim bonus when all completed and not yet claimed
  useEffect(() => {
    if (allCompleted && !bonusClaimed && !checking && user) {
      claimBonus();
    }
  }, [allCompleted, bonusClaimed, checking, user, claimBonus]);

  return { 
    bonusClaimed, 
    checking, 
    showCelebration, 
    setShowCelebration,
    coinsAwarded: coinsAmount,
  };
}
