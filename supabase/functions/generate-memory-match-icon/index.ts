import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIZE = 512;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageId, imageName, packName, designStyle } = await req.json();

    if (!imageId || !imageName) {
      throw new Error("Missing imageId or imageName");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build style instructions - use designStyle if provided, otherwise default
    const styleInstructions = designStyle 
      ? `Follow this style guide: ${designStyle}

Additional requirements:`
      : `STYLE:`;

    // Request image with white background directly from the AI
    const iconPrompt = `Create a ${SIZE}x${SIZE} PNG image.

SUBJECT: "${imageName}"

${styleInstructions}
- Realistic illustration or photorealistic render
- Natural, accurate colors (e.g. a rocket is white/silver/red, an apple is red/green, coffee beans are brown)
- Clean, high-detail, slightly stylized realism - like a premium stock icon or app icon
- Subject should fill about 70-80% of the canvas, centered
- NO cartoon style, NO flat colors, NO abstract shapes

BACKGROUND:
- SOLID PURE WHITE background (#FFFFFF)
- NO gradients, NO shadows, NO vignettes
- The background MUST be completely white

TECHNICAL:
- Full bleed: use entire canvas with NO margins, NO borders, NO rounded corners
- Output: PNG format
- Sharp rectangular edges
- Subject centered on pure white background`;

    console.log("Generating icon for:", imageName);
    console.log("Pack:", packName);
    console.log("Design style:", designStyle || "(default realistic)");

    // Call Lovable AI with retry logic
    let imageData: string | null = null;
    let lastError = "No image generated";

    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Attempt ${attempt}/3 for generating icon: ${imageName}`);

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image-preview",
            messages: [{ role: "user", content: iconPrompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.error("Rate limited, waiting...");
            await new Promise((r) => setTimeout(r, 2000 * attempt));
            lastError = "Rate limited - please wait and try again";
            continue;
          }
          if (response.status === 402) {
            throw new Error("AI credits exhausted - please add credits");
          }
          const errorText = await response.text();
          console.error("AI API error:", errorText);
          lastError = `AI API error: ${response.status}`;
          continue;
        }

        const data = await response.json();
        imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (imageData) {
          console.log(`Got image data on attempt ${attempt}`);
          break;
        } else {
          console.log(`No image in response on attempt ${attempt}`);
          lastError = "No image generated - model returned empty response";
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      } catch (fetchError) {
        console.error(`Fetch error on attempt ${attempt}:`, fetchError);
        lastError = fetchError instanceof Error ? fetchError.message : "Fetch failed";
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }

    if (!imageData) {
      throw new Error(lastError);
    }

    // Decode AI image - the AI should return a PNG with white background
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const rawBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Upload directly to Supabase Storage (no post-processing needed)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const fileName = `memory-match/${imageId}.png`;

    const { error: uploadError } = await supabase.storage
      .from("game-assets")
      .upload(fileName, rawBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage.from("game-assets").getPublicUrl(fileName);
    const imageUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from("memory_match_images")
      .update({ image_url: imageUrl })
      .eq("id", imageId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error(`Failed to update image: ${updateError.message}`);
    }

    console.log("Successfully generated icon for:", imageName);

    return new Response(
      JSON.stringify({ success: true, imageUrl, imageName }),
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
