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
    const { recipeName, recipeDescription, availableIngredients } = await req.json();

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

    // Generate the recipe steps
    const recipePrompt = `You are a friendly cooking teacher for people with intellectual disabilities.
Create a SIMPLE, step-by-step recipe that is:
- Easy to follow with SHORT, CLEAR steps
- Uses simple words (no cooking jargon)
- Safe and uses basic kitchen tools
- Encouraging and positive

Recipe to create: ${recipeName}
Description: ${recipeDescription || ""}
Available ingredients: ${availableIngredients?.join(", ") || "common pantry items"}

You MUST respond with a JSON object in this exact format:
{
  "title": "Recipe Title",
  "description": "A friendly 1-2 sentence description",
  "ingredients": ["ingredient 1 with amount", "ingredient 2 with amount", ...],
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
      if (recipeResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Failed to generate recipe");
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
    
    const imagePrompt = `A beautiful, appetizing photo of ${recipeName}. 
The dish should look homemade, warm, and inviting. 
Food photography style with soft natural lighting.
The food is plated nicely on a simple plate or bowl.
Cozy kitchen background, slightly blurred.
Make it look delicious and achievable for a home cook.`;

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
