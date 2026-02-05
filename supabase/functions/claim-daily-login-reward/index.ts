import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Get today's date in MST (America/Denver) timezone.
 * Uses Intl.DateTimeFormat for accurate timezone handling including DST.
 */
function getMSTDate(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // User client for auth verification
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for database operations - bypasses RLS
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const todayMST = getMSTDate();

    // Get the reward setting
    const { data: rewardSetting, error: rewardError } = await adminClient
      .from("coin_rewards_settings")
      .select("coins_amount, is_active")
      .eq("reward_key", "daily_login")
      .single();

    if (rewardError || !rewardSetting?.is_active) {
      return new Response(JSON.stringify({ 
        success: false, 
        reason: "reward_inactive" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's profile with current reward date
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("last_daily_login_reward_at, coins")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return new Response(JSON.stringify({ error: "Failed to fetch profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already rewarded today using proper timezone
    if (profile.last_daily_login_reward_at) {
      // Convert the stored timestamp to MST date for comparison
      const lastRewardFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Denver',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const lastRewardDateStr = lastRewardFormatter.format(new Date(profile.last_daily_login_reward_at));

      if (lastRewardDateStr === todayMST) {
        return new Response(JSON.stringify({ 
          success: false, 
          reason: "already_claimed",
          date: todayMST
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Use a database function for atomic update to prevent race conditions
    // The atomic operation: UPDATE only if the date hasn't been set to today yet
    const nowISO = new Date().toISOString();
    const newBalance = (profile.coins || 0) + rewardSetting.coins_amount;

    // Atomic update: only succeeds if last_daily_login_reward_at is still the old value
    const expectedLastReward = profile.last_daily_login_reward_at;
    
    let updateQuery = adminClient
      .from("profiles")
      .update({
        coins: newBalance,
        last_daily_login_reward_at: nowISO,
      })
      .eq("id", user.id);

    // Add optimistic lock condition
    if (expectedLastReward) {
      updateQuery = updateQuery.eq("last_daily_login_reward_at", expectedLastReward);
    } else {
      updateQuery = updateQuery.is("last_daily_login_reward_at", null);
    }

    const { data: updateResult, error: updateError } = await updateQuery.select("id");

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no rows were updated, another request already claimed the reward
    if (!updateResult || updateResult.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        reason: "already_claimed_race",
        date: todayMST
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the transaction
    await adminClient.from("coin_transactions").insert({
      user_id: user.id,
      amount: rewardSetting.coins_amount,
      transaction_type: "earned",
      description: "Daily login reward",
    });

    return new Response(JSON.stringify({ 
      success: true, 
      amount: rewardSetting.coins_amount,
      newBalance,
      date: todayMST
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in claim-daily-login-reward:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
