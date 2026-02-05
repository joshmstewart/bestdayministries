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

    const { ingredients, drinkName, vibe } = await req.json();

    if (!ingredients || ingredients.length === 0) {
      throw new Error("No ingredients provided");
    }

    // Build the prompt - now incorporating the drink name and optional vibe
    const ingredientList = ingredients.map((ing: { name: string; color: string }) => ing.name).join(", ");
    const colorHints = ingredients
      .filter((ing: { color: string }) => ing.color)
      .map((ing: { name: string; color: string }) => `${ing.name} (${ing.color})`)
      .join(", ");

    // Use vibe atmosphere if provided, otherwise extract from drink name
    let atmosphereHint = "warm, cozy coffee shop";
    
    if (vibe?.atmosphereHint) {
      // Use the provided vibe atmosphere
      atmosphereHint = vibe.atmosphereHint;
      console.log("Using vibe atmosphere:", vibe.name);
    } else {
      // Extract atmosphere hints from the drink name (fallback)
      const nameWords = (drinkName || "").toLowerCase();
      
      if (nameWords.includes("midnight") || nameWords.includes("night") || nameWords.includes("dark")) {
        atmosphereHint = "moody midnight setting with deep blues and purples, starry night atmosphere, soft moonlight";
      } else if (nameWords.includes("sunset") || nameWords.includes("dusk") || nameWords.includes("twilight")) {
        atmosphereHint = "golden hour sunset atmosphere with warm oranges and pinks, romantic evening vibes";
      } else if (nameWords.includes("sunrise") || nameWords.includes("dawn") || nameWords.includes("morning")) {
        atmosphereHint = "fresh morning sunrise with soft golden light, peaceful dawn atmosphere";
      } else if (nameWords.includes("autumn") || nameWords.includes("fall")) {
        atmosphereHint = "cozy autumn setting with fallen leaves, warm amber tones, rustic wooden textures";
      } else if (nameWords.includes("winter") || nameWords.includes("frost") || nameWords.includes("snow")) {
        atmosphereHint = "magical winter wonderland with snowflakes, frost, cold blue tones, cozy warmth";
      } else if (nameWords.includes("spring") || nameWords.includes("blossom") || nameWords.includes("garden")) {
        atmosphereHint = "fresh spring garden setting with cherry blossoms, soft pink petals, natural greenery";
      } else if (nameWords.includes("summer") || nameWords.includes("tropical") || nameWords.includes("beach")) {
        atmosphereHint = "bright summer tropical vibes, palm leaves, sunny atmosphere, fresh and vibrant";
      } else if (nameWords.includes("cloud") || nameWords.includes("dream") || nameWords.includes("velvet")) {
        atmosphereHint = "dreamy ethereal atmosphere with soft clouds, pastel colors, magical floating feeling";
      } else if (nameWords.includes("fire") || nameWords.includes("spice") || nameWords.includes("blaze")) {
        atmosphereHint = "warm fiery atmosphere with crackling fireplace, rich amber glow, cozy cabin vibes";
      } else if (nameWords.includes("forest") || nameWords.includes("woodland") || nameWords.includes("moss")) {
        atmosphereHint = "enchanted forest setting with moss, ferns, dappled sunlight through trees";
      } else if (nameWords.includes("ocean") || nameWords.includes("sea") || nameWords.includes("wave")) {
        atmosphereHint = "coastal ocean vibes with soft blue waves, sandy beach textures, sea breeze feeling";
      } else if (nameWords.includes("mystic") || nameWords.includes("magic") || nameWords.includes("enchant")) {
        atmosphereHint = "mystical magical atmosphere with sparkles, soft glow, ethereal purple and gold tones";
      }
    }

    const prompt = `A beautiful, photorealistic image of a specialty coffee drink called "${drinkName || 'Custom Creation'}" in a stylish cup. 
The drink contains: ${ingredientList}. 
The colors should reflect the ingredients: ${colorHints || ingredientList}. 
The drink should look appetizing and professionally crafted.

IMPORTANT ATMOSPHERE: The setting and background should reflect ${atmosphereHint}. 
The entire image mood, lighting, and surrounding elements should match this atmosphere.
Make it feel immersive and themed to the drink's name.

Professional food photography style, high resolution, detailed textures, dramatic lighting that matches the atmosphere.`;

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

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error generating drink image:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
