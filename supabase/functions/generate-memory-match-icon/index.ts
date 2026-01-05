import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.9/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Use the design style passed in - this is the source of truth for the pack's visual style
    const hasCustomStyle = designStyle && designStyle.trim().length > 0;
    
    let iconPrompt: string;
    
    if (hasCustomStyle) {
      // Pack has a custom design style - use it directly as the primary instruction
      iconPrompt = `Generate a 512x512 square image.

SUBJECT: "${imageName}"

PACK STYLE GUIDE (FOLLOW THIS EXACTLY):
${designStyle}

TECHNICAL REQUIREMENTS:
1. Subject fills 70-80% of the canvas
2. FULL BLEED - image extends to all edges, NO margins, NO borders, NO padding
3. Sharp rectangular corners
4. Clean icon-style illustration

Follow the pack style guide above for colors, background, and artistic style.`;
    } else {
      // Default style - clean flat illustrations with theme-based backgrounds
      const themeBackgrounds: Record<string, string> = {
        space: "#9B59B6",      // Vibrant purple for space
        ocean: "#0077B6",      // Deep blue for ocean
        nature: "#2D6A4F",     // Forest green for nature
        farm: "#D4A574",       // Warm tan for farm
        food: "#FFF8DC",       // Cornsilk cream for food
        animals: "#87CEEB",    // Sky blue for animals
        sports: "#228B22",     // Forest green for sports
        music: "#9B59B6",      // Purple for music
        vehicles: "#708090",   // Slate gray for vehicles
        default: "#40E0D0",    // Turquoise as default
      };
      
      const packNameLower = (packName || "").toLowerCase();
      let backgroundColor = themeBackgrounds.default;
      
      for (const [theme, color] of Object.entries(themeBackgrounds)) {
        if (packNameLower.includes(theme)) {
          backgroundColor = color;
          break;
        }
      }
      
      if (backgroundColor === themeBackgrounds.default && packName) {
        const defaultColors = ["#40E0D0", "#F0E68C", "#DDA0DD", "#98FB98", "#FFB6C1", "#87CEEB", "#F5DEB3", "#B0C4DE"];
        const colorIndex = Math.abs(packName.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)) % defaultColors.length;
        backgroundColor = defaultColors[colorIndex];
      }

      iconPrompt = `Generate a 512x512 square image.

SUBJECT: "${imageName}" - draw this object in clean, realistic colors

BACKGROUND: Solid ${backgroundColor} - uniform, flat, fills entire canvas

STYLE:
1. Clean flat illustration, simple shapes, modern app icon style
2. Subject fills 70-80% of the canvas
3. FULL BLEED - extends to all edges, NO margins, NO borders
4. Sharp rectangular corners
5. High contrast between subject and background

DO NOT: Add gradients, textures, borders, margins, or white space at edges.`;
    }

    console.log("Generating icon for memory match image:", imageName);
    console.log("Has custom style:", hasCustomStyle);
    console.log("Prompt:", iconPrompt);

    // Call Lovable AI to generate the image with retry logic
    let imageData: string | null = null;
    let lastError: string = "No image generated";
    
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
            console.error("Rate limited by AI gateway, waiting before retry...");
            await new Promise(r => setTimeout(r, 2000 * attempt));
            lastError = "Rate limited - please wait and try again";
            continue;
          }
          if (response.status === 402) {
            console.error("AI credits exhausted");
            throw new Error("AI credits exhausted - please add credits");
          }
          const errorText = await response.text();
          console.error("AI API error:", errorText);
          lastError = `AI API error: ${response.status}`;
          continue;
        }

        const data = await response.json();
        console.log("API response structure:", JSON.stringify({
          hasChoices: !!data.choices,
          choicesLength: data.choices?.length,
          hasMessage: !!data.choices?.[0]?.message,
          hasImages: !!data.choices?.[0]?.message?.images,
          imagesLength: data.choices?.[0]?.message?.images?.length,
        }));
        
        imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (imageData) {
          console.log(`Successfully got image data on attempt ${attempt}`);
          break;
        } else {
          console.log(`No image in response on attempt ${attempt}, retrying...`);
          lastError = "No image generated - model returned empty response";
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      } catch (fetchError) {
        console.error(`Fetch error on attempt ${attempt}:`, fetchError);
        lastError = fetchError instanceof Error ? fetchError.message : "Fetch failed";
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }

    if (!imageData) {
      throw new Error(lastError);
    }

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Convert base64 to bytes
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const rawBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Post-process to guarantee full-bleed square with consistent solid background
    const subject = await Image.decode(rawBytes);
    const subjectMax = Math.round(SIZE * 0.8);
    const subjectResized = subject.contain(subjectMax, subjectMax);

    const canvas = new Image(SIZE, SIZE);
    canvas.fill(Image.rgbaToColor(r, g, b, 255));

    const x = Math.floor((SIZE - subjectResized.width) / 2);
    const y = Math.floor((SIZE - subjectResized.height) / 2);
    canvas.composite(subjectResized, x, y);

    const finalPngBytes = await canvas.encode();

    const fileName = `memory-match/${imageId}.png`;

    // Upload to storage
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

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("game-assets")
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // Update the image with the URL
    const { error: updateError } = await supabase
      .from("memory_match_images")
      .update({ image_url: imageUrl })
      .eq("id", imageId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error(`Failed to update image: ${updateError.message}`);
    }

    console.log("Successfully generated and saved icon for:", imageName);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        imageName,
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
