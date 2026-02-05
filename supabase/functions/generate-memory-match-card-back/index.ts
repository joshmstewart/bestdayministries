import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { packId, packName, themeDescription } = await req.json();

    if (!packId || !packName) {
      throw new Error("Missing packId or packName");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Generate a hyper-realistic playing card back design themed to the pack
    // CRITICAL: The card design must fill the ENTIRE image - no table, no background, no borders outside the card
    const cardBackPrompt = `IMPORTANT FRAMING RULES:
- The card back design MUST fill the ENTIRE image from edge to edge
- NO table, surface, or background visible - ONLY the card design itself
- The design bleeds ALL THE WAY to the edges of the image
- This is a FLAT, TOP-DOWN view of JUST the card back pattern - nothing else

DESIGN REQUIREMENTS:
Create a hyper-realistic, elegant playing card back design for a "${packName}" themed deck.
- Perfectly symmetrical (180° rotational symmetry like traditional playing cards)
- Ornate decorative border pattern running along all 4 edges, integrated INTO the card design
- Intricate filigree and scrollwork patterns typical of premium playing cards
- Center features sophisticated ${packName} themed motifs - ${themeDescription || `elegant ${packName.toLowerCase()} symbols and imagery woven into the pattern`}
- Rich, deep colors with subtle gradients and metallic accents
- Corner decorations with matching theme elements
- The aesthetic of a luxury collector's edition deck

OUTPUT: Square 1:1, 512x512 pixels. The card pattern fills 100% of the image with NO margins or external elements.`;

    console.log("Generating card back for pack:", packName);
    console.log("Prompt:", cardBackPrompt);

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
            content: cardBackPrompt,
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

    const fileName = `memory-match/card-backs/${packId}.png`;

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

    const cardBackUrl = urlData.publicUrl;

    // Update the pack with the card back URL
    const { error: updateError } = await supabase
      .from("memory_match_packs")
      .update({ card_back_url: cardBackUrl })
      .eq("id", packId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error(`Failed to update pack: ${updateError.message}`);
    }

    console.log("Successfully generated card back for pack:", packName);

    return new Response(
      JSON.stringify({
        success: true,
        cardBackUrl,
        packName,
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
