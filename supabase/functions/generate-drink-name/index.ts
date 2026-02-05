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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { ingredients, vibe } = await req.json();

    if (!ingredients || ingredients.length === 0) {
      throw new Error("No ingredients provided");
    }

    const ingredientNames = ingredients.map((ing: { name: string }) => ing.name).join(", ");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating creative drink name for ingredients:", ingredientNames, "with vibe:", vibe);

    // Build vibe context for the prompt
    const vibeContext = vibe 
      ? `\n\nIMPORTANT: The drink should have a "${vibe.name}" theme (${vibe.description}). Incorporate this vibe into the name!`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a creative barista naming specialty drinks. Generate ONE unique, evocative drink name that:
- Is 2-4 words long
- Captures a mood, time of day, season, or atmosphere (e.g., "Midnight", "Sunset", "Autumn", "Velvet", "Starlight")
- Incorporates flavor hints from the ingredients
- Sounds elegant and appealing
- Could inspire a visual atmosphere (time of day, weather, setting)

Examples of great names: "Midnight Vanilla Dream", "Autumn Maple Sunrise", "Velvet Mocha Twilight", "Lavender Cloud Dusk"

Only respond with the drink name, nothing else.`,
          },
          {
            role: "user",
            content: `Create a creative drink name for a drink with these ingredients: ${ingredientNames}${vibeContext}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      if (response.status === 402) {
        throw new Error("AI credits exhausted. Please try again later.");
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate name");
    }

    const data = await response.json();
    const generatedName = data.choices?.[0]?.message?.content?.trim() || "Custom Creation";

    console.log("Generated drink name:", generatedName);

    return new Response(
      JSON.stringify({ name: generatedName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error generating drink name:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
