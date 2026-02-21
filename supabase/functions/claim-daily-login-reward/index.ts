import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Get today's date in MST (America/Denver) timezone.
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

/**
 * Get yesterday's date in MST by subtracting one calendar day from today's MST date.
 * This avoids the 24-hour subtraction bug around DST transitions.
 */
function getYesterdayMST(): string {
  const todayStr = getMSTDate(); // "YYYY-MM-DD"
  const [y, m, d] = todayStr.split('-').map(Number);
  const yesterday = new Date(y, m - 1, d - 1); // JS handles month/year rollover
  const yy = yesterday.getFullYear();
  const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
  const dd = String(yesterday.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
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

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const todayMST = getMSTDate();
    const yesterdayMST = getYesterdayMST();

    // === STEP 1: Daily login reward ===
    const { data: rewardSetting } = await adminClient
      .from("coin_rewards_settings")
      .select("coins_amount, is_active")
      .eq("reward_key", "daily_login")
      .single();

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("last_daily_login_reward_at, coins")
      .eq("id", user.id)
      .single();

    if (profileError) {
      throw new Error("Failed to fetch profile");
    }

    let rewardAmount = 0;
    let newBalance = profile.coins || 0;
    let alreadyClaimed = false;

    if (rewardSetting?.is_active) {
      // Check if already rewarded today
      if (profile.last_daily_login_reward_at) {
        const lastRewardFormatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Denver',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        const lastRewardDateStr = lastRewardFormatter.format(new Date(profile.last_daily_login_reward_at));
        alreadyClaimed = lastRewardDateStr === todayMST;
      }

      if (!alreadyClaimed) {
        rewardAmount = rewardSetting.coins_amount;
        newBalance += rewardAmount;
        const nowISO = new Date().toISOString();
        const expectedLastReward = profile.last_daily_login_reward_at;

        let updateQuery = adminClient
          .from("profiles")
          .update({
            coins: newBalance,
            last_daily_login_reward_at: nowISO,
          })
          .eq("id", user.id);

        if (expectedLastReward) {
          updateQuery = updateQuery.eq("last_daily_login_reward_at", expectedLastReward);
        } else {
          updateQuery = updateQuery.is("last_daily_login_reward_at", null);
        }

        const { data: updateResult, error: updateError } = await updateQuery.select("id");
        if (updateError) throw updateError;

        if (!updateResult || updateResult.length === 0) {
          alreadyClaimed = true;
          rewardAmount = 0;
          newBalance = profile.coins || 0;
        } else {
          await adminClient.from("coin_transactions").insert({
            user_id: user.id,
            amount: rewardAmount,
            transaction_type: "earned",
            description: "Daily login reward",
          });
        }
      }
    }

    // === STEP 2: Streak tracking (always runs, even if coins already claimed) ===
    let { data: streak } = await adminClient
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!streak) {
      const { data: newStreak, error: createError } = await adminClient
        .from("user_streaks")
        .insert({
          user_id: user.id,
          current_streak: 0,
          longest_streak: 0,
          total_login_days: 0,
        })
        .select()
        .single();
      if (createError) throw createError;
      streak = newStreak;
    }

    let streakResult: any = {
      current_streak: streak.current_streak,
      longest_streak: streak.longest_streak,
      milestones_awarded: [],
      bonus_card_id: null,
    };

    // Only update streak if not already logged today
    if (streak.last_login_date !== todayMST) {
      let newStreak = 1;
      if (streak.last_login_date === yesterdayMST) {
        newStreak = (streak.current_streak || 0) + 1;
      }

      const newLongest = Math.max(newStreak, streak.longest_streak || 0);
      const newTotal = (streak.total_login_days || 0) + 1;

      // Get milestones
      const { data: milestones } = await adminClient
        .from("streak_milestones")
        .select("*")
        .eq("is_active", true)
        .order("days_required", { ascending: true });

      const nextMilestone = milestones?.find((m) => m.days_required > newStreak);

      const { error: updateError } = await adminClient
        .from("user_streaks")
        .update({
          current_streak: newStreak,
          longest_streak: newLongest,
          last_login_date: todayMST,
          next_milestone_days: nextMilestone?.days_required || null,
          total_login_days: newTotal,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      streakResult.current_streak = newStreak;
      streakResult.longest_streak = newLongest;

      // Check milestone
      const hitMilestone = milestones?.find((m) => m.days_required === newStreak);
      if (hitMilestone) {
        const { data: existing } = await adminClient
          .from("user_streak_milestones")
          .select("id")
          .eq("user_id", user.id)
          .eq("milestone_id", hitMilestone.id)
          .maybeSingle();

        if (!existing) {
          const { error: milestoneError } = await adminClient
            .from("user_streak_milestones")
            .insert({
              user_id: user.id,
              milestone_id: hitMilestone.id,
              coins_awarded: hitMilestone.bonus_coins,
              sticker_packs_awarded: hitMilestone.free_sticker_packs,
            });

          if (!milestoneError) {
            // Award coins
            if (hitMilestone.bonus_coins > 0) {
              const { data: latestProfile } = await adminClient
                .from("profiles")
                .select("coins")
                .eq("id", user.id)
                .single();

              await adminClient
                .from("profiles")
                .update({ coins: (latestProfile?.coins || 0) + hitMilestone.bonus_coins })
                .eq("id", user.id);

              await adminClient.from("coin_transactions").insert({
                user_id: user.id,
                amount: hitMilestone.bonus_coins,
                transaction_type: "earned",
                description: `${hitMilestone.badge_name} streak milestone!`,
              });
            }

            // Award sticker packs
            let bonusCardId: string | null = null;
            if (hitMilestone.free_sticker_packs > 0) {
              const { data: collection } = await adminClient
                .from("sticker_collections")
                .select("id")
                .eq("is_active", true)
                .eq("is_featured", true)
                .maybeSingle();

              if (collection) {
                const { data: firstCard } = await adminClient
                  .from("daily_scratch_cards")
                  .insert({
                    user_id: user.id,
                    date: todayMST,
                    collection_id: collection.id,
                    is_bonus_card: true,
                    purchase_number: Date.now(),
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  })
                  .select("id")
                  .single();

                if (firstCard) bonusCardId = firstCard.id;

                for (let i = 1; i < hitMilestone.free_sticker_packs; i++) {
                  await adminClient.from("daily_scratch_cards").insert({
                    user_id: user.id,
                    date: todayMST,
                    collection_id: collection.id,
                    is_bonus_card: true,
                    purchase_number: Date.now() + i,
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  });
                }
              }
            }

            streakResult.milestones_awarded = [{
              badge_name: hitMilestone.badge_name,
              badge_icon: hitMilestone.badge_icon,
              bonus_coins: hitMilestone.bonus_coins,
              free_sticker_packs: hitMilestone.free_sticker_packs,
              description: hitMilestone.description,
            }];
            streakResult.bonus_card_id = bonusCardId;
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: !alreadyClaimed && rewardAmount > 0,
      amount: rewardAmount,
      newBalance,
      date: todayMST,
      // Streak data included in same response
      current_streak: streakResult.current_streak,
      longest_streak: streakResult.longest_streak,
      milestones_awarded: streakResult.milestones_awarded,
      bonus_card_id: streakResult.bonus_card_id,
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
