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

    // Get all available dates (up to and including today)
    const { data: dailyWords, error: wordsError } = await supabaseAdmin
      .from("wordle_daily_words")
      .select("id, word_date, theme_id, wordle_themes(name, emoji)")
      .lte("word_date", today)
      .order("word_date", { ascending: false }) as { 
        data: { id: string; word_date: string; theme_id: string; wordle_themes: { name: string; emoji: string } | null }[] | null;
        error: any;
      };

    if (wordsError) throw wordsError;

    // Get user's attempts to show which days are completed
    const { data: attempts, error: attemptsError } = await supabaseAdmin
      .from("wordle_attempts")
      .select("daily_word_id, status")
      .eq("user_id", user.id);

    if (attemptsError) throw attemptsError;

    // Map attempts by daily_word_id for quick lookup
    const attemptsByWordId = new Map(
      (attempts || []).map(a => [a.daily_word_id, a.status])
    );

    // Build response with play status
    const dates = (dailyWords || []).map(word => ({
      date: word.word_date,
      theme: word.wordle_themes?.name,
      themeEmoji: word.wordle_themes?.emoji,
      status: attemptsByWordId.get(word.id) || "not_played",
      isToday: word.word_date === today
    }));

    return new Response(
      JSON.stringify({ 
        dates,
        today
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in get-wordle-dates:", error);
    const message = error instanceof Error ? error.message : "Failed to get dates";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
