import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingredients } = await req.json();

    if (!ingredients || ingredients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No ingredients provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a friendly cooking assistant for people with intellectual disabilities. 
Your job is to suggest SIMPLE recipes that are:
- Easy to follow with minimal steps
- Use common kitchen tools (no complicated equipment)
- Safe (avoid complex techniques like deep frying)
- Fun and rewarding to make

Given a list of ingredients, suggest 3-4 simple recipes they could make.
Focus on familiar, comforting foods that are hard to mess up.

You MUST respond with a JSON object in this exact format:
{
  "suggestions": [
    {
      "name": "Recipe Name",
      "description": "A short, friendly description (1-2 sentences)",
      "difficulty": "easy" or "medium",
      "timeEstimate": "time like '15 mins' or '30 mins'",
      "emoji": "a single emoji that represents this dish"
    }
  ]
}

Only return the JSON, no other text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `I have these ingredients: ${ingredients.join(", ")}. What simple things can I make?` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to get recipe suggestions");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response
    let suggestions;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Fallback suggestions
      suggestions = {
        suggestions: [
          {
            name: "Simple Sandwich",
            description: "Layer your ingredients between bread for a quick meal!",
            difficulty: "easy",
            timeEstimate: "5 mins",
            emoji: "🥪"
          },
          {
            name: "Mixed Salad",
            description: "Chop up your veggies and mix them together with dressing",
            difficulty: "easy",
            timeEstimate: "10 mins",
            emoji: "🥗"
          }
        ]
      };
    }

    console.log("Generated suggestions:", suggestions);

    return new Response(
      JSON.stringify(suggestions),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating recipe suggestions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
