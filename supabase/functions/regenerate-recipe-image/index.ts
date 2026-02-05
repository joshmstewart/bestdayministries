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
    const { recipeId, recipeName, ingredients } = await req.json();

    if (!recipeId || !recipeName || !ingredients) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: recipeId, recipeName, ingredients" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build a strict ingredient list for the image prompt
    const ingredientList = Array.isArray(ingredients) 
      ? ingredients.map((i: string) => i.replace(/^\d+[\s\/\d]*\s*(cups?|tbsp|tsp|oz|lb|g|ml|pieces?|slices?)?\s*/i, '').trim()).join(", ")
      : ingredients;

    console.log("Regenerating image for:", recipeName);
    console.log("Ingredients:", ingredientList);

    const imagePrompt = `STRICT REQUIREMENT: Generate a photo of ${recipeName} that contains ONLY these exact ingredients: ${ingredientList}.

DO NOT add any ingredients that are not listed above. NO eggs, NO garnishes, NO toppings, NO sauces, NO vegetables unless specifically listed.

The dish must show ONLY the listed ingredients - nothing extra. This is a simple home-cooked meal.
Food photography style with soft natural lighting.
The food is plated nicely on a simple plate or bowl.
Cozy kitchen background, slightly blurred.
Homemade, warm, and inviting appearance.`;

    console.log("Image prompt:", imagePrompt);

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

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error("Image generation failed:", imageResponse.status, errorText);
      throw new Error(`Image generation failed: ${imageResponse.status}`);
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error("No image URL in response");
    }

    console.log("Image generated successfully, updating database...");

    // Update the database with the new image
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Update the public recipe
    const { error: updateError } = await supabaseClient
      .from("public_recipes")
      .update({ image_url: imageUrl })
      .eq("id", recipeId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw new Error(`Failed to update database: ${updateError.message}`);
    }

    // Also update all saved copies of this recipe
    const { error: savedError } = await supabaseClient
      .from("saved_recipes")
      .update({ image_url: imageUrl })
      .eq("source_recipe_id", recipeId);

    if (savedError) {
      console.error("Error updating saved recipes:", savedError);
      // Don't throw - the main update succeeded
    }

    console.log("Database updated successfully (public + saved copies)");

    return new Response(
      JSON.stringify({ success: true, imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error regenerating recipe image:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
