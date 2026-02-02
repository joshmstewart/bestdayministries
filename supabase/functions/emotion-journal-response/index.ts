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
    const { emotion, emoji, intensity, journalText } = await req.json();
    
    const hasJournalText = journalText && journalText.trim().length > 0;
    
    // If user provided journal text, use AI for personalized response
    if (hasJournalText) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      const hasIntensity = intensity !== null && intensity !== undefined;
      
      const prompt = `You are a warm, supportive emotional wellness companion for adults with intellectual and developmental disabilities. 

The user just logged how they're feeling:
- Emotion: ${emotion} ${emoji}
${hasIntensity ? `- Intensity: ${intensity} out of 5` : '- Intensity: not specified'}
- They shared: "${journalText}"

Please respond with:
1. A brief, validating acknowledgment of their feeling (1-2 sentences, very simple words)
2. A short, gentle suggestion or encouraging thought (1-2 sentences)

Keep your response:
- Very simple and easy to understand
- Warm and supportive
- Under 60 words total
- Use their emoji in your response
- Don't use complex words
- IMPORTANT: Do NOT use first-person statements like "I am happy for you" or "I feel..." - you are an AI, not a person. Instead use observational language like "It's wonderful that..." or "That sounds..."
- Focus on the user's experience, not your own reactions`;

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
      const aiResponse = data.choices?.[0]?.message?.content || "I see you're feeling " + emotion + " " + emoji + ". Thank you for sharing!";

      return new Response(JSON.stringify({ response: aiResponse }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // For quick-logs without journal text, use pre-generated responses
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    // Get a random response for this emotion
    const { data: responses, error } = await supabase
      .from("mood_responses")
      .select("response")
      .eq("emotion", emotion.toLowerCase())
      .eq("is_active", true);
    
    if (error) {
      console.error("Database error:", error);
      throw new Error("Failed to fetch response");
    }
    
    if (!responses || responses.length === 0) {
      // Fallback if no pre-generated responses exist
      return new Response(JSON.stringify({ 
        response: `I see you're feeling ${emotion} ${emoji}. Thank you for checking in! Remember, all feelings are okay to have.` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Pick a random response
    const randomIndex = Math.floor(Math.random() * responses.length);
    const selectedResponse = responses[randomIndex].response;
    
    return new Response(JSON.stringify({ response: selectedResponse }), {
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
