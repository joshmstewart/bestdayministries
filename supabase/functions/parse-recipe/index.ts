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
    const { recipeText } = await req.json();

    if (!recipeText || recipeText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipe text provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a helpful cooking assistant that specializes in adapting recipes for adults with intellectual disabilities.

Your job is to:
1. Parse the provided recipe text into a structured format
2. Simplify complex steps into shorter, clearer instructions
3. Identify any safety concerns and list them
4. Suggest improvements for accessibility, safety, or simplicity

IMPORTANT: These are ADULTS, not children. Do NOT say "ask a grown-up" or treat them like children.
Instead, include safety notes for tasks that might need extra care or help from a support person.

You MUST respond with a JSON object in this exact format:
{
  "title": "Recipe Title",
  "description": "A friendly 1-2 sentence description of the dish",
  "ingredients": ["ingredient 1 with amount", "ingredient 2 with amount", ...],
  "tools": ["Tool 1", "Tool 2", ...],
  "steps": [
    "Step 1 in simple, clear words",
    "Step 2 in simple, clear words",
    ...
  ],
  "tips": [
    "A helpful tip",
    "Another helpful tip"
  ],
  "safetyNotes": ["Using sharp knife", "Hot stove", "Hot oven"],
  "suggestions": [
    {
      "type": "safety" | "simplification" | "substitution" | "tip",
      "original": "What was in the original recipe (if applicable)",
      "suggested": "Your suggested improvement",
      "reason": "Why this change helps"
    }
  ]
}

Guidelines for parsing:
- Keep steps to 8-10 maximum. Each step should be ONE simple action.
- Use simple words, avoid cooking jargon
- If a step is complex, break it into multiple simpler steps
- List ALL kitchen tools needed (knife, cutting board, pan, pot, oven, microwave, mixing bowl, spoon, etc.)
- For safety notes, include things like: using sharp knife, hot stove, boiling water, hot oven
- For suggestions, focus on:
  * Safety: hazards that could be avoided or need support
  * Simplification: steps that could be made easier
  * Substitution: easier alternatives to complex techniques
  * Tips: helpful additions for success

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
          { role: "user", content: `Please parse and adapt this recipe:\n\n${recipeText}` },
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
      throw new Error("Failed to parse recipe");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    let parsedRecipe;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedRecipe = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse recipe structure. Please try again.");
    }

    // Generate an image for the recipe
    console.log("Generating image for parsed recipe:", parsedRecipe.title);
    
    const ingredientList = parsedRecipe.ingredients?.length > 0 
      ? parsedRecipe.ingredients.map((i: string) => i.replace(/^\d+[\s\/\d]*\s*(cups?|tbsp|tsp|oz|lb|g|ml|pieces?|slices?)?\s*/i, '').trim()).join(", ")
      : parsedRecipe.title;
    
    const imagePrompt = `Generate a photo of ${parsedRecipe.title} that looks homemade and delicious.
The dish contains: ${ingredientList}.
Food photography style with soft natural lighting.
The food is plated nicely on a simple plate or bowl.
Cozy kitchen background, slightly blurred.
Homemade, warm, and inviting appearance.`;

    try {
      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            { role: "user", content: imagePrompt }
          ],
          modalities: ["image", "text"]
        }),
      });

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        if (imageUrl) {
          parsedRecipe.imageUrl = imageUrl;
          console.log("Image generated successfully");
        }
      } else {
        console.log("Image generation failed, continuing without image");
      }
    } catch (imageError) {
      console.error("Error generating image:", imageError);
    }

    console.log("Recipe parsed successfully:", parsedRecipe.title);

    return new Response(
      JSON.stringify({ recipe: parsedRecipe }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error parsing recipe:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
