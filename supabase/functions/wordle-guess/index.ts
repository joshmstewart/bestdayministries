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

    const { guess, useHint, date: requestedDate, easyMode: requestedEasyMode } = await req.json();

    // Get today's date in MST
    const now = new Date();
    const mstOffset = -7 * 60;
    const mstDate = new Date(now.getTime() + mstOffset * 60 * 1000);
    const today = mstDate.toISOString().split('T')[0];
    
    // Use requested date or default to today
    const targetDate = requestedDate || today;
    const isToday = targetDate === today;

    // Get user's role and easy mode preference
    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("wordle_easy_mode_enabled")
      .eq("id", user.id)
      .single();

    // Determine if easy mode should be used
    const isBestie = userRole?.role === "bestie";
    const userEasyModePref = profile?.wordle_easy_mode_enabled ?? null;
    let useEasyMode: boolean;
    if (requestedEasyMode !== undefined) {
      useEasyMode = requestedEasyMode;
    } else if (userEasyModePref !== null) {
      useEasyMode = userEasyModePref;
    } else {
      useEasyMode = isBestie;
    }

    // Get the word for the target date
    const { data: dailyWord, error: wordError } = await supabaseAdmin
      .from("wordle_daily_words")
      .select("*, wordle_themes(*)")
      .eq("word_date", targetDate)
      .single();

    if (wordError || !dailyWord) {
      return new Response(
        JSON.stringify({ error: `No word available for ${targetDate}. Please try another date.` }),
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
      // Create new attempt - track easy mode on first guess
      const { data: newAttempt, error: createError } = await supabaseAdmin
        .from("wordle_attempts")
        .insert({
          user_id: user.id,
          daily_word_id: dailyWord.id,
          guesses: [],
          status: "in_progress",
          is_easy_mode: useEasyMode
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

    // Calculate max guesses based on extra rounds used
    // Base: 6 guesses, +5 per extra round (max 2 extra rounds = 16 total)
    const extraRoundsUsed = attempt.extra_rounds_used || 0;
    const maxGuesses = 6 + (extraRoundsUsed * 5);
    
    if (attempt.guesses.length >= maxGuesses) {
      return new Response(
        JSON.stringify({ error: "Maximum guesses reached. Use continue to get more guesses." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add guess
    const newGuesses = [...attempt.guesses, normalizedGuess];
    const isWin = normalizedGuess === dailyWord.word;
    // Loss only happens when max guesses reached AND no more extra rounds available
    const maxExtraRounds = 2;
    const isAtRoundEnd = newGuesses.length >= maxGuesses;
    const canContinue = isAtRoundEnd && extraRoundsUsed < maxExtraRounds;
    const isLoss = !isWin && isAtRoundEnd && !canContinue;

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
      // Determine the reward key based on guess count
      let rewardKey: string;
      if (guessCount === 1) {
        rewardKey = 'wordle_win_1_guess';
      } else if (guessCount >= 2 && guessCount <= 6) {
        rewardKey = `wordle_win_${guessCount}_guesses`;
      } else if (guessCount === 7) {
        rewardKey = 'wordle_win_7';
      } else {
        rewardKey = 'wordle_win_8_plus';
      }
      
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

    // Update user stats when game is complete
    if (isWin || isLoss) {
      try {
        // Get existing user stats (use maybeSingle to avoid error if not found)
        const { data: existingStats, error: fetchError } = await supabaseAdmin
          .from("wordle_user_stats")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching user stats:", fetchError);
        }

        const yesterday = new Date(mstDate);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (!existingStats) {
          // Create new stats row
          // Only affect streak if playing today's puzzle
          const newStreak = isToday ? (isWin ? 1 : 0) : 0;
          const currentMonthYear = new Date().toISOString().slice(0, 7); // YYYY-MM format
          // Only count monthly wins for TODAY's puzzle wins (not catch-up games)
          const monthlyWinCount = (isWin && isToday) ? 1 : 0;
          const { error: insertError } = await supabaseAdmin
            .from("wordle_user_stats")
            .insert({
              user_id: user.id,
              total_games_played: 1,
              total_wins: isWin ? 1 : 0,
              current_streak: newStreak,
              best_streak: newStreak,
              last_played_date: isToday ? today : null,
              last_win_date: (isWin && isToday) ? today : null,
              current_month_wins: monthlyWinCount,
              current_month_year: currentMonthYear
            });
          
          if (insertError) {
            console.error("Error creating user stats:", insertError);
          }
        } else {
          // Update existing stats
          let newStreak = existingStats.current_streak;
          let newBestStreak = existingStats.best_streak;
          let newLastPlayedDate = existingStats.last_played_date;
          let newLastWinDate = existingStats.last_win_date;
          
          // Only update streak-related fields if playing today's puzzle
          if (isToday) {
            if (isWin) {
              // If last win was yesterday, continue streak; otherwise start new streak
              if (existingStats.last_win_date === yesterdayStr) {
                newStreak = existingStats.current_streak + 1;
              } else if (existingStats.last_win_date !== today) {
                newStreak = 1;
              }
              newLastWinDate = today;
            } else {
              // Loss breaks the streak (only for today's game)
              newStreak = 0;
            }
            newBestStreak = Math.max(existingStats.best_streak, newStreak);
            newLastPlayedDate = today;
          }
          // For past days: games played and win rate are updated, but NOT streak

          // Only count wins toward monthly stats if playing TODAY's puzzle
          // This prevents catch-up games from inflating monthly win counts
          const currentMonthYear = new Date().toISOString().slice(0, 7);
          const isNewMonth = existingStats.current_month_year !== currentMonthYear;
          let newMonthlyWins = existingStats.current_month_wins || 0;
          
          if (isNewMonth) {
            // Reset monthly wins for new month, only count if today's puzzle and win
            newMonthlyWins = (isWin && isToday) ? 1 : 0;
          } else if (isWin && isToday) {
            // Only increment monthly wins for today's puzzle wins
            newMonthlyWins = (existingStats.current_month_wins || 0) + 1;
          }

          const { error: updateError } = await supabaseAdmin
            .from("wordle_user_stats")
            .update({
              total_games_played: existingStats.total_games_played + 1,
              total_wins: isWin ? existingStats.total_wins + 1 : existingStats.total_wins,
              current_streak: newStreak,
              best_streak: newBestStreak,
              last_played_date: newLastPlayedDate,
              last_win_date: newLastWinDate,
              current_month_wins: newMonthlyWins,
              current_month_year: currentMonthYear,
              updated_at: new Date().toISOString()
            })
            .eq("id", existingStats.id);

          if (updateError) {
            console.error("Error updating user stats:", updateError);
          }
        }
      } catch (statsError) {
        console.error("Error in stats update block:", statsError);
        // Don't throw - let the game response still succeed
      }
    }

    return new Response(
      JSON.stringify({
        result,
        guesses: newGuesses,
        gameOver: isWin || isLoss,
        won: isWin,
        word: (isWin || isLoss) ? dailyWord.word : undefined,
        coinsEarned: isWin ? coinsEarned : 0,
        theme: dailyWord.wordle_themes?.name,
        themeEmoji: dailyWord.wordle_themes?.emoji,
        // Extra rounds info
        canContinue,
        extraRoundsUsed,
        maxGuesses,
        roundEnded: isAtRoundEnd && !isWin
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
