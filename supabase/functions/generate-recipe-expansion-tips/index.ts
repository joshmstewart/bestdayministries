import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingredients, tools } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const currentIngredients = ingredients && ingredients.length > 0 ? ingredients.join(", ") : "none selected";
    const currentTools = tools && tools.length > 0 ? tools.join(", ") : "none selected";

    const systemPrompt = `You are a helpful cooking advisor for people with intellectual disabilities.
Your job is to suggest items that would GREATLY expand their cooking options.

RULES FOR INGREDIENT SUGGESTIONS:
- Suggest 2-3 common, affordable ingredients that would unlock MANY new simple recipes
- Focus on versatile staples (like eggs, butter, cheese, bread, rice, pasta)
- Don't suggest items they already have
- Think about what pairs well with what they have
- For each suggestion, list 2-3 SPECIFIC simple recipes they could make if they added just that one item

RULES FOR TOOL SUGGESTIONS:
- Suggest 1-2 INEXPENSIVE kitchen tools (under $20 typically)
- DO NOT suggest expensive appliances (no stand mixers, food processors, instant pots, air fryers)
- Good examples: wooden spoon, whisk, spatula, baking sheet, pot, pan, measuring cups, mixing bowl, cutting board
- Focus on tools that enable many simple recipes
- Don't suggest items they already have
- For each suggestion, list 2-3 SPECIFIC simple recipes they could make if they added just that one tool

You MUST respond with a JSON object in this exact format:
{
  "ingredientTips": [
    {
      "name": "Ingredient Name",
      "reason": "Short reason why it helps (1 sentence)",
      "emoji": "🥚",
      "unlockedRecipes": ["Recipe 1", "Recipe 2", "Recipe 3"]
    }
  ],
  "toolTips": [
    {
      "name": "Tool Name", 
      "reason": "Short reason why it helps (1 sentence)",
      "emoji": "🍳",
      "estimatedCost": "$5-10",
      "unlockedRecipes": ["Recipe 1", "Recipe 2", "Recipe 3"]
    }
  ]
}

Keep reasons VERY simple and friendly. The unlockedRecipes should be simple dishes they could make with their CURRENT inventory PLUS that one new item. Only return the JSON, no other text.`;

    const userMessage = `I currently have these ingredients: ${currentIngredients}. 
I have these kitchen tools: ${currentTools}.
What should I consider adding to make lots more yummy things?`;

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
          { role: "user", content: userMessage },
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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to get expansion tips");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    let tips;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        tips = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      tips = {
        ingredientTips: [],
        toolTips: []
      };
    }

    // Hard filter: remove any suggestions that match user's existing items (case-insensitive)
    const ingredientsLower = (ingredients || []).map((i: string) => i.toLowerCase().trim());
    const toolsLower = (tools || []).map((t: string) => t.toLowerCase().trim());

    if (tips.ingredientTips && Array.isArray(tips.ingredientTips)) {
      tips.ingredientTips = tips.ingredientTips.filter((tip: { name: string }) => 
        !ingredientsLower.includes(tip.name?.toLowerCase().trim())
      );
    }

    if (tips.toolTips && Array.isArray(tips.toolTips)) {
      tips.toolTips = tips.toolTips.filter((tip: { name: string }) => 
        !toolsLower.includes(tip.name?.toLowerCase().trim())
      );
    }

    console.log("Generated expansion tips:", tips);

    return new Response(
      JSON.stringify(tips),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating expansion tips:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
