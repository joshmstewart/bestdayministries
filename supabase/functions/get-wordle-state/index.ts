import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Shuffle letters consistently based on a seed (word id)
function shuffleWord(word: string, seed: string): string[] {
  const letters = word.split('');
  // Simple seeded shuffle using the seed string
  let seedNum = 0;
  for (let i = 0; i < seed.length; i++) {
    seedNum += seed.charCodeAt(i);
  }
  
  // Fisher-Yates shuffle with seeded random
  for (let i = letters.length - 1; i > 0; i--) {
    seedNum = (seedNum * 1103515245 + 12345) & 0x7fffffff;
    const j = seedNum % (i + 1);
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  
  return letters;
}

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

    // Parse request body for optional date and easyMode parameters
    let requestedDate: string | null = null;
    let requestedEasyMode: boolean | null = null;
    try {
      const body = await req.json();
      requestedDate = body?.date || null;
      requestedEasyMode = body?.easyMode !== undefined ? body.easyMode : null;
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Get today's date in MST
    const now = new Date();
    const mstOffset = -7 * 60;
    const mstDate = new Date(now.getTime() + mstOffset * 60 * 1000);
    const today = mstDate.toISOString().split('T')[0];
    
    // Use requested date or default to today
    const targetDate = requestedDate || today;
    const isToday = targetDate === today;

    // Run all queries in parallel for performance
    const [userRoleResult, profileResult, dailyWordResult] = await Promise.all([
      supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single(),
      supabaseAdmin
        .from("profiles")
        .select("wordle_easy_mode_enabled")
        .eq("id", user.id)
        .single(),
      supabaseAdmin
        .from("wordle_daily_words")
        .select("*, wordle_themes(*)")
        .eq("word_date", targetDate)
        .single()
    ]);

    const userRole = userRoleResult.data;
    const profile = profileResult.data;
    const dailyWord = dailyWordResult.data;

    // Determine if easy mode should be used
    // Priority: 1) explicit request, 2) user preference, 3) role default (bestie = true)
    const isBestie = userRole?.role === "bestie";
    const userEasyModePref = profile?.wordle_easy_mode_enabled ?? null;
    let useEasyMode: boolean;
    if (requestedEasyMode !== null) {
      useEasyMode = requestedEasyMode;
    } else if (userEasyModePref !== null) {
      useEasyMode = userEasyModePref;
    } else {
      useEasyMode = isBestie;
    }

    if (!dailyWord) {
      return new Response(
        JSON.stringify({ 
          hasWord: false,
          message: "No word available for today yet"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's attempt for today
    const { data: attempt } = await supabaseAdmin
      .from("wordle_attempts")
      .select("*")
      .eq("user_id", user.id)
      .eq("daily_word_id", dailyWord.id)
      .single();

    // Calculate results for each guess
    const guessResults = [];
    if (attempt?.guesses) {
      for (const guess of attempt.guesses) {
        const result = [];
        const letterCounts: Record<string, number> = {};
        
        for (const letter of dailyWord.word) {
          letterCounts[letter] = (letterCounts[letter] || 0) + 1;
        }

        // First pass: correct positions
        for (let i = 0; i < 5; i++) {
          if (guess[i] === dailyWord.word[i]) {
            result[i] = "correct";
            letterCounts[guess[i]]--;
          }
        }

        // Second pass: present/absent
        for (let i = 0; i < 5; i++) {
          if (result[i]) continue;
          if (letterCounts[guess[i]] > 0) {
            result[i] = "present";
            letterCounts[guess[i]]--;
          } else {
            result[i] = "absent";
          }
        }

        guessResults.push({ guess, result });
      }
    }

    // Calculate extra rounds info
    const extraRoundsUsed = attempt?.extra_rounds_used || 0;
    const maxGuesses = 6 + (extraRoundsUsed * 5);
    const maxExtraRounds = 2;
    const currentGuessCount = attempt?.guesses?.length || 0;
    const isAtRoundEnd = currentGuessCount >= maxGuesses && attempt?.status === "in_progress";
    const canContinue = isAtRoundEnd && extraRoundsUsed < maxExtraRounds;

    // Generate scrambled letters for easy mode
    // Shuffle the word's letters consistently but randomly per day
    const scrambledLetters = useEasyMode ? shuffleWord(dailyWord.word, dailyWord.id) : null;

    return new Response(
      JSON.stringify({
        hasWord: true,
        date: targetDate,
        isToday,
        theme: dailyWord.wordle_themes?.name,
        themeEmoji: dailyWord.wordle_themes?.emoji,
        themeHint: dailyWord.hint,
        guesses: attempt?.guesses || [],
        guessResults,
        hintsUsed: attempt?.hints_used || 0,
        status: attempt?.status || "not_started",
        gameOver: attempt?.status === "won" || attempt?.status === "lost",
        won: attempt?.status === "won",
        word: (attempt?.status === "won" || attempt?.status === "lost") ? dailyWord.word : undefined,
        coinsEarned: attempt?.coins_earned || 0,
        // Extra rounds info
        extraRoundsUsed,
        maxGuesses,
        canContinue,
        roundEnded: isAtRoundEnd,
        // Easy mode info
        easyMode: useEasyMode,
        scrambledLetters,
        easyModePreference: profile?.wordle_easy_mode_enabled,
        isBestie
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in get-wordle-state:", error);
    const message = error instanceof Error ? error.message : "Failed to get game state";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
