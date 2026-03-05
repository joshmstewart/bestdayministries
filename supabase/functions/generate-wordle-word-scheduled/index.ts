import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Scheduled function to pre-generate the Wordle word for today.
 * Runs at midnight MST (7 AM UTC) via cron job.
 * Picks from a curated word list managed in Admin → Games → Daily Five Words.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in MST (UTC-7)
    const now = new Date();
    const mstOffset = -7 * 60;
    const mstDate = new Date(now.getTime() + mstOffset * 60 * 1000);
    const today = mstDate.toISOString().split('T')[0];

    console.log(`[Wordle Scheduler] Checking for word on ${today} MST`);

    // Check if we already have a word for today
    const { data: existingWord } = await supabase
      .from("wordle_daily_words")
      .select("*")
      .eq("word_date", today)
      .single();

    if (existingWord) {
      console.log(`[Wordle Scheduler] Word already exists for ${today}: theme ${existingWord.theme_id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Word already exists for today",
          wordId: existingWord.id,
          theme: existingWord.theme_id,
          date: today
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get a random active theme
    const { data: themes } = await supabase
      .from("wordle_themes")
      .select("*")
      .eq("is_active", true);

    if (!themes || themes.length === 0) {
      throw new Error("No active themes found");
    }

    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    console.log(`[Wordle Scheduler] Selected theme: ${randomTheme.name}`);

    // Get ALL previously used words to exclude them
    const { data: allUsedWords } = await supabase
      .from("wordle_daily_words")
      .select("word")
      .order("word_date", { ascending: false });

    const usedWordsSet = new Set(allUsedWords?.map(w => w.word.toUpperCase()) || []);
    console.log(`[Wordle Scheduler] Total words used so far: ${usedWordsSet.size}`);

    // Get the curated word list
    const { data: validWords, error: validWordsError } = await supabase
      .from("wordle_valid_words")
      .select("word");

    if (validWordsError || !validWords || validWords.length === 0) {
      throw new Error("No valid words in the curated word list. Add words in Admin → Games → Daily Five Words.");
    }

    // Filter out already-used words
    const availableWords = validWords
      .map(w => w.word)
      .filter(w => !usedWordsSet.has(w));

    if (availableWords.length === 0) {
      throw new Error("All curated words have been used! Add more words in Admin → Games → Daily Five Words.");
    }

    console.log(`[Wordle Scheduler] Available words from curated list: ${availableWords.length}`);

    // Use AI to pick the best word for today's theme
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Filter out the theme name itself — the word must NOT be the theme!
    const themeWord = randomTheme.name.toUpperCase();
    const wordsExcludingTheme = availableWords.filter(w => w.toUpperCase() !== themeWord);
    
    if (wordsExcludingTheme.length === 0) {
      throw new Error("No available words after excluding the theme name. Add more words.");
    }

    const prompt = `From this list of words, pick the ONE word that best relates to the theme "${randomTheme.name}" (${randomTheme.description}).

CRITICAL RULE: The word MUST NOT be the same as the theme name "${randomTheme.name}". The theme is shown to the player as a hint, so using it as the answer defeats the purpose.

Available words: ${wordsExcludingTheme.join(", ")}

Also provide a short hint (1 sentence, max 10 words) that gives a clue about the word without being too obvious. The hint must NOT contain the word itself.

Respond in JSON format:
{
  "word": "XXXXX",
  "hint": "A short hint about the word"
}`;

    console.log(`[Wordle Scheduler] Asking AI to pick from ${availableWords.length} words...`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a word game assistant. Pick the best word from the provided list. Only use words from the list. No explanations." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[Wordle Scheduler] AI API error:", errorText);
      throw new Error("Failed to get word selection from AI");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    let wordData;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      wordData = JSON.parse(jsonMatch[1] || content);
    } catch (parseError) {
      console.error("[Wordle Scheduler] Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }

    const word = wordData.word?.toUpperCase();
    const hint = wordData.hint;

    // Validate the word is actually from our curated list
    let finalWord = word;
    let finalHint = hint;

    if (!word || !wordsExcludingTheme.includes(word) || word === themeWord) {
      console.error("[Wordle Scheduler] AI picked an invalid word:", word);
      finalWord = wordsExcludingTheme[Math.floor(Math.random() * wordsExcludingTheme.length)];
      finalHint = `Related to ${randomTheme.name}`;
      console.log("[Wordle Scheduler] Using random fallback word:", finalWord);
    }

    console.log(`[Wordle Scheduler] Generated word for ${today}`);

    // Insert the new daily word
    const { data: newWord, error: insertError } = await supabase
      .from("wordle_daily_words")
      .insert({
        word: finalWord,
        theme_id: randomTheme.id,
        word_date: today,
        hint: finalHint
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Wordle Scheduler] Insert error:", insertError);
      throw insertError;
    }

    console.log(`[Wordle Scheduler] Successfully created word for ${today}, theme: ${randomTheme.name}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "New word generated by scheduler",
        wordId: newWord.id,
        theme: randomTheme.name,
        date: today
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Wordle Scheduler] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate word";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
