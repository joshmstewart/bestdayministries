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

    // Fetch mood entries for the week
    const { data: entries, error: entriesError } = await supabase
      .from("mood_entries")
      .select("entry_date, mood_emoji, mood_label")
      .eq("user_id", userId)
      .gte("entry_date", weekStart)
      .lte("entry_date", weekEnd)
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
    }));

    const categoryCounts = {
      positive: moodData.filter(m => m.category === "positive").length,
      neutral: moodData.filter(m => m.category === "neutral").length,
      negative: moodData.filter(m => m.category === "negative").length,
    };

    const prompt = `You are a caring, supportive wellness companion for adults with intellectual and developmental disabilities (IDD). 

Analyze this person's mood data from the past week and provide a brief, encouraging summary.

Mood entries this week:
${moodData.map(m => `- ${m.date}: ${m.emoji} ${m.mood}`).join("\n")}

Summary: ${categoryCounts.positive} positive, ${categoryCounts.neutral} neutral, ${categoryCounts.negative} negative moods.

CRITICAL RULES:
- Write 2-3 short, simple sentences
- Use observational language ONLY - NEVER use "I" statements like "I noticed" or "I see"
- Start with something like "This week showed..." or "What a week!" or the person's name pattern
- Use simple, friendly words that are easy to understand
- Be warm and encouraging, especially if there were hard days
- If mostly positive: celebrate it!
- If mixed or challenging: acknowledge the hard days AND highlight any bright spots
- End with gentle encouragement for the coming week

Example good responses:
- "This week had some ups and downs! There were a few hard days, but Thursday brought a really happy moment. Every feeling matters, and next week is a fresh start!"
- "What a positive week! Lots of happy and calm feelings showed up. Keep doing whatever brought those good vibes!"`;

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
