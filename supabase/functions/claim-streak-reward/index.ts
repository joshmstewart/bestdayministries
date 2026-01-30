import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
 * Get yesterday's date in MST.
 */
function getYesterdayMST(): string {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(yesterday);
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

    // Admin client for database operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const todayMST = getMSTDate();
    const yesterdayMST = getYesterdayMST();

    // Get or create user streak record
    let { data: streak, error: streakError } = await adminClient
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (streakError && streakError.code !== "PGRST116") {
      console.error("Error fetching streak:", streakError);
      throw streakError;
    }

    // Create streak record if doesn't exist
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

    // Check if already logged in today
    if (streak.last_login_date === todayMST) {
      return new Response(JSON.stringify({
        success: false,
        reason: "already_logged_today",
        streak: streak.current_streak,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate new streak
    let newStreak = 1;
    if (streak.last_login_date === yesterdayMST) {
      // Consecutive day - increment streak
      newStreak = (streak.current_streak || 0) + 1;
    }
    // else: streak broken, reset to 1

    const newLongest = Math.max(newStreak, streak.longest_streak || 0);
    const newTotal = (streak.total_login_days || 0) + 1;

    // Get milestones
    const { data: milestones } = await adminClient
      .from("streak_milestones")
      .select("*")
      .eq("is_active", true)
      .order("days_required", { ascending: true });

    // Find next milestone
    const nextMilestone = milestones?.find((m) => m.days_required > newStreak);

    // Update streak
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

    // Check if we just hit a milestone
    const hitMilestone = milestones?.find((m) => m.days_required === newStreak);
    let milestonesAwarded: any[] = [];

    if (hitMilestone) {
      // Check if already awarded
      const { data: existing } = await adminClient
        .from("user_streak_milestones")
        .select("id")
        .eq("user_id", user.id)
        .eq("milestone_id", hitMilestone.id)
        .maybeSingle();

      if (!existing) {
        // Award milestone!
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
            const { data: profile } = await adminClient
              .from("profiles")
              .select("coins")
              .eq("id", user.id)
              .single();

            await adminClient
              .from("profiles")
              .update({ coins: (profile?.coins || 0) + hitMilestone.bonus_coins })
              .eq("id", user.id);

            await adminClient.from("coin_transactions").insert({
              user_id: user.id,
              amount: hitMilestone.bonus_coins,
              transaction_type: "earned",
              description: `${hitMilestone.badge_name} streak milestone!`,
            });
          }

          // Award free sticker packs
          if (hitMilestone.free_sticker_packs > 0) {
            // Get active collection
            const { data: collection } = await adminClient
              .from("sticker_collections")
              .select("id")
              .eq("is_active", true)
              .eq("is_featured", true)
              .maybeSingle();

            if (collection) {
              for (let i = 0; i < hitMilestone.free_sticker_packs; i++) {
                await adminClient
                  .from("daily_scratch_cards")
                  .insert({
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

          milestonesAwarded.push({
            badge_name: hitMilestone.badge_name,
            badge_icon: hitMilestone.badge_icon,
            bonus_coins: hitMilestone.bonus_coins,
            free_sticker_packs: hitMilestone.free_sticker_packs,
            description: hitMilestone.description,
          });
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      current_streak: newStreak,
      longest_streak: newLongest,
      total_login_days: newTotal,
      milestones_awarded: milestonesAwarded,
      next_milestone: nextMilestone ? {
        days_required: nextMilestone.days_required,
        badge_name: nextMilestone.badge_name,
        bonus_coins: nextMilestone.bonus_coins,
      } : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in claim-streak-reward:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
