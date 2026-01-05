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
    const { imageId, imageName, packName, designStyle } = await req.json();

    if (!imageId || !imageName) {
      throw new Error("Missing imageId or imageName");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Use the design style passed in, or default to clean adult-appropriate style
    const style = designStyle || "Clean flat illustration, elegant, simple shapes, adult aesthetic";
    
    // Pick ONE background color from the pack's color palette (based on pack name hash for consistency)
    const brightColors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"];
    const colorIndex = Math.abs(packName?.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) || 0) % brightColors.length;
    const backgroundColor = brightColors[colorIndex];

    const iconPrompt = `Generate a 512x512 square image.

SUBJECT: ${imageName} (from a "${packName || "General"}" themed pack)

STYLE: ${style}

CRITICAL REQUIREMENTS:
1. FULL BLEED: Subject and background must extend to ALL EDGES with NO margins, NO borders, NO padding
2. COLORFUL: Subject must be VIBRANT and FULL COLOR (NOT black/white, NOT monotone, NOT silhouettes)
3. BACKGROUND: Solid ${backgroundColor} color filling entire canvas edge-to-edge
4. SUBJECT SIZE: Large, filling 70-80% of the image area
5. STYLE: Bold, simple, iconic shapes - like a colorful app icon or road sign
6. CORNERS: Sharp rectangular corners (no rounded edges)
7. CONTRAST: High contrast between colorful subject and solid background

DO NOT: Add any borders, margins, white space at edges, gradients, or dark backgrounds. Subject must be colorful, not black/gray/monotone.`;

    console.log("Generating icon for memory match image:", imageName);
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

    // Convert base64 to blob
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const fileName = `memory-match/${imageId}.png`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("game-assets")
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
