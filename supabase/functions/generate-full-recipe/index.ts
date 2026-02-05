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
    const { recipeName, recipeDescription, availableIngredients, availableTools } = await req.json();

    if (!recipeName) {
      return new Response(
        JSON.stringify({ error: "No recipe name provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const toolsConstraint = availableTools?.length > 0
      ? `Available kitchen tools: ${availableTools.join(", ")}. Only use these tools if possible, but you may include essential tools they need.`
      : "";

    // Generate the recipe steps
    const recipePrompt = `You are a friendly cooking teacher for adults with intellectual disabilities.
Create a SIMPLE, step-by-step recipe that is:
- Easy to follow with SHORT, CLEAR steps
- Uses simple words (no cooking jargon)
- Safe and uses basic kitchen tools
- Encouraging and positive

IMPORTANT: These are ADULTS, not children. Do NOT say "ask a grown-up" or treat them like children.
Instead, include a "safetyNotes" array listing any tasks that might need extra care or help from a support person.

Recipe to create: ${recipeName}
Description: ${recipeDescription || ""}
Available ingredients: ${availableIngredients?.join(", ") || "common pantry items"}
${toolsConstraint}

You MUST respond with a JSON object in this exact format:
{
  "title": "Recipe Title",
  "description": "A friendly 1-2 sentence description",
  "safetyNotes": ["Using sharp knife", "Hot stove", "Hot oven"],
  "ingredients": ["ingredient 1 with amount", "ingredient 2 with amount", ...],
  "tools": ["Tool 1", "Tool 2", ...],
  "steps": [
    "Step 1 in simple words",
    "Step 2 in simple words",
    ...
  ],
  "tips": [
    "A helpful tip",
    "Another helpful tip"
  ]
}

The "tools" array should list ALL kitchen tools needed to make this recipe (e.g., "Toaster", "Knife", "Cutting Board", "Mixing Bowl", "Spoon", "Pan", "Pot", "Oven", "Microwave", etc.).

The safetyNotes should list things that might need extra care or help, like:
- "Using sharp knife for cutting"
- "Hot stove top"
- "Hot oven"
- "Boiling water"
Only include relevant safety notes for this specific recipe.

Keep steps to 5-8 maximum. Each step should be ONE simple action.
Only return the JSON, no other text.`;

    const recipeResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: recipePrompt },
          { role: "user", content: `Please create a simple recipe for: ${recipeName}` },
        ],
      }),
    });

    if (!recipeResponse.ok) {
      const errorText = await recipeResponse.text();
      console.error("Recipe generation API error:", recipeResponse.status, errorText);
      
      if (recipeResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (recipeResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Failed to generate recipe: ${recipeResponse.status} - ${errorText.substring(0, 200)}`);
    }

    const recipeData = await recipeResponse.json();
    const recipeContent = recipeData.choices?.[0]?.message?.content;

    let recipe;
    try {
      const jsonMatch = recipeContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recipe = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch (parseError) {
      console.error("Failed to parse recipe:", recipeContent);
      // Fallback recipe
      recipe = {
        title: recipeName,
        description: recipeDescription || "A delicious homemade dish!",
        ingredients: availableIngredients || ["Your ingredients"],
        steps: [
          "Gather all your ingredients",
          "Prepare your ingredients as needed",
          "Cook or assemble your dish",
          "Enjoy your creation!"
        ],
        tips: ["Take your time and have fun!"]
      };
    }

    // Generate the image
    console.log("Generating image for recipe:", recipeName);
    
    // Build a strict ingredient list for the image prompt
    const ingredientList = recipe.ingredients?.length > 0 
      ? recipe.ingredients.map((i: string) => i.replace(/^\d+[\s\/\d]*\s*(cups?|tbsp|tsp|oz|lb|g|ml|pieces?|slices?)?\s*/i, '').trim()).join(", ")
      : availableIngredients?.join(", ") || recipeName;
    
    const imagePrompt = `STRICT REQUIREMENT: Generate a photo of ${recipeName} that contains ONLY these exact ingredients: ${ingredientList}.

DO NOT add any ingredients that are not listed above. NO eggs, NO garnishes, NO toppings, NO sauces unless specifically listed.

The dish must show ONLY the listed ingredients - nothing extra.
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
          recipe.imageUrl = imageUrl;
          console.log("Image generated successfully");
        }
      } else {
        console.log("Image generation failed, continuing without image");
      }
    } catch (imageError) {
      console.error("Error generating image:", imageError);
      // Continue without image
    }

    console.log("Recipe generated:", recipe.title);

    return new Response(
      JSON.stringify({ recipe }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating full recipe:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
