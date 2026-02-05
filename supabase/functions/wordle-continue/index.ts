import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Get today's date in MST
    const now = new Date();
    const mstOffset = -7 * 60;
    const mstDate = new Date(now.getTime() + mstOffset * 60 * 1000);
    const today = mstDate.toISOString().split('T')[0];

    // Get today's word
    const { data: dailyWord } = await supabaseAdmin
      .from("wordle_daily_words")
      .select("id")
      .eq("word_date", today)
      .single();

    if (!dailyWord) {
      return new Response(
        JSON.stringify({ error: "No word available for today" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's attempt
    const { data: attempt } = await supabaseAdmin
      .from("wordle_attempts")
      .select("*")
      .eq("user_id", user.id)
      .eq("daily_word_id", dailyWord.id)
      .single();

    if (!attempt) {
      return new Response(
        JSON.stringify({ error: "No game in progress" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if game is already complete
    if (attempt.status !== "in_progress") {
      return new Response(
        JSON.stringify({ error: "Game is already complete" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if can use extra round
    const extraRoundsUsed = attempt.extra_rounds_used || 0;
    const maxExtraRounds = 2;
    const maxGuesses = 6 + (extraRoundsUsed * 5);

    if (attempt.guesses.length < maxGuesses) {
      return new Response(
        JSON.stringify({ error: "You still have guesses remaining" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (extraRoundsUsed >= maxExtraRounds) {
      return new Response(
        JSON.stringify({ error: "No more extra rounds available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use an extra round
    const newExtraRoundsUsed = extraRoundsUsed + 1;
    const newMaxGuesses = 6 + (newExtraRoundsUsed * 5);

    await supabaseAdmin
      .from("wordle_attempts")
      .update({
        extra_rounds_used: newExtraRoundsUsed,
        updated_at: new Date().toISOString()
      })
      .eq("id", attempt.id);

    return new Response(
      JSON.stringify({
        success: true,
        extraRoundsUsed: newExtraRoundsUsed,
        maxGuesses: newMaxGuesses,
        remainingExtraRounds: maxExtraRounds - newExtraRoundsUsed
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in wordle-continue:", error);
    const message = error instanceof Error ? error.message : "Failed to continue game";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
