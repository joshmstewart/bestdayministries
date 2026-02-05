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
    const { ingredientId, ingredientName, category } = await req.json();

    if (!ingredientId || !ingredientName) {
      throw new Error("Missing ingredientId or ingredientName");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Generate a prompt for the food ingredient icon - show realistic kitchen/grocery forms
    const iconPrompt = `Create a 256x256 pixel icon of ${ingredientName} (food ingredient). Category: ${category}.

MANDATORY REQUIREMENTS:
1. FRAMING: The ${ingredientName} must fill 70-80% of the image - make it LARGE and prominent
2. CORNERS: RECTANGULAR image with SHARP 90-DEGREE CORNERS ONLY. DO NOT round ANY edges. DO NOT use circular or oval frames. DO NOT add ANY curved borders or vignettes. The corners must be perfectly square like a photograph.
3. BACKGROUND: Solid single flat color extending to ALL four corners with NO gradients, NO fading, NO corner treatments
4. STYLE: Simple flat illustration, no text labels

FORBIDDEN: rounded corners, circular frames, oval shapes, curved edges, border radius, vignette effects, corner fading

CRITICAL PACKAGING AWARENESS: Always show ingredients in their REAL grocery store packaging or common kitchen form. Think about how this specific ingredient is actually sold and stored:

SPECIFIC EXAMPLES:
- Applesauce = plastic pudding cup or jar
- Canned fruit/vegetables = metal can
- Yogurt = plastic cup with foil lid
- Pudding = plastic snack cup
- Cereal = cardboard box
- Milk/juice = carton or jug
- Cheese = wedge, slices, or block
- Butter = stick in wrapper
- Eggs = carton showing eggs
- Bread = sliced loaf
- Pasta = box or clear bag
- Soup/broth = can or carton
- Condiments = squeeze bottle or jar
- Spices = small jar or tin
- Frozen items = bag or box
- Fresh produce = whole or cut
- Crackers/cookies = box or sleeve
- Peanut butter/jelly = jar
- Cream cheese = foil-wrapped block or tub
- Sour cream = plastic tub

GENERAL RULE: If the ingredient name contains words like "canned", "jarred", "frozen", "boxed", etc., show that specific container. Always infer the most common real-world packaging for the ingredient.`;

    console.log("Generating icon for recipe ingredient:", ingredientName);
    console.log("Prompt:", iconPrompt);

    // Call Lovable AI to generate the image
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
            content: iconPrompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limited by AI gateway");
        throw new Error("Rate limited - please wait and try again");
      }
      if (response.status === 402) {
        console.error("AI credits exhausted");
        throw new Error("AI credits exhausted - please add credits");
      }
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      throw new Error("No image generated");
    }

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Convert base64 to blob
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const fileName = `ingredients/${ingredientId}.png`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("recipe-images")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("recipe-images")
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // Update the ingredient with the image URL
    const { error: updateError } = await supabase
      .from("recipe_ingredients")
      .update({ image_url: imageUrl })
      .eq("id", ingredientId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error(`Failed to update ingredient: ${updateError.message}`);
    }

    console.log("Successfully generated and saved icon for:", ingredientName);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        ingredientName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
