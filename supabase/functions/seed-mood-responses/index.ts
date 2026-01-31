import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Define emotions with their emojis
const EMOTIONS = [
  { emotion: "happy", emoji: "😊" },
  { emotion: "sad", emoji: "😢" },
  { emotion: "angry", emoji: "😠" },
  { emotion: "anxious", emoji: "😰" },
  { emotion: "excited", emoji: "🤩" },
  { emotion: "tired", emoji: "😴" },
  { emotion: "calm", emoji: "😌" },
  { emotion: "frustrated", emoji: "😤" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["admin", "owner"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { emotion: targetEmotion, count = 15 } = await req.json().catch(() => ({}));
    
    // If specific emotion provided, only generate for that one
    const emotionsToProcess = targetEmotion 
      ? EMOTIONS.filter(e => e.emotion.toLowerCase() === targetEmotion.toLowerCase())
      : EMOTIONS;

    const results: { emotion: string; generated: number; errors: string[] }[] = [];

    for (const { emotion, emoji } of emotionsToProcess) {
      const errors: string[] = [];
      let generated = 0;

      // Check existing count
      const { count: existingCount } = await supabaseAdmin
        .from("mood_responses")
        .select("*", { count: "exact", head: true })
        .eq("emotion", emotion);

      const needed = Math.max(0, count - (existingCount || 0));
      
      if (needed === 0) {
        results.push({ emotion, generated: 0, errors: [`Already has ${existingCount} responses`] });
        continue;
      }

      const prompt = `Generate ${needed} unique, warm, supportive responses for someone who just logged that they're feeling ${emotion} ${emoji}.

Each response should:
- Be 2-3 short sentences
- Use very simple words (for adults with intellectual disabilities)
- Include the emoji ${emoji} naturally in the response
- Be validating and encouraging
- Be under 50 words

Format: Return ONLY a JSON array of strings, no other text. Example:
["Response one here ${emoji}.", "Response two here ${emoji}."]`;

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!response.ok) {
          errors.push(`API error: ${response.status}`);
          results.push({ emotion, generated, errors });
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";
        
        // Parse JSON from response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          errors.push("Failed to parse response as JSON array");
          results.push({ emotion, generated, errors });
          continue;
        }

        const responses: string[] = JSON.parse(jsonMatch[0]);
        
        // Insert into database
        for (const responseText of responses) {
          const { error: insertError } = await supabaseAdmin
            .from("mood_responses")
            .insert({
              emotion: emotion,
              emoji: emoji,
              response: responseText.trim(),
            });

          if (insertError) {
            errors.push(`Insert error: ${insertError.message}`);
          } else {
            generated++;
          }
        }

        // Small delay between emotions to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
        
      } catch (err) {
        errors.push(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
      }

      results.push({ emotion, generated, errors });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      summary: {
        total: results.reduce((sum, r) => sum + r.generated, 0),
        emotions: results.length
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in seed-mood-responses:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
