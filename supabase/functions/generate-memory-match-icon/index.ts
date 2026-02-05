import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SIZE = 512;

const DEFAULT_THEME_BACKGROUNDS = [
  "#FF6B35", // warm orange
  "#F7C59F", // peach
  "#A2D2FF", // sky
  "#BDB2FF", // lavender
  "#FFC8DD", // pink
  "#90BE6D", // green
  "#F94144", // red
  "#577590", // slate blue
];

function hashString(input: string) {
  // Simple deterministic hash (stable across runtimes)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return hash;
}

function normalizeHex(hex: string) {
  const raw = hex.replace("#", "").trim();
  if (raw.length === 3) {
    const r = raw[0];
    const g = raw[1];
    const b = raw[2];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return `#${raw}`.toUpperCase();
}

function extractFirstHexColor(text?: string | null): string | null {
  if (!text) return null;
  const match = text.match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/);
  return match ? normalizeHex(match[0]) : null;
}

// Map common color names to hex values
const COLOR_NAME_MAP: Record<string, string> = {
  white: "#FFFFFF",
  cream: "#FFFDD0",
  ivory: "#FFFFF0",
  beige: "#F5F5DC",
  gray: "#808080",
  grey: "#808080",
  "light gray": "#D3D3D3",
  "light grey": "#D3D3D3",
  "soft gray": "#C0C0C0",
  "soft grey": "#C0C0C0",
  neutral: "#E5E5E5",
  black: "#000000",
  red: "#F94144",
  orange: "#FF6B35",
  yellow: "#FFD700",
  green: "#90BE6D",
  blue: "#577590",
  purple: "#BDB2FF",
  pink: "#FFC8DD",
  brown: "#8B4513",
  tan: "#D2B48C",
  coffee: "#6F4E37",
  mocha: "#967969",
  espresso: "#3C2415",
  latte: "#E6D5B8",
};

function extractColorFromText(text?: string | null): string | null {
  if (!text) return null;
  const lowerText = text.toLowerCase();
  
  // First try to find a hex color
  const hexMatch = extractFirstHexColor(text);
  if (hexMatch) return hexMatch;
  
  // Then look for named colors in the text
  for (const [name, hex] of Object.entries(COLOR_NAME_MAP)) {
    if (lowerText.includes(name)) {
      return hex;
    }
  }
  
  return null;
}

function pickBackgroundHex(packName?: string | null) {
  const key = (packName || "default").toLowerCase();
  const idx = Math.abs(hashString(key)) % DEFAULT_THEME_BACKGROUNDS.length;
  return DEFAULT_THEME_BACKGROUNDS[idx];
}

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

    const backgroundHex = extractColorFromText(designStyle) ?? pickBackgroundHex(packName);

    // Style instructions:
    // - If designStyle is provided, follow it (do NOT add conflicting requirements)
    // - Otherwise, default to premium "slightly stylized realism"
    const styleBlock = designStyle
      ? `STYLE GUIDE (follow exactly):\n${designStyle}`
      : `STYLE:\n- Clean, high-detail, slightly stylized realism (premium stock icon / app icon)\n- Natural, accurate colors\n- Avoid flat/cartoon styles unless explicitly requested`;

    // Request image directly from the AI (solid deterministic background per pack)
    const iconPrompt = `Create a ${SIZE}x${SIZE} PNG image.\n\nSUBJECT: A SINGLE "${imageName}" - ONE OBJECT ONLY\n\n${styleBlock}\n\nCRITICAL RULES:\n- Show EXACTLY ONE object: the ${imageName}\n- Do NOT add any other objects, characters, or elements\n- Do NOT add decorative items, stars, planets, people, or accessories\n- The image must contain ONLY the single ${imageName} and nothing else\n\nCOMPOSITION:\n- The single object should fill about 70-80% of the canvas, centered\n- No borders, no frames, no rounded corners\n\nBACKGROUND:\n- SOLID single-color background: ${backgroundHex}\n- No gradients, no shadows, no vignettes\n- The background MUST be uniformly ${backgroundHex}\n\nOUTPUT:\n- PNG format\n- Sharp rectangular edges\n- Full bleed (use entire canvas)\n`;

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

        console.log(`API response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API error response (${response.status}):`, errorText);
          
          if (response.status === 429) {
            console.error("Rate limited, waiting...");
            await new Promise((r) => setTimeout(r, 2000 * attempt));
            lastError = `Rate limited (429): ${errorText}`;
            continue;
          }
          if (response.status === 402) {
            throw new Error(`AI credits exhausted (402): ${errorText}`);
          }
          lastError = `AI API error ${response.status}: ${errorText}`;
          continue;
        }

        const responseText = await response.text();
        console.log(`Raw response length: ${responseText.length} chars`);
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Failed to parse response as JSON:", responseText.substring(0, 500));
          lastError = `Invalid JSON response: ${responseText.substring(0, 200)}`;
          continue;
        }

        // Log the full response structure (without huge base64 data)
        const debugData = JSON.stringify({
          id: data.id,
          model: data.model,
          choices_count: data.choices?.length,
          has_message: !!data.choices?.[0]?.message,
          has_images: !!data.choices?.[0]?.message?.images,
          images_count: data.choices?.[0]?.message?.images?.length,
          content_preview: data.choices?.[0]?.message?.content?.substring(0, 100),
          finish_reason: data.choices?.[0]?.finish_reason,
          error: data.error,
        });
        console.log(`Response structure: ${debugData}`);

        imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (imageData) {
          console.log(`Got image data on attempt ${attempt}, length: ${imageData.length}`);
          break;
        } else {
          console.log(`No image in response on attempt ${attempt}`);
          lastError = `No image generated. Response: ${debugData}`;
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      } catch (fetchError) {
        console.error(`Fetch error on attempt ${attempt}:`, fetchError);
        const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
        console.error(`Fetch error details: ${errorMsg}`);
        lastError = `Fetch failed: ${errorMsg}`;
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }

    if (!imageData) {
      // Expected failure mode (AI returned text/no images). Return 200 so the admin UI can show the real reason.
      console.error("AI did not return an image after retries:", lastError);
      return new Response(
        JSON.stringify({ success: false, error: lastError }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
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
