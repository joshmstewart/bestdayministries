import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getMSTDate(): string {
  const now = new Date();
  const mstOffsetMinutes = -7 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const mstTime = new Date(utc + mstOffsetMinutes * 60000);
  return mstTime.toISOString().split("T")[0];
}

function getMSTTomorrowMidnightUTC(): string {
  const now = new Date();
  const mstOffsetMinutes = -7 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const mstTime = new Date(utc + mstOffsetMinutes * 60000);
  
  const tomorrowMST = new Date(mstTime);
  tomorrowMST.setDate(tomorrowMST.getDate() + 1);
  tomorrowMST.setHours(0, 0, 0, 0);
  
  const tomorrowUTC = new Date(tomorrowMST.getTime() - mstOffsetMinutes * 60000);
  return tomorrowUTC.toISOString();
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

    // User client for auth
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

    const mstDate = getMSTDate();
    const expiresAt = getMSTTomorrowMidnightUTC();

    // Check if reward already claimed today
    const { data: existingReward } = await adminClient
      .from("chore_daily_rewards")
      .select("id")
      .eq("user_id", user.id)
      .eq("reward_date", mstDate)
      .maybeSingle();

    if (existingReward) {
      // Already claimed - check if bonus card exists
      const { data: existingCard } = await adminClient
        .from("daily_scratch_cards")
        .select("id, is_scratched")
        .eq("user_id", user.id)
        .eq("date", mstDate)
        .eq("is_bonus_card", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingCard) {
        return new Response(JSON.stringify({ 
          success: true, 
          alreadyClaimed: true,
          cardId: existingCard.id,
          isScratched: existingCard.is_scratched
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get active sticker collection
    const { data: collection, error: collectionError } = await adminClient
      .from("sticker_collections")
      .select("id")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (collectionError || !collection) {
      return new Response(JSON.stringify({ error: "No active sticker collection found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create reward record if not exists
    if (!existingReward) {
      const { error: rewardError } = await adminClient
        .from("chore_daily_rewards")
        .insert({
          user_id: user.id,
          reward_date: mstDate,
          reward_type: "sticker_pack",
        });

      if (rewardError) {
        console.error("Error creating reward:", rewardError);
        return new Response(JSON.stringify({ error: "Failed to create reward record" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Create the bonus scratch card
    const { data: newCard, error: cardError } = await adminClient
      .from("daily_scratch_cards")
      .insert({
        user_id: user.id,
        collection_id: collection.id,
        date: mstDate,
        expires_at: expiresAt,
        is_bonus_card: true,
        is_scratched: false,
        purchase_number: 0,
      })
      .select("id")
      .single();

    if (cardError) {
      console.error("Error creating bonus card:", cardError);
      return new Response(JSON.stringify({ error: "Failed to create bonus card" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      cardId: newCard.id,
      isScratched: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in claim-chore-reward:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
