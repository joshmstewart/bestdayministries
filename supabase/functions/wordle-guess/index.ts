import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { guess, useHint } = await req.json();

    // Get today's date in MST
    const now = new Date();
    const mstOffset = -7 * 60;
    const mstDate = new Date(now.getTime() + mstOffset * 60 * 1000);
    const today = mstDate.toISOString().split('T')[0];

    // Get today's word
    const { data: dailyWord, error: wordError } = await supabaseAdmin
      .from("wordle_daily_words")
      .select("*, wordle_themes(*)")
      .eq("word_date", today)
      .single();

    if (wordError || !dailyWord) {
      return new Response(
        JSON.stringify({ error: "No word available for today. Please try again later." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get or create user's attempt for today
    let { data: attempt, error: attemptError } = await supabaseAdmin
      .from("wordle_attempts")
      .select("*")
      .eq("user_id", user.id)
      .eq("daily_word_id", dailyWord.id)
      .single();

    if (!attempt) {
      // Create new attempt
      const { data: newAttempt, error: createError } = await supabaseAdmin
        .from("wordle_attempts")
        .insert({
          user_id: user.id,
          daily_word_id: dailyWord.id,
          guesses: [],
          status: "in_progress"
        })
        .select()
        .single();

      if (createError) throw createError;
      attempt = newAttempt;
    }

    // If game is already complete, return current state
    if (attempt.status !== "in_progress") {
      return new Response(
        JSON.stringify({
          gameOver: true,
          won: attempt.status === "won",
          word: dailyWord.word,
          guesses: attempt.guesses,
          hintsUsed: attempt.hints_used,
          coinsEarned: attempt.coins_earned
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle hint request
    if (useHint) {
      if (attempt.hints_used >= 3) {
        return new Response(
          JSON.stringify({ error: "Maximum hints used" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find a letter to reveal (one not already correctly guessed)
      const correctWord = dailyWord.word;
      const revealedPositions = new Set<number>();
      
      // Check which positions are already revealed in guesses
      for (const prevGuess of attempt.guesses) {
        for (let i = 0; i < 5; i++) {
          if (prevGuess[i] === correctWord[i]) {
            revealedPositions.add(i);
          }
        }
      }

      // Find a position to reveal
      const unrevealedPositions = [];
      for (let i = 0; i < 5; i++) {
        if (!revealedPositions.has(i)) {
          unrevealedPositions.push(i);
        }
      }

      if (unrevealedPositions.length === 0) {
        return new Response(
          JSON.stringify({ error: "All letters already revealed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const hintPosition = unrevealedPositions[Math.floor(Math.random() * unrevealedPositions.length)];
      
      // Update hints used
      await supabaseAdmin
        .from("wordle_attempts")
        .update({ 
          hints_used: attempt.hints_used + 1,
          updated_at: new Date().toISOString()
        })
        .eq("id", attempt.id);

      return new Response(
        JSON.stringify({
          hintPosition,
          hintLetter: correctWord[hintPosition],
          hintsRemaining: 2 - attempt.hints_used,
          themeHint: dailyWord.hint
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate guess
    const normalizedGuess = guess?.toUpperCase();
    if (!normalizedGuess || normalizedGuess.length !== 5 || !/^[A-Z]+$/.test(normalizedGuess)) {
      return new Response(
        JSON.stringify({ error: "Please enter a valid 5-letter word" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if max guesses reached
    if (attempt.guesses.length >= 6) {
      return new Response(
        JSON.stringify({ error: "Maximum guesses reached" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add guess
    const newGuesses = [...attempt.guesses, normalizedGuess];
    const isWin = normalizedGuess === dailyWord.word;
    const isLoss = !isWin && newGuesses.length >= 6;

    // Calculate letter results
    const correctWord = dailyWord.word;
    const result = [];
    const letterCounts: Record<string, number> = {};
    
    // Count letters in correct word
    for (const letter of correctWord) {
      letterCounts[letter] = (letterCounts[letter] || 0) + 1;
    }

    // First pass: mark correct positions
    for (let i = 0; i < 5; i++) {
      if (normalizedGuess[i] === correctWord[i]) {
        result[i] = "correct";
        letterCounts[normalizedGuess[i]]--;
      }
    }

    // Second pass: mark present/absent
    for (let i = 0; i < 5; i++) {
      if (result[i]) continue;
      
      if (letterCounts[normalizedGuess[i]] > 0) {
        result[i] = "present";
        letterCounts[normalizedGuess[i]]--;
      } else {
        result[i] = "absent";
      }
    }

    // Calculate coins if won
    let coinsEarned = 0;
    if (isWin) {
      const guessCount = newGuesses.length;
      const rewardKey = `wordle_win_${guessCount}_guess${guessCount > 1 ? 'es' : ''}`;
      
      const { data: reward } = await supabaseAdmin
        .from("coin_rewards_settings")
        .select("coins_amount")
        .eq("reward_key", rewardKey)
        .eq("is_active", true)
        .single();

      if (reward) {
        // Reduce coins for hints used (25% per hint)
        const hintPenalty = 1 - (attempt.hints_used * 0.25);
        coinsEarned = Math.floor(reward.coins_amount * hintPenalty);
        
        // Award coins to user
        await supabaseAdmin
          .from("coin_transactions")
          .insert({
            user_id: user.id,
            amount: coinsEarned,
            transaction_type: "reward",
            description: `Wordle win in ${guessCount} guess${guessCount > 1 ? 'es' : ''}!`,
            metadata: { 
              game: "wordle",
              guesses: guessCount,
              hints_used: attempt.hints_used
            }
          });
      }
    }

    // Update attempt
    await supabaseAdmin
      .from("wordle_attempts")
      .update({
        guesses: newGuesses,
        status: isWin ? "won" : isLoss ? "lost" : "in_progress",
        coins_earned: coinsEarned,
        completed_at: (isWin || isLoss) ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq("id", attempt.id);

    return new Response(
      JSON.stringify({
        result,
        guesses: newGuesses,
        gameOver: isWin || isLoss,
        won: isWin,
        word: (isWin || isLoss) ? dailyWord.word : undefined,
        coinsEarned: isWin ? coinsEarned : 0,
        theme: dailyWord.wordle_themes?.name,
        themeEmoji: dailyWord.wordle_themes?.emoji
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in wordle-guess:", error);
    const message = error instanceof Error ? error.message : "Failed to process guess";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
