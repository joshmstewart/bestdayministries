import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function applyGreenScreenKey(image: Image) {
  // ImageScript stores pixels as RGBA bytes.
  const bmp = image.bitmap;

  // Heuristic chroma-key tuned for neon/greenscreen green.
  // We only key pixels that are strongly green-dominant to avoid damaging light clothing.
  for (let i = 0; i < bmp.length; i += 4) {
    const r = bmp[i + 0];
    const g = bmp[i + 1];
    const b = bmp[i + 2];

    const maxRB = Math.max(r, b);
    const greenDominance = g - maxRB; // higher means more "pure green"

    // Only consider keying if the pixel is clearly green-ish.
    if (g > 150 && greenDominance > 40) {
      // Feather edges: ramp alpha down smoothly based on how green-dominant the pixel is.
      // dominance 40..140 => strength 0..1
      const strength = Math.max(0, Math.min(1, (greenDominance - 40) / 100));
      const currentA = bmp[i + 3];
      const nextA = Math.round(currentA * (1 - strength));

      bmp[i + 3] = nextA;

      // If fully keyed, zero RGB to reduce green fringing in some renderers.
      if (nextA === 0) {
        bmp[i + 0] = 0;
        bmp[i + 1] = 0;
        bmp[i + 2] = 0;
      }
    }
  }

  return image;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, customerId } = await req.json();

    if (!imageUrl) {
      throw new Error("Image URL is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Removing background from image:", String(imageUrl).substring(0, 100));

    // Important: image models often "fake" transparency by drawing a checkerboard.
    // We avoid that by asking for a SOLID greenscreen background, then chroma-keying it.
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
            content: [
              {
                type: "text",
                text:
                  "Recreate ONLY the person/character from this image. Put them on a perfectly SOLID neon green (greenscreen) background (#00FF00), with NO gradients and NO checkerboard pattern. No floor, no walls, no props behind them. Keep the person centered, clean edges, stock-photo lighting. Output as PNG.",
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!editedImageUrl) {
      console.error("No image in response:", JSON.stringify(data).substring(0, 500));
      throw new Error("No image generated");
    }

    // We expect base64 from the gateway; if not, return it as-is.
    if (!editedImageUrl.startsWith("data:image")) {
      return new Response(JSON.stringify({ imageUrl: editedImageUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const base64Match = editedImageUrl.match(/^data:image\/\w+;base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Invalid base64 image format");
    }

    const imageBase64 = base64Match[1];
    const imageBuffer = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));

    // Decode -> chroma key -> encode
    const decoded = await Image.decode(imageBuffer);
    const keyed = applyGreenScreenKey(decoded);
    const encodedPng = await keyed.encode();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const fileId = customerId || `temp-${Date.now()}`;
    const fileName = `customer-nobg-${fileId}-${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("app-assets")
      .upload(`cash-register-customers/${fileName}`, encodedPng, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from("app-assets")
      .getPublicUrl(`cash-register-customers/${fileName}`);

    console.log("Background removed + uploaded:", urlData.publicUrl);

    return new Response(JSON.stringify({ imageUrl: urlData.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error removing background:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
