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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify user is authenticated
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { ingredients } = await req.json();

    if (!ingredients || ingredients.length === 0) {
      throw new Error("No ingredients provided");
    }

    // Build the prompt
    const ingredientList = ingredients.map((ing: { name: string; color: string }) => ing.name).join(", ");
    const colorHints = ingredients
      .filter((ing: { color: string }) => ing.color)
      .map((ing: { name: string; color: string }) => `${ing.name} (${ing.color})`)
      .join(", ");

    const prompt = `A beautiful, photorealistic image of a specialty coffee drink in a stylish cup. The drink contains: ${ingredientList}. 
The colors should reflect the ingredients: ${colorHints || ingredientList}. 
The drink should look appetizing and professionally crafted, like a high-end coffee shop creation.
The cup should be modern and aesthetic. The background should complement the drink with warm, cozy coffee shop vibes.
The lighting should be soft and inviting, making the drink look delicious.
Professional food photography style, high resolution, detailed textures.`;

    console.log("Generating drink image with prompt:", prompt);

    // Call Lovable AI image generation
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
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
      throw new Error("Failed to generate image");
    }

    const data = await response.json();
    console.log("AI response received");

    // Extract the image
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) {
      throw new Error("No image generated");
    }

    // Generate a suggested name
    const suggestedName = generateDrinkName(ingredients);

    return new Response(
      JSON.stringify({
        imageUrl,
        suggestedName,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error generating drink image:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Generate a fun drink name based on ingredients
function generateDrinkName(ingredients: { name: string }[]): string {
  const adjectives = ["Dreamy", "Sunset", "Midnight", "Golden", "Velvet", "Cozy", "Mystic", "Cloud"];
  const nouns = ["Delight", "Bliss", "Dream", "Magic", "Wonder", "Twist", "Fusion"];
  
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  
  // Include one ingredient in the name
  const mainIngredient = ingredients[0]?.name || "Coffee";
  
  return `${randomAdj} ${mainIngredient} ${randomNoun}`;
}
