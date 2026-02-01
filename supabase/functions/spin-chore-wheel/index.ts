import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getMSTDate(): string {
  // Create a date formatter for MST timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

function getMSTTomorrowMidnightUTC(): string {
  // Get current time in MST
  const now = new Date();
  const mstFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const mstParts = mstFormatter.formatToParts(now);
  const year = parseInt(mstParts.find(p => p.type === 'year')?.value || '2025');
  const month = parseInt(mstParts.find(p => p.type === 'month')?.value || '1') - 1;
  const day = parseInt(mstParts.find(p => p.type === 'day')?.value || '1');
  
  // Create tomorrow midnight in MST (UTC-7)
  const tomorrowMST = new Date(Date.UTC(year, month, day + 1, 7, 0, 0, 0));
  return tomorrowMST.toISOString();
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

    const { prizeType, prizeAmount } = await req.json();

    if (!prizeType || !prizeAmount) {
      return new Response(JSON.stringify({ error: "Missing prize details" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mstDate = getMSTDate();
    const expiresAt = getMSTTomorrowMidnightUTC();

    // Check if user already spun today
    const { data: existingSpin } = await adminClient
      .from("chore_wheel_spins")
      .select("id")
      .eq("user_id", user.id)
      .eq("spin_date", mstDate)
      .maybeSingle();

    if (existingSpin) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Already spun today" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active wheel config
    const { data: configData } = await adminClient
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "chore_wheel_config")
      .maybeSingle();

    const wheelConfig = configData?.setting_value?.active_preset || "balanced";

    // Record the spin
    const { error: spinError } = await adminClient
      .from("chore_wheel_spins")
      .insert({
        user_id: user.id,
        spin_date: mstDate,
        prize_type: prizeType,
        prize_amount: prizeAmount,
        wheel_config: wheelConfig,
      });

    if (spinError) {
      console.error("Error recording spin:", spinError);
      return new Response(JSON.stringify({ error: "Failed to record spin" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Award the prize
    if (prizeType === "coins") {
      // Add coins to user's balance
      const { data: profile } = await adminClient
        .from("profiles")
        .select("coin_balance")
        .eq("id", user.id)
        .single();

      const currentBalance = profile?.coin_balance || 0;
      const newBalance = currentBalance + prizeAmount;

      await adminClient
        .from("profiles")
        .update({ coin_balance: newBalance })
        .eq("id", user.id);

      // Record coin transaction
      await adminClient
        .from("coin_transactions")
        .insert({
          user_id: user.id,
          amount: prizeAmount,
          transaction_type: "chore_wheel_reward",
          description: `Won ${prizeAmount} coins from chore reward wheel`,
        });

      return new Response(JSON.stringify({ 
        success: true, 
        prizeType: "coins",
        amount: prizeAmount,
        newBalance
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (prizeType === "sticker_pack") {
      // Get active sticker collection
      const { data: collection, error: collectionError } = await adminClient
        .from("sticker_collections")
        .select("id")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (collectionError || !collection) {
        return new Response(JSON.stringify({ error: "No active sticker collection" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create the sticker pack(s) - use timestamp for unique purchase_number
      const cardIds: string[] = [];
      const baseTimestamp = Date.now();
      
      for (let i = 0; i < prizeAmount; i++) {
        const { data: newCard, error: cardError } = await adminClient
          .from("daily_scratch_cards")
          .insert({
            user_id: user.id,
            collection_id: collection.id,
            date: mstDate,
            expires_at: expiresAt,
            is_bonus_card: true,
            is_scratched: false,
            purchase_number: baseTimestamp + i, // Use timestamp to ensure uniqueness
          })
          .select("id")
          .single();

        if (cardError) {
          console.error("Error creating bonus card:", cardError);
        } else if (newCard) {
          cardIds.push(newCard.id);
        }
      }

      // Update the spin record with card IDs so they can be retrieved later
      if (cardIds.length > 0) {
        await adminClient
          .from("chore_wheel_spins")
          .update({ card_ids: cardIds })
          .eq("user_id", user.id)
          .eq("spin_date", mstDate);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        prizeType: "sticker_pack",
        amount: prizeAmount,
        cardIds
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid prize type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in spin-chore-wheel:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
