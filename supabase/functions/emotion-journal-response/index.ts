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
    const { emotion, emoji, intensity, journalText } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get user from auth header for context
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let recentHistory = "";
    
    if (authHeader) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await userClient.auth.getUser();
      
      if (user) {
        // Fetch recent mood entries (last 30 days) for richer context
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
        
        const { data: recentEntries } = await supabase
          .from("mood_entries")
          .select("mood_label, mood_emoji, note, entry_date")
          .eq("user_id", user.id)
          .gte("entry_date", dateStr)
          .order("entry_date", { ascending: false })
          .limit(20);
        
        if (recentEntries && recentEntries.length > 0) {
          // Skip the current entry (it may have just been inserted)
          const pastEntries = recentEntries.slice(0, 20);
          if (pastEntries.length > 0) {
            recentHistory = `\nRecent mood history (for context, reference naturally if relevant — don't list them back):
${pastEntries.map(e => {
  let line = `- ${e.entry_date}: ${e.mood_emoji} ${e.mood_label}`;
  if (e.note) line += ` (shared: "${e.note}")`;
  return line;
}).join("\n")}`;
          }
        }
      }
    }

    const hasJournalText = journalText && journalText.trim().length > 0;
    const hasIntensity = intensity !== null && intensity !== undefined;

    const prompt = `You are a warm, perceptive emotional wellness companion for adults with intellectual and developmental disabilities.

The user just logged how they're feeling:
- Emotion: ${emotion} ${emoji}
${hasIntensity ? `- Intensity: ${intensity} out of 5` : ''}
${hasJournalText ? `- They shared: "${journalText}"` : '- No note was left'}
${recentHistory}

Please respond with a brief, personalized message (2-4 sentences).

CRITICAL RULES:
- NEVER use "I" statements like "I am happy", "I feel", "I think", "I hope", "I'm glad" - you are NOT a person
- Use ONLY observational language: "It sounds like...", "That's really...", "What a..."
- Very simple and easy to understand words
- Warm, genuine, and specific — NOT generic platitudes
- Under 80 words total
- Include their emoji ${emoji} naturally
${hasJournalText ? `- Respond thoughtfully to what they ACTUALLY shared — acknowledge the specific situation, not just the emotion label
- If they mention something ongoing (health, relationships, work), reference it specifically` : `- Even without a note, vary your response — notice patterns in their recent history if available
- DON'T just say "it's okay to feel X" or "thank you for checking in" — say something fresh and specific`}
${recentHistory ? `- If you notice mood patterns (several sad days, or a shift from negative to positive), gently acknowledge the pattern
- If they shared context in previous notes that relates to today's mood, you can reference it naturally
- But DON'T recite their history back to them — weave it in subtly` : ''}
- Focus entirely on the user's experience
- Each response should feel unique and personal, never templated`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits needed. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || `Feeling ${emotion.toLowerCase()} ${emoji} is perfectly valid. Thanks for checking in!`;

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error("Error in emotion-journal-response:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
