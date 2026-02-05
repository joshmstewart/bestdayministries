import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { drinkName, ingredients, vibe } = await req.json();

    if (!drinkName || !ingredients || ingredients.length === 0) {
      return new Response(
        JSON.stringify({ error: "Drink name and ingredients are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ingredientList = ingredients.map((i: { name: string }) => i.name).join(", ");
    const vibeContext = vibe ? ` with a ${vibe.name} vibe` : "";

    const prompt = `Write a short, fun, and appealing 1-2 sentence description for a custom drink called "${drinkName}". 
The drink contains: ${ingredientList}${vibeContext}.
Make it sound delicious and inviting. Be creative but concise. Do not use quotes around the description.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a creative barista who writes enticing drink descriptions. Keep responses short and fun.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error("Failed to generate description");
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content?.trim() || null;

    return new Response(
      JSON.stringify({ description }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
