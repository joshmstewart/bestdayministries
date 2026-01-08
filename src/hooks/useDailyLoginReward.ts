import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { showCoinNotification } from "@/utils/coinNotification";

/**
 * Hook to check and award daily login coins on first load each day.
 * Uses MST timezone for day calculation (same as sticker packs).
 */
export const useDailyLoginReward = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const hasChecked = useRef(false);

  useEffect(() => {
    if (loading || !isAuthenticated || !user || hasChecked.current) return;

    const checkAndAwardDailyLogin = async () => {
      hasChecked.current = true;

      try {
        // Get the reward setting first
        const { data: rewardSetting, error: rewardError } = await supabase
          .from("coin_rewards_settings")
          .select("coins_amount, is_active")
          .eq("reward_key", "daily_login")
          .single();

        if (rewardError || !rewardSetting?.is_active) {
          console.log("Daily login reward not active or not found");
          return;
        }

        // Get user's last reward date
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("last_daily_login_reward_at, coins")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          return;
        }

        // Calculate MST date (UTC-7)
        const now = new Date();
        const mstOffset = -7 * 60; // MST is UTC-7
        const mstTime = new Date(now.getTime() + (mstOffset - now.getTimezoneOffset()) * 60000);
        const todayMST = mstTime.toISOString().split("T")[0];

        // Check if already rewarded today
        if (profile.last_daily_login_reward_at) {
          const lastRewardDate = new Date(profile.last_daily_login_reward_at);
          const lastRewardMST = new Date(lastRewardDate.getTime() + (mstOffset - lastRewardDate.getTimezoneOffset()) * 60000);
          const lastRewardDateStr = lastRewardMST.toISOString().split("T")[0];

          if (lastRewardDateStr === todayMST) {
            console.log("Daily login reward already claimed today");
            return;
          }
        }

        // Award coins
        const newBalance = (profile.coins || 0) + rewardSetting.coins_amount;

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            coins: newBalance,
            last_daily_login_reward_at: now.toISOString(),
          })
          .eq("id", user.id);

        if (updateError) {
          console.error("Error updating profile:", updateError);
          return;
        }

        // Log the transaction
        await supabase.from("coin_transactions").insert({
          user_id: user.id,
          amount: rewardSetting.coins_amount,
          transaction_type: "earned",
          description: "Daily login reward",
        });

        // Show notification
        showCoinNotification(rewardSetting.coins_amount, "Welcome back! Daily login bonus");
        console.log(`Awarded ${rewardSetting.coins_amount} coins for daily login`);
      } catch (error) {
        console.error("Error checking daily login reward:", error);
      }
    };

    checkAndAwardDailyLogin();
  }, [loading, isAuthenticated, user]);
};
