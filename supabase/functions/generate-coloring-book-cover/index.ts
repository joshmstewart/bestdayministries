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
    const { prompt } = await req.json();

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

    console.log("Generating coloring book cover with prompt:", prompt);

    const coverPrompt = `Create a FULL-COLOR children's coloring book cover that looks like a REAL PUBLISHED COLORING BOOK for the theme: "${prompt}".

STYLE REFERENCE - Make it look like professional children's coloring book covers you'd find in stores:
- DECORATIVE THEMED BORDER around the edges (flowers, vines, stars, themed elements that match the topic)
- BIG STYLIZED TITLE TEXT at the top: "${prompt}" in fun, whimsical, colorful bubble/fancy letters
- SUBTITLE below the title like "A Magical Coloring Adventure!" or "Coloring Book!" in a banner or ribbon
- CENTRAL ILLUSTRATION featuring cute cartoon characters/scenes related to the theme
- SCATTERED THEMED ELEMENTS throughout (small icons, doodles, decorations related to the theme)

CRITICAL LAYOUT:
- Square 1:1 aspect ratio
- Full-bleed artwork extending to ALL edges - no white margins
- The decorative border elements should touch all four edges
- Bright, cheerful, pastel-friendly color palette
- Kawaii/chibi cute art style for characters
- Whimsical, magical, child-friendly aesthetic

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
