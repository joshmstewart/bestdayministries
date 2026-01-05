import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.9/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIZE = 512;

// Helper: deterministic hash for picking palette index
const stableHash = (s: string) =>
  Math.abs(s.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0));

// Helper: parse hex to RGB
const parseHex = (hex: string) => {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
};

// Helper: pick a background hex based on pack theme
const pickBackgroundHex = (pack: string | undefined) => {
  const packLower = (pack || "").toLowerCase();

  const palettes: Record<string, string[]> = {
    space: ["#8B5CF6", "#EC4899", "#3B82F6", "#22D3EE"],
    ocean: ["#0EA5E9", "#06B6D4", "#3B82F6"],
    nature: ["#22C55E", "#84CC16", "#10B981"],
    farm: ["#F59E0B", "#F97316", "#EAB308"],
    food: ["#FDE047", "#FB7185", "#A78BFA"],
    animals: ["#60A5FA", "#F472B6", "#34D399"],
    sports: ["#22C55E", "#F97316", "#3B82F6"],
    music: ["#A855F7", "#EC4899", "#38BDF8"],
    vehicles: ["#94A3B8", "#60A5FA", "#F97316"],
    coffee: ["#D4A574", "#8B4513", "#A0522D"],
  };

  const matchedTheme = Object.keys(palettes).find((k) => packLower.includes(k));
  const palette = matchedTheme
    ? palettes[matchedTheme]
    : ["#22D3EE", "#F472B6", "#A78BFA", "#FDE047"];

  const idx = pack ? stableHash(pack) % palette.length : 0;
  return palette[idx];
};

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

    const backgroundHex = pickBackgroundHex(packName);
    const { r, g, b } = parseHex(backgroundHex);

    // Build style instructions - use designStyle if provided, otherwise default
    const styleInstructions = designStyle 
      ? `Follow this style guide: ${designStyle}

Additional requirements:`
      : `STYLE:`;

    // Always use realistic / photorealistic style, subject on TRANSPARENT background
    const iconPrompt = `Create a ${SIZE}x${SIZE} PNG with a fully TRANSPARENT background (alpha channel).

SUBJECT: "${imageName}"

${styleInstructions}
- Realistic illustration or photorealistic render
- Natural, accurate colors (e.g. a rocket is white/silver/red, an apple is red/green, coffee beans are brown)
- Clean, high-detail, slightly stylized realism - like a premium stock icon or app icon
- Subject should fill about 70-80% of the canvas
- NO cartoon style, NO flat colors, NO abstract shapes

BACKGROUND:
- 100% TRANSPARENT (the server will composite the solid color ${backgroundHex} behind the subject)
- Do NOT draw any background shape, frame, shadow, vignette, or container

TECHNICAL:
- Full bleed: use entire canvas with NO margins, NO borders, NO rounded corners
- Output: PNG with alpha transparency
- Sharp rectangular edges

If you cannot produce transparency, at minimum leave the background a single solid color with no gradients.`;

    console.log("Generating REALISTIC icon for:", imageName);
    console.log("Pack:", packName);
    console.log("Design style:", designStyle || "(default realistic)");
    console.log("Background hex (applied server-side):", backgroundHex);

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

    // Decode AI image
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const rawBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Post-process: composite subject onto solid background for guaranteed full-bleed square
    const subject = await Image.decode(rawBytes);
    const subjectMax = Math.round(SIZE * 0.85);
    const subjectResized = subject.contain(subjectMax, subjectMax);

    const canvas = new Image(SIZE, SIZE);
    canvas.fill(Image.rgbaToColor(r, g, b, 255));

    const x = Math.floor((SIZE - subjectResized.width) / 2);
    const y = Math.floor((SIZE - subjectResized.height) / 2);
    canvas.composite(subjectResized, x, y);

    const finalPngBytes = await canvas.encode();

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const fileName = `memory-match/${imageId}.png`;

    const { error: uploadError } = await supabase.storage
      .from("game-assets")
      .upload(fileName, finalPngBytes, {
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

    console.log("Successfully generated realistic icon for:", imageName);

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
