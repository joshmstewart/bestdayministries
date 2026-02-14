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
    const { userId, weekStart, weekEnd } = await req.json();

    if (!userId || !weekStart || !weekEnd) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch mood entries for the week INCLUDING notes
    const { data: entries, error: entriesError } = await supabase
      .from("mood_entries")
      .select("entry_date, mood_emoji, mood_label, note")
      .eq("user_id", userId)
      .gte("entry_date", weekStart)
      .lte("entry_date", weekEnd)
      .order("entry_date", { ascending: true });

    // Fetch previous 3 weeks of mood data for trend context
    const threeWeeksBeforeStart = new Date(weekStart);
    threeWeeksBeforeStart.setDate(threeWeeksBeforeStart.getDate() - 21);
    const prevStartStr = threeWeeksBeforeStart.toISOString().split('T')[0];

    const { data: previousEntries } = await supabase
      .from("mood_entries")
      .select("entry_date, mood_emoji, mood_label, note")
      .eq("user_id", userId)
      .gte("entry_date", prevStartStr)
      .lt("entry_date", weekStart)
      .order("entry_date", { ascending: true });

    if (entriesError) throw entriesError;

    if (!entries || entries.length < 3) {
      return new Response(
        JSON.stringify({ error: "Not enough mood entries for summary" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch emotion categories
    const { data: emotionTypes } = await supabase
      .from("emotion_types")
      .select("name, category");

    const categoryMap: { [key: string]: string } = {};
    emotionTypes?.forEach((e: any) => {
      categoryMap[e.name] = e.category?.toLowerCase() || "neutral";
    });

    // Prepare mood data for AI
    const moodData = entries.map(e => ({
      date: e.entry_date,
      mood: e.mood_label,
      emoji: e.mood_emoji,
      category: categoryMap[e.mood_label] || "neutral",
      note: e.note || null,
    }));

    const categoryCounts = {
      positive: moodData.filter(m => m.category === "positive").length,
      neutral: moodData.filter(m => m.category === "neutral").length,
      negative: moodData.filter(m => m.category === "negative").length,
    };

    const entriesWithNotes = moodData.filter(m => m.note);

    // Build previous weeks context
    let previousWeeksContext = "";
    if (previousEntries && previousEntries.length > 0) {
      const prevData = previousEntries.map(e => ({
        date: e.entry_date,
        mood: e.mood_label,
        emoji: e.mood_emoji,
        category: categoryMap[e.mood_label] || "neutral",
        note: e.note || null,
      }));
      const prevPositive = prevData.filter(m => m.category === "positive").length;
      const prevNegative = prevData.filter(m => m.category === "negative").length;
      const prevNotes = prevData.filter(m => m.note);
      previousWeeksContext = `\nPrevious 3 weeks context (${prevData.length} entries: ${prevPositive} positive, ${prevData.length - prevPositive - prevNegative} neutral, ${prevNegative} negative):
${prevData.map(m => {
  let line = `- ${m.date}: ${m.emoji} ${m.mood}`;
  if (m.note) line += ` — "${m.note}"`;
  return line;
}).join("\n")}
${prevNotes.length > 0 ? `\nThey shared ${prevNotes.length} note(s) in previous weeks — use these for trend comparison.` : ''}`;
    }

    const prompt = `You are a caring, perceptive wellness companion for adults with intellectual and developmental disabilities (IDD). 

Analyze this person's mood data from the past week and provide a thoughtful, personalized summary.

Mood entries this week:
${moodData.map(m => {
  let line = `- ${m.date}: ${m.emoji} ${m.mood}`;
  if (m.note) line += ` — they shared: "${m.note}"`;
  return line;
}).join("\n")}

Summary: ${categoryCounts.positive} positive, ${categoryCounts.neutral} neutral, ${categoryCounts.negative} negative moods.
${entriesWithNotes.length > 0 ? `\nThis person left ${entriesWithNotes.length} personal note(s) this week. These are IMPORTANT — they reveal what's actually going on in their life.` : ''}
${previousWeeksContext}

CRITICAL RULES:
- Write 3-4 short, simple sentences
- Use observational language ONLY — NEVER use "I" statements like "I noticed" or "I see"
- Use simple, friendly words that are easy to understand
- Be warm and encouraging, especially if there were hard days
${entriesWithNotes.length > 0 ? `- MOST IMPORTANT: Reference the specific things they shared in their notes! If they talked about health issues, relationship concerns, or specific events, weave those into the summary naturally
- Don't just say "there were some hard days" — say what made them hard based on what they shared
- If they shared progress or improvement, celebrate the SPECIFIC thing that got better` : '- Without notes to reference, focus on the emotional patterns and trajectory across the week'}
- Notice the emotional arc: did the week trend better or worse? Was there a turning point?
- If mostly positive: celebrate specific moments
- If mixed or challenging: acknowledge what was hard AND highlight genuine bright spots
- End with gentle, specific encouragement for the coming week (not generic "next week is a fresh start")
- Each summary should feel like it was written by someone who actually read and cared about each entry`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: 200,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const summaryText = aiData.choices?.[0]?.message?.content?.trim() || "Great job tracking your moods this week!";

    // Save the summary
    const { data: savedSummary, error: saveError } = await supabase
      .from("mood_weekly_summaries")
      .upsert({
        user_id: userId,
        week_start: weekStart,
        summary: summaryText,
        mood_data: { entries: moodData, counts: categoryCounts },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,week_start",
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(
      JSON.stringify({ summary: savedSummary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating mood summary:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
