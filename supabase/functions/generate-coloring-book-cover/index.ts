import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function uploadWithRetry(
  supabase: any,
  fileName: string,
  imageBytes: Uint8Array,
  maxRetries = 3
): Promise<{ data: any; error: any }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { data, error } = await supabase.storage
      .from("app-assets")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: false,
      });

    if (!error) return { data, error: null };

    const errorStatus = (error as any).status || (error as any).statusCode || 0;
    const isRetryable =
      error.message?.includes("timeout") ||
      error.message?.includes("timed out") ||
      errorStatus >= 500;

    if (isRetryable && attempt < maxRetries) {
      console.log(
        `Upload attempt ${attempt} failed: ${error.message}, retrying in ${attempt * 2}s...`
      );
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      continue;
    }

    return { data: null, error };
  }

  return { data: null, error: new Error("Max retries exceeded") };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, style = "kawaii" } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating coloring book cover with prompt:", prompt, "style:", style);

    // Style-specific instructions - pure ART STYLES (how it's drawn), not subjects
    const styleInstructions: Record<string, string> = {
      kawaii: `
- Kawaii/chibi cute art style with big sparkly eyes and round faces
- Pastel-friendly color palette with soft pinks, blues, and yellows
- Cute cartoon characters with exaggerated adorable expressions
- Rounded, bubbly shapes and decorative elements
- Japanese-inspired cuteness with hearts and stars`,
      whimsical: `
- Magical, dreamy fantasy aesthetic
- Sparkles, glitter effects, and enchanted elements throughout
- Fairy tale-inspired scenes with soft ethereal glow
- Mystical creatures or magical transformations
- Gradient sky backgrounds with aurora-like colors`,
      vintage: `
- Classic golden-era storybook illustration style
- Warm, rich color tones (burgundy, gold, forest green, cream)
- Hand-drawn quality with slight texture
- Ornate decorative borders with flourishes
- Nostalgic 1950s-60s children's book aesthetic`,
      geometric: `
- Bold geometric shapes and clean modern lines
- Bright, saturated contemporary color palette
- Flat design aesthetic with strong contrast
- Abstract patterns mixed with recognizable subjects
- Memphis design influence with playful shapes`,
      watercolor: `
- Soft, flowing watercolor painting aesthetic
- Gentle color bleeds and organic edges
- Delicate, transparent layered colors
- Dreamy, ethereal quality
- Soft focus effect with wet-on-wet textures`,
      retro: `
- Groovy 1970s aesthetic with psychedelic vibes
- Bold rainbow colors and gradient fills
- Funky patterns, peace signs, and flower power elements
- Rounded retro typography style
- Sunny, optimistic energy with warm oranges and yellows`,
      impressionist: `
- Impressionist painting style with visible brushstrokes
- Soft, dreamy color palette with light and movement
- Monet and Renoir inspired romantic aesthetic
- Dappled light effects and atmospheric depth
- Painterly texture with gentle color blending`,
      cartoon: `
- Classic Saturday morning cartoon style
- Bold black outlines with vibrant flat colors
- Expressive animated characters with dynamic poses
- Fun, energetic action-oriented composition
- Bright primary and secondary color schemes`,
      folkart: `
- Traditional folk art and crafts aesthetic
- Hand-painted look with charming imperfections
- Warm, earthy color palette with rich reds, blues, and greens
- Decorative motifs inspired by traditional crafts worldwide
- Naive art style with heartfelt, rustic charm`,
      artdeco: `
- Elegant 1920s Art Deco geometric patterns
- Bold symmetrical designs with fan shapes and sunbursts
- Luxurious color palette: gold, black, emerald, ruby
- Gatsby-era glamour with metallic accents
- Clean lines and sophisticated ornamentation`,
      gothic: `
- Dark fantasy and gothic Victorian aesthetic
- Ornate frames with skulls, ravens, roses, and thorns
- Rich deep colors: black, deep purple, blood red, midnight blue
- Cathedral and stained glass influences
- Dramatic and mysterious atmosphere`,
      steampunk: `
- Victorian-era industrial aesthetic with brass and copper tones
- Intricate gears, clockwork mechanisms, and machinery
- Sepia, bronze, and aged metal color palette
- Detailed mechanical ornamentation and textures
- Fantasy-industrial fusion style`,
      popart: `
- Bold Pop Art style inspired by Warhol and Lichtenstein
- Vibrant, saturated primary colors with high contrast
- Ben-Day dots and comic book halftone effects
- Bold black outlines with flat color fills
- Commercial art aesthetic with graphic punch`,
      abstract: `
- Bold abstract expressionist style
- Flowing organic shapes with dynamic movement
- Rich saturated colors in artistic combinations
- Gestural brushstroke textures and energy
- Modern art museum quality aesthetic`,
      tattoo: `
- Traditional American tattoo art style
- Bold black outlines with limited color palette
- Classic imagery: roses, anchors, daggers, hearts, eagles
- Banner ribbons and decorative scrollwork
- Sailor Jerry inspired vintage aesthetic`,
      artnouveau: `
- Flowing Art Nouveau organic curves and lines
- Nature-inspired with flowers, vines, and feminine figures
- Alphonse Mucha inspired elegant compositions
- Muted earth tones with gold and jewel accents
- Decorative borders with sinuous organic patterns`,
    };

    const selectedStyle = styleInstructions[style] || styleInstructions.kawaii;

    const coverPrompt = `Create a FULL-COLOR children's coloring book cover that looks like a REAL PUBLISHED COLORING BOOK for the theme: "${prompt}".

ARTISTIC STYLE - Apply this specific visual style:
${selectedStyle}

REQUIRED COVER ELEMENTS:
- DECORATIVE THEMED BORDER around the edges (flowers, vines, stars, themed elements that match the topic)
- BIG STYLIZED TITLE TEXT at the top: "${prompt}" in fun, stylized letters matching the art style
- SUBTITLE below the title like "A Magical Coloring Adventure!" or "Coloring Book!" in a banner or ribbon
- CENTRAL ILLUSTRATION featuring characters/scenes related to the theme IN THE SPECIFIED STYLE
- SCATTERED THEMED ELEMENTS throughout (small icons, doodles, decorations related to the theme)

CRITICAL LAYOUT:
- Square 1:1 aspect ratio
- Full-bleed artwork extending to ALL edges - no white margins
- The decorative border elements should touch all four edges
- Child-friendly aesthetic appropriate for coloring books

THIS IS A FULL-COLOR COVER - NOT a coloring page. Make it look like a finished, polished, commercial coloring book cover that would attract children.

OUTPUT: High quality, print-ready, no watermarks.
`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [{ role: "user", content: coverPrompt }],
          modalities: ["image", "text"],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please wait a moment and try again.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error:
              "AI credits are depleted. Please add credits to your workspace and try again.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`Failed to generate image: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("No image in response:", JSON.stringify(data));
      throw new Error("No image in response");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const fileName = `coloring-books/covers/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.png`;

    const { error: uploadError } = await uploadWithRetry(
      supabase,
      fileName,
      imageBytes
    );

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from("app-assets")
      .getPublicUrl(fileName);

    return new Response(JSON.stringify({ imageUrl: publicUrlData.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error generating coloring book cover:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
