import { supabase } from "@/integrations/supabase/client";
import { showCoinNotification } from "./coinNotification";

/**
 * Awards coins to a user based on a reward key from coin_rewards_settings
 * Returns the amount awarded, or 0 if the reward is not active/found
 */
export const awardCoinReward = async (
  userId: string,
  rewardKey: string,
  customDescription?: string
): Promise<number> => {
  try {
    // Fetch the reward setting
    const { data: rewardSetting, error: settingError } = await supabase
      .from("coin_rewards_settings")
      .select("coins_amount, reward_name, is_active")
      .eq("reward_key", rewardKey)
      .maybeSingle();

    if (settingError) {
      console.error("Error fetching reward setting:", settingError);
      return 0;
    }

    if (!rewardSetting || !rewardSetting.is_active) {
      console.log(`Reward "${rewardKey}" not found or not active`);
      return 0;
    }

    const amount = rewardSetting.coins_amount;
    if (amount <= 0) return 0;

    // Get current coin balance
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("coins")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return 0;
    }

    const newBalance = (profile?.coins || 0) + amount;

    // Update balance
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ coins: newBalance })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating coins:", updateError);
      return 0;
    }

    // Log transaction
    const description = customDescription || rewardSetting.reward_name;
    await supabase.from("coin_transactions").insert({
      user_id: userId,
      amount,
      transaction_type: "earned",
      description,
    });

    // Show notification
    await showCoinNotification(amount, description);

    return amount;
  } catch (error) {
    console.error("Error awarding coin reward:", error);
    return 0;
  }
};
