import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Scheduled function to pre-generate the Wordle word for today.
 * Runs at midnight MST (7 AM UTC) via cron job.
 * This prevents slow initial loads when the first user of the day accesses the game.
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

    // Get today's date in MST (UTC-7) - same logic as generate-wordle-word
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

    // Get ALL previously used words to avoid any repeats until pool is exhausted
    const { data: allUsedWords } = await supabase
      .from("wordle_daily_words")
      .select("word")
      .order("word_date", { ascending: false });

    const usedWordsList = allUsedWords?.map(w => w.word.toUpperCase()).join(", ") || "";
    const usedWordsCount = allUsedWords?.length || 0;
    
    console.log(`[Wordle Scheduler] Total words used so far: ${usedWordsCount}`);

    // Generate a word using AI
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Generate a single 5-letter English word related to the theme "${randomTheme.name}" (${randomTheme.description}). 
The word must:
- Be exactly 5 letters long
- Be a common, recognizable English word that most people would know
- Be appropriate for all ages (family-friendly)
- Be related to the theme "${randomTheme.name}"
- NOT be any of these recently used words: ${usedWordsList || "none yet"}

Also provide a short hint (1 sentence, max 10 words) that gives a clue about the word without being too obvious.

Respond in JSON format:
{
  "word": "XXXXX",
  "hint": "A short hint about the word"
}`;

    console.log(`[Wordle Scheduler] Generating word with AI...`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a word game assistant. Generate exactly what is asked, no explanations." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[Wordle Scheduler] AI API error:", errorText);
      throw new Error("Failed to generate word from AI");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    // Parse the JSON response
    let wordData;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      wordData = JSON.parse(jsonMatch[1] || content);
    } catch (parseError) {
      console.error("[Wordle Scheduler] Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }

    const word = wordData.word?.toUpperCase();
    const hint = wordData.hint;

    if (!word || word.length !== 5 || !/^[A-Z]+$/.test(word)) {
      console.error("[Wordle Scheduler] Invalid word generated:", word);
      throw new Error("AI generated an invalid word");
    }

    console.log(`[Wordle Scheduler] Generated word for ${today}`);

    // Insert the new daily word
    const { data: newWord, error: insertError } = await supabase
      .from("wordle_daily_words")
      .insert({
        word: word,
        theme_id: randomTheme.id,
        word_date: today,
        hint: hint
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
