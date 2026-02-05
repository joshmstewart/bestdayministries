import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DURATIONS = [60, 120, 300]; // 1 min, 2 min, 5 min

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate previous month in YYYY-MM format
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const rewardMonth = previousMonth.toISOString().slice(0, 7); // "2026-01"

    console.log(`Processing Time Trial rewards for month: ${rewardMonth}`);

    // Get reward settings
    const { data: rewardSettings } = await supabase
      .from("coin_rewards_settings")
      .select("reward_key, coins_amount, is_active")
      .in("reward_key", ["time_trial_top_3", "time_trial_top_5", "time_trial_top_10"]);

    const rewardMap = new Map(
      rewardSettings?.map((r) => [r.reward_key, r]) || []
    );

    let totalAwarded = 0;
    const results: { duration: number; playersAwarded: number }[] = [];

    // Process each duration
    for (const duration of DURATIONS) {
      let playersAwarded = 0;

      // Get top 10 for this duration
      const { data: topPlayers, error } = await supabase
        .from("cash_register_time_trial_bests")
        .select("user_id, best_levels, best_score")
        .eq("duration_seconds", duration)
        .gt("best_levels", 0)
        .order("best_levels", { ascending: false })
        .order("best_score", { ascending: false })
        .limit(10);

      if (error) {
        console.error(`Error fetching leaderboard for ${duration}s:`, error);
        continue;
      }

      if (!topPlayers || topPlayers.length === 0) {
        console.log(`No players for ${duration}s duration`);
        continue;
      }

      // Award each player based on rank
      for (let i = 0; i < topPlayers.length; i++) {
        const player = topPlayers[i];
        const rank = i + 1;

        // Check if already awarded for this month/duration
        const { data: existing } = await supabase
          .from("cash_register_leaderboard_rewards")
          .select("id")
          .eq("user_id", player.user_id)
          .eq("reward_month", rewardMonth)
          .eq("duration_seconds", duration)
          .maybeSingle();

        if (existing) {
          console.log(`Player ${player.user_id} already awarded for ${duration}s in ${rewardMonth}`);
          continue;
        }

        const rewardKeys: string[] = [];
        if (rank <= 3) {
          rewardKeys.push("time_trial_top_3", "time_trial_top_5", "time_trial_top_10");
        } else if (rank <= 5) {
          rewardKeys.push("time_trial_top_5", "time_trial_top_10");
        } else {
          rewardKeys.push("time_trial_top_10");
        }

        let coinsAwarded = 0;
        const durationLabel = duration === 60 ? "1 Min" : duration === 120 ? "2 Min" : "5 Min";

        for (const key of rewardKeys) {
          const reward = rewardMap.get(key);
          if (!reward || !reward.is_active || reward.coins_amount <= 0) continue;

          // Get current balance
          const { data: profile } = await supabase
            .from("profiles")
            .select("coins")
            .eq("id", player.user_id)
            .single();

          const newBalance = (profile?.coins || 0) + reward.coins_amount;

          // Update balance
          await supabase
            .from("profiles")
            .update({ coins: newBalance })
            .eq("id", player.user_id);

          // Log transaction
          await supabase.from("coin_transactions").insert({
            user_id: player.user_id,
            amount: reward.coins_amount,
            transaction_type: "earned",
            description: `${durationLabel} Time Trial - Rank #${rank} (${rewardMonth})`,
          });

          coinsAwarded += reward.coins_amount;
        }

        // Record the award
        if (coinsAwarded > 0) {
          await supabase.from("cash_register_leaderboard_rewards").insert({
            user_id: player.user_id,
            reward_month: rewardMonth,
            duration_seconds: duration,
            rank,
            coins_awarded: coinsAwarded,
          });

          playersAwarded++;
          totalAwarded++;
          console.log(`Awarded ${coinsAwarded} coins to player ${player.user_id} for rank #${rank} in ${duration}s`);
        }
      }

      results.push({ duration, playersAwarded });
    }

    console.log(`Total players awarded: ${totalAwarded}`);

    return new Response(
      JSON.stringify({
        success: true,
        rewardMonth,
        totalAwarded,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error awarding time trial rewards:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
