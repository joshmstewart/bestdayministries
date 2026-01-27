import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { showCoinNotification } from "@/utils/coinNotification";

// Global flag to prevent multiple simultaneous checks across component instances
let globalCheckInProgress = false;

/**
 * Hook to check and award daily login coins on first load each day.
 * Uses MST timezone for day calculation (same as sticker packs).
 * Uses optimistic locking to prevent race conditions.
 */
export const useDailyLoginReward = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const hasChecked = useRef(false);

  useEffect(() => {
    if (loading || !isAuthenticated || !user || hasChecked.current) return;

    const checkAndAwardDailyLogin = async () => {
      // Prevent multiple parallel executions globally
      if (globalCheckInProgress) {
        hasChecked.current = true;
        return;
      }
      globalCheckInProgress = true;
      hasChecked.current = true;

      try {
        // Calculate MST date (UTC-7) FIRST before any DB operations
        const now = new Date();
        const mstOffset = -7 * 60; // MST is UTC-7
        const mstTime = new Date(now.getTime() + (mstOffset - now.getTimezoneOffset()) * 60000);
        const todayMST = mstTime.toISOString().split("T")[0];

        // Get the reward setting first
        const { data: rewardSetting, error: rewardError } = await supabase
          .from("coin_rewards_settings")
          .select("coins_amount, is_active")
          .eq("reward_key", "daily_login")
          .single();

        if (rewardError || !rewardSetting?.is_active) {
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

        // Check if already rewarded today
        if (profile.last_daily_login_reward_at) {
          const lastRewardDate = new Date(profile.last_daily_login_reward_at);
          const lastRewardMST = new Date(lastRewardDate.getTime() + (mstOffset - lastRewardDate.getTimezoneOffset()) * 60000);
          const lastRewardDateStr = lastRewardMST.toISOString().split("T")[0];

          if (lastRewardDateStr === todayMST) {
            return;
          }
        }

        // Use optimistic locking: only update if last_daily_login_reward_at hasn't changed
        // This prevents race conditions where two parallel requests both pass the date check
        const expectedLastReward = profile.last_daily_login_reward_at;
        const newBalance = (profile.coins || 0) + rewardSetting.coins_amount;

        // Build the update query with a WHERE clause that checks the timestamp hasn't changed
        let updateQuery = supabase
          .from("profiles")
          .update({
            coins: newBalance,
            last_daily_login_reward_at: now.toISOString(),
          })
          .eq("id", user.id);

        // Add the optimistic lock condition
        if (expectedLastReward) {
          updateQuery = updateQuery.eq("last_daily_login_reward_at", expectedLastReward);
        } else {
          updateQuery = updateQuery.is("last_daily_login_reward_at", null);
        }

        const { data: updateResult, error: updateError } = await updateQuery.select("id");

        if (updateError) {
          console.error("Error updating profile:", updateError);
          return;
        }

        // If no rows were updated, another process already awarded the coins
        if (!updateResult || updateResult.length === 0) {
          console.log("Daily login reward already claimed by another process");
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
      } catch (error) {
        console.error("Error checking daily login reward:", error);
      } finally {
        globalCheckInProgress = false;
      }
    };

    checkAndAwardDailyLogin();
  }, [loading, isAuthenticated, user]);
};
